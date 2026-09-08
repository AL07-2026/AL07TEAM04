import http from 'node:http';
import https from 'node:https';
import { decodeUtf8Chunks } from './httpEncoding.mjs';

export class JobSourceError extends Error {
  constructor(code, retryable = false, statusCode) {
    super(`Job source request failed (${code}).`);
    this.name = 'JobSourceError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

const transientCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED']);
function requestOnce(url, { get, timeoutMs, maxBytes, secure }) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let phase = 'socket';
    let addressFamily = 0;
    let size = 0;
    let request;
    let response;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        // Only enumerated phases/counts: never retain a URL, API key, address or response body.
        error.diagnostics = { phase, elapsedMs: Date.now() - startedAt, responseBytes: size, addressFamily };
        response?.destroy(); request?.destroy(); reject(error);
      }
      else resolve(value);
    };
    const timer = setTimeout(() => finish(new JobSourceError('TIMEOUT', true)), timeoutMs);
    try {
      request = get(url, { timeout: timeoutMs, family: 4,
        headers: { Accept: 'application/json, application/xml, text/xml, */*', 'User-Agent': 'Ieojab-JobSync/1.0' },
      }, (res) => {
        phase = 'body';
        response = res;
        res.on('error', () => finish(new JobSourceError('RESPONSE_ABORTED', true)));
        res.on('aborted', () => finish(new JobSourceError('RESPONSE_ABORTED', true)));
        const status = res.statusCode || 0;
        if (status < 200 || status >= 300) {
          finish(new JobSourceError(`HTTP_${status}`, [500, 502, 503, 504].includes(status), status));
          return;
        }
        if (Number(res.headers['content-length']) > maxBytes) {
          finish(new JobSourceError('RESPONSE_TOO_LARGE')); return;
        }
        const chunks = [];
        res.on('data', (chunk) => {
          if (settled) return;
          size += Buffer.byteLength(chunk);
          if (size > maxBytes) finish(new JobSourceError('RESPONSE_TOO_LARGE'));
          else chunks.push(chunk);
        });
        res.on('end', () => finish(null, decodeUtf8Chunks(chunks)));
      });
      request.on('socket', (socket) => {
        phase = socket.connecting ? 'dns' : 'headers';
        socket.once('lookup', (error, _address, family) => {
          if (settled) return;
          if (!error) { phase = 'connect'; addressFamily = family === 6 ? 6 : 4; }
        });
        socket.once('connect', () => { if (!settled) phase = secure ? 'tls' : 'headers'; });
        socket.once('secureConnect', () => { if (!settled) phase = 'headers'; });
      });
      request.on('error', (error) => finish(new JobSourceError(
        transientCodes.has(error.code) ? error.code : 'NETWORK_ERROR', transientCodes.has(error.code),
      )));
      request.on('timeout', () => finish(new JobSourceError('TIMEOUT', true)));
    } catch {
      finish(new JobSourceError('NETWORK_ERROR'));
    }
  });
}

export async function fetchJobSourceText(url, options = {}) {
  const parsedUrl = new URL(url);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new JobSourceError('INVALID_PROTOCOL');
  const get = options.get || (parsedUrl.protocol === 'https:' ? https.get : http.get);
  const maxRetries = Math.min(1, Math.max(0, Number(options.maxRetries ?? 1) || 0));
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    options.onAttempt?.(attempt);
    try {
      const text = await requestOnce(url, { get, timeoutMs: options.timeoutMs ?? 25000,
        maxBytes: options.maxBytes ?? 12 * 1024 * 1024, secure: parsedUrl.protocol === 'https:' });
      return options.parse ? options.parse(text) : text;
    } catch (rawError) {
      const error = rawError instanceof JobSourceError ? rawError : new JobSourceError('INVALID_RESPONSE');
      error.attempts = attempt;
      if (!error.retryable || attempt > maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs ?? 500));
    }
  }
}

function jsonObject(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new JobSourceError('INVALID_RESPONSE'); }
}
function validateRows(rows, total) {
  if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new JobSourceError('INVALID_SCHEMA');
  }
  if (!Number.isFinite(Number(total)) || Number(total) < 0) throw new JobSourceError('INVALID_SCHEMA');
  return { rows, totalAvailable: Number(total) };
}
export function parseSeoulJobResponse(text) {
  const data = jsonObject(text);
  const payload = data.GetJobInfo || data.GetSeniorJobInfo || data.recMntList;
  const code = String(payload?.RESULT?.CODE || data.RESULT?.CODE || '');
  if (code === 'INFO-200') return { rows: [], totalAvailable: 0 };
  if (code === 'INFO-100' || code === 'ERROR-100') throw new JobSourceError('SOURCE_AUTH');
  if (code && code !== 'INFO-000') throw new JobSourceError('SOURCE_API_ERROR', code === 'ERROR-500' || code === 'ERROR-600');
  return validateRows(payload?.row, payload?.list_total_count);
}
export function parsePublicJobResponse(text) {
  if (/SERVICE_KEY|returnReasonCode>\s*(?:30|31|32)|인증키/.test(text) && !text.trim().startsWith('{')) throw new JobSourceError('SOURCE_AUTH');
  const data = jsonObject(text);
  const code = String(data.response?.header?.resultCode ?? data.resultCode ?? '');
  if (['20', '21', '22', '30', '31', '32'].includes(code)) throw new JobSourceError('SOURCE_AUTH');
  if (code && !['00', '0', '200', 'NORMAL_SERVICE'].includes(code)) throw new JobSourceError('SOURCE_API_ERROR', ['01', '02', '05'].includes(code));
  const payload = data.response?.body || data;
  let rows = payload.result ?? payload.items;
  if (rows && !Array.isArray(rows) && typeof rows === 'object' && 'item' in rows) {
    rows = Array.isArray(rows.item) ? rows.item : rows.item ? [rows.item] : [];
  }
  return validateRows(rows, payload.totalCount ?? payload.total ?? rows?.length);
}
export function validateWorknetJobResponse(text) {
  if (/개인회원|사용할 수 없는|인증키|미승인|AUTH_ERROR|SERVICE_KEY/i.test(text)) throw new JobSourceError('SOURCE_AUTH');
  if (/<(?:error|message)>[^<]+/i.test(text)) throw new JobSourceError('SOURCE_API_ERROR');
  if (!/<wantedRoot\b/i.test(text) || !/<\/wantedRoot>/i.test(text)) throw new JobSourceError('INVALID_RESPONSE');
  return text;
}

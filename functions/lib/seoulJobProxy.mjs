import http from 'http';
import https from 'https';
import { decodeUtf8Chunks } from './httpEncoding.mjs';

const SEOUL_JOB_ENDPOINT_BASE = 'http://openapi.seoul.go.kr:8088';
const SEOUL_UPSTREAM_TIMEOUT_MS = 5_000;
const DEFAULT_SEOUL_JOB_KEY = '484b45796773656835396b545a724a';

function httpGetJson(urlStr, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.get(
      urlStr,
      {
        headers: { Accept: 'application/json' },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(decodeUtf8Chunks(chunks)));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Seoul Job API timeout'));
    });
  });
}

export function createSeoulJobUpstreamUrl(query = {}, configuredApiKey = '') {
  const apiKey = (configuredApiKey || query.authKey || '').trim() || DEFAULT_SEOUL_JOB_KEY;
  const serviceName = query.serviceName === 'GetSeniorJobInfo' ? 'GetSeniorJobInfo' : 'GetJobInfo';
  const startIndex = Number(query.startIndex) || 1;
  const endIndex = Number(query.endIndex) || 1000;

  return `${SEOUL_JOB_ENDPOINT_BASE}/${apiKey}/json/${serviceName}/${startIndex}/${endIndex}/`;
}

export async function proxySeoulJobs(req, res, configuredApiKey = '') {
  const upstreamUrl = createSeoulJobUpstreamUrl(req.query, configuredApiKey);

  try {
    const data = await httpGetJson(upstreamUrl, SEOUL_UPSTREAM_TIMEOUT_MS);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.type('application/json');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Seoul Job proxy failed:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: '서울시 일자리 API에 연결하지 못했습니다.' });
  }
}

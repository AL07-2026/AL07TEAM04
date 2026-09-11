// @vitest-environment node
import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchJobSourceText,
  parsePublicJobResponse,
  parseSeoulJobResponse,
  validateWorknetJobResponse,
} from './jobSourceTransport.mjs';

function fakeTransport(scenarios) {
  const requests = [];
  const get = vi.fn((_url, _options, callback) => {
    const request = new EventEmitter();
    const response = new EventEmitter();
    request.destroy = vi.fn();
    response.destroy = vi.fn();
    response.headers = {};
    response.statusCode = 200;
    requests.push({ request, response });
    queueMicrotask(() => scenarios[Math.min(get.mock.calls.length - 1, scenarios.length - 1)]({
      request, response, callback,
    }));
    return request;
  });
  return { get, requests };
}

const successful = (text) => ({ callback, response }) => {
  callback(response);
  response.emit('data', Buffer.from(text));
  response.emit('end');
};

afterEach(() => vi.useRealTimers());

describe('bounded job source transport', () => {
  it('uses an explicit IPv4 connection and identifies the collector without credentials in headers', async () => {
    const transport = fakeTransport([successful('ok')]);
    await fetchJobSourceText('https://source.test/SECRET', { get: transport.get });
    const options = transport.get.mock.calls[0][1];
    expect(options.family).toBe(4);
    expect(options.headers['User-Agent']).toBe('Ieojab-JobSync/1.0');
    expect(JSON.stringify(options)).not.toContain('SECRET');
  });

  it.each(['connect', 'headers', 'body'])('reports a %s timeout without including source URLs or response contents', async (phase) => {
    vi.useFakeTimers();
    const transport = fakeTransport([({ request, response, callback }) => {
      const socket = new EventEmitter();
      socket.connecting = true;
      request.emit('socket', socket);
      socket.emit('lookup', null, '192.0.2.1', 4, 'SECRET');
      if (phase !== 'connect') socket.emit('connect');
      if (phase === 'body') { callback(response); response.emit('data', Buffer.from('SECRET')); }
    }]);
    const result = expect(fetchJobSourceText('http://source.test/SECRET', {
      get: transport.get, timeoutMs: 15, maxRetries: 0,
    })).rejects.toMatchObject({ code: 'TIMEOUT', diagnostics: {
      phase, elapsedMs: 15, responseBytes: phase === 'body' ? 6 : 0, addressFamily: 4,
    } });
    await vi.advanceTimersByTimeAsync(15);
    await result;
  });

  it('decodes split UTF-8 bytes without damaging Korean text', async () => {
    const source = Buffer.from('서울 채용');
    const transport = fakeTransport([({ callback, response }) => {
      callback(response);
      response.emit('data', source.subarray(0, 2));
      response.emit('data', source.subarray(2));
      response.emit('end');
    }]);
    await expect(fetchJobSourceText('https://source.test/key', { get: transport.get })).resolves.toBe('서울 채용');
    expect(transport.get).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 404, 429, 301])('does not retry HTTP %s or expose request secrets', async (status) => {
    const transport = fakeTransport([({ callback, response }) => {
      response.statusCode = status;
      callback(response);
    }]);
    await expect(fetchJobSourceText('https://source.test/SECRET?authKey=SECRET', { get: transport.get }))
      .rejects.toMatchObject({ code: `HTTP_${status}`, retryable: false });
    expect(transport.get).toHaveBeenCalledTimes(1);
    expect(transport.requests[0].response.destroy).toHaveBeenCalled();
  });

  it('retries a transient HTTP failure only once even if a higher limit is requested', async () => {
    const transport = fakeTransport([({ callback, response }) => {
      response.statusCode = 503;
      callback(response);
    }]);
    await expect(fetchJobSourceText('https://source.test/SECRET', {
      get: transport.get, maxRetries: 100, retryDelayMs: 0,
    })).rejects.toMatchObject({ code: 'HTTP_503', attempts: 2 });
    expect(transport.get).toHaveBeenCalledTimes(2);
  });

  it('can recover from one transient connection failure without returning unsafe original errors', async () => {
    const transport = fakeTransport([
      ({ request }) => request.emit('error', Object.assign(new Error('https://SECRET'), { code: 'ECONNRESET' })),
      successful('recovered'),
    ]);
    await expect(fetchJobSourceText('https://source.test/SECRET', { get: transport.get, retryDelayMs: 0 }))
      .resolves.toBe('recovered');
    expect(transport.get).toHaveBeenCalledTimes(2);
    const denied = fakeTransport([({ request }) => request.emit('error', new Error('URL https://SECRET'))]);
    await expect(fetchJobSourceText('https://source.test/SECRET', { get: denied.get }))
      .rejects.toMatchObject({ message: 'Job source request failed (NETWORK_ERROR).', retryable: false });
  });

  it('enforces an absolute timeout even when the response continuously sends chunks', async () => {
    vi.useFakeTimers();
    const transport = fakeTransport([({ callback, response }) => {
      callback(response);
      setTimeout(() => response.emit('data', Buffer.from('a')), 5);
      setTimeout(() => response.emit('data', Buffer.from('b')), 10);
    }]);
    const result = expect(fetchJobSourceText('https://source.test', {
      get: transport.get, timeoutMs: 15, maxRetries: 0,
    })).rejects.toMatchObject({ code: 'TIMEOUT', attempts: 1 });
    await vi.advanceTimersByTimeAsync(15);
    await result;
    expect(transport.requests[0].request.destroy).toHaveBeenCalled();
  });

  it('rejects oversized content-length and chunked responses without retries', async () => {
    for (const useHeader of [true, false]) {
      const transport = fakeTransport([({ callback, response }) => {
        if (useHeader) response.headers['content-length'] = '5';
        callback(response);
        if (!useHeader) response.emit('data', Buffer.from('12345'));
      }]);
      await expect(fetchJobSourceText('https://source.test', { get: transport.get, maxBytes: 4 }))
        .rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE', retryable: false });
      expect(transport.get).toHaveBeenCalledTimes(1);
    }
  });

  it('does not treat an aborted response as a completed empty response', async () => {
    const transport = fakeTransport([({ callback, response }) => {
      callback(response);
      response.emit('aborted');
    }]);
    await expect(fetchJobSourceText('https://source.test', { get: transport.get, maxRetries: 0 }))
      .rejects.toMatchObject({ code: 'RESPONSE_ABORTED', retryable: true });
  });

  it('validates a source response before deciding whether to retry and reports attempts', async () => {
    const onAttempt = vi.fn();
    const transport = fakeTransport([
      successful(JSON.stringify({ RESULT: { CODE: 'ERROR-500' } })),
      successful(JSON.stringify({ GetJobInfo: { row: [], list_total_count: 0, RESULT: { CODE: 'INFO-000' } } })),
    ]);
    await expect(fetchJobSourceText('https://source.test', {
      get: transport.get, parse: parseSeoulJobResponse, retryDelayMs: 0, onAttempt,
    })).resolves.toEqual({ rows: [], totalAvailable: 0 });
    expect(onAttempt.mock.calls).toEqual([[1], [2]]);
  });

  it('does not retry provider authentication failures', async () => {
    const transport = fakeTransport([successful(JSON.stringify({ RESULT: { CODE: 'INFO-100', MESSAGE: 'SECRET' } }))]);
    await expect(fetchJobSourceText('https://source.test', { get: transport.get, parse: parseSeoulJobResponse }))
      .rejects.toMatchObject({ code: 'SOURCE_AUTH', retryable: false, attempts: 1 });
    expect(transport.get).toHaveBeenCalledTimes(1);
  });
});

describe('job source response validation', () => {
  it('accepts Seoul data and distinguishes explicit no-data responses', () => {
    expect(parseSeoulJobResponse(JSON.stringify({ GetJobInfo: {
      row: [{ JO_REQST_NO: 'J1', JO_SJ: '채용' }], list_total_count: '7', RESULT: { CODE: 'INFO-000' },
    } }))).toMatchObject({ rows: [{ JO_REQST_NO: 'J1' }], totalAvailable: 7 });
    expect(parseSeoulJobResponse('{"RESULT":{"CODE":"INFO-200"}}')).toEqual({ rows: [], totalAvailable: 0 });
  });

  it.each(['', '<html>502 bad gateway SECRET</html>', '{}', '{"GetJobInfo":{"row":{}}}',
    '{"GetJobInfo":{"row":[null],"list_total_count":1}}'])('rejects an invalid Seoul response %s', (source) => {
    expect(() => parseSeoulJobResponse(source)).toThrow();
  });

  it('rejects Seoul error responses even if they contain an empty row list', () => {
    expect(() => parseSeoulJobResponse('{"GetJobInfo":{"row":[],"RESULT":{"CODE":"ERROR-300","MESSAGE":"SECRET"}}}'))
      .toThrow('Job source request failed (SOURCE_API_ERROR).');
  });

  it('accepts current public arrays and standard data.go.kr envelopes', () => {
    expect(parsePublicJobResponse('{"result":[{"recrutPblntSn":1}],"totalCount":200}'))
      .toEqual({ rows: [{ recrutPblntSn: 1 }], totalAvailable: 200 });
    expect(parsePublicJobResponse('{"response":{"header":{"resultCode":"00"},"body":{"items":{"item":{"recrutPblntSn":2}},"totalCount":1}}}'))
      .toEqual({ rows: [{ recrutPblntSn: 2 }], totalAvailable: 1 });
    expect(parsePublicJobResponse('{"resultCode":200,"result":[],"totalCount":0}'))
      .toEqual({ rows: [], totalAvailable: 0 });
  });

  it.each([
    '{"resultCode":"30","resultMsg":"SERVICE_KEY_IS_NOT_REGISTERED_ERROR SECRET","result":[]}',
    '<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR SECRET</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>',
  ])('recognizes public JSON and XML authentication errors without echoing their contents', (source) => {
    expect(() => parsePublicJobResponse(source)).toThrow('Job source request failed (SOURCE_AUTH).');
  });

  it.each(['{}', '<html>gateway</html>', '{"result":"error"}', '{"result":[null]}',
    '{"result":[],"totalCount":-1}'])('rejects public schema errors %s', (source) => {
    expect(() => parsePublicJobResponse(source)).toThrow();
  });

  it('requires a recognizable Worknet XML envelope rather than accepting HTML or JSON as zero jobs', () => {
    const source = '<?xml version="1.0"?><wantedRoot><total>0</total></wantedRoot>';
    expect(validateWorknetJobResponse(source)).toBe(source);
    expect(validateWorknetJobResponse('<wantedRoot><wanted><wantedAuthNo>K123</wantedAuthNo></wanted></wantedRoot>')).toContain('K123');
    expect(() => validateWorknetJobResponse('<html>502 bad gateway</html>')).toThrow();
    expect(() => validateWorknetJobResponse('{}')).toThrow();
    expect(() => validateWorknetJobResponse('<wantedRoot><error>개인회원은 사용할 수 없는 OPEN-API입니다.</error></wantedRoot>'))
      .toThrow('Job source request failed (SOURCE_AUTH).');
  });
});

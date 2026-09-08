import { describe, expect, it, vi } from 'vitest';
import { collectJobSources } from './jobSourceCollection.mjs';
import { JobSourceError } from './jobSourceTransport.mjs';

function fixture() {
  const upsert = vi.fn(async (items) => ({ inserted: items.length, updated: 0, unchanged: 0, activeUpserts: items.length }));
  const fetchText = vi.fn(async (url, options) => {
    options.onAttempt();
    if (url.includes('work24')) return '<wantedRoot><total>0</total></wantedRoot>';
    return { rows: [{ id: url.includes('seoul') ? 'seoul' : new URL(url).searchParams.get('pageNo'), postedAt: '2026-09-08' }], totalAvailable: url.includes('seoul') ? 38516 : 250 };
  });
  return { state: {}, dateKey: '2026-09-08', nowStr: '2026-09-08T00:00:00Z',
    keys: { SEOUL_JOB_API_KEY: 'test', PUBLIC_JOB_API_KEY: 'test', WORKNET_JOB_API_KEY: 'test' },
    transforms: { seoul: (x) => x, public: (x) => x, worknet: (x) => x, parseWorknet: () => ({ rows: [] }) },
    fetchText, upsert, onSourceResult: vi.fn() };
}
describe('bounded source collection', () => {
  it('reads new Seoul tail and rotating ranges, smaller public pages and Worknet once', async () => {
    const deps = fixture();
    const result = await collectJobSources(deps);
    expect(deps.fetchText).toHaveBeenCalledTimes(6);
    expect(result.sourceProgress.seoul).toMatchObject({ status: 'success', service: 'recMntList', requestedRanges: ['37517-38516', '1-1000'], requestCount: 3 });
    expect(result.sourceProgress.public).toMatchObject({ requestedPages: [1, 2], inserted: 2, requestCount: 2 });
    expect(result.statePatch).toMatchObject({ seoulV2NextStartIndex: 1001, publicV2NextPage: 3 });
    expect(deps.fetchText.mock.calls.filter(([url]) => url.includes('data.go.kr')).every(([url]) => url.includes('numOfRows=100'))).toBe(true);
  });
  it('preserves a successful first page when a later page fails and does not advance its cursor', async () => {
    const deps = fixture();
    const original = deps.fetchText.getMockImplementation();
    deps.fetchText.mockImplementation((url, options) => {
      if (url.includes('pageNo=2')) throw new JobSourceError('TIMEOUT', true);
      return original(url, options);
    });
    const result = await collectJobSources(deps);
    expect(result.sourceProgress.public).toMatchObject({ status: 'partial', inserted: 1, retryable: true, errorCode: 'TIMEOUT' });
    expect(result.statePatch.publicV2NextPage).toBeUndefined();
    expect(result.sourceProgress.seoul.status).toBe('success');
  });
  it('does not call a source that already succeeded in the same-day recovery', async () => {
    const deps = fixture();
    deps.state = { sourceProgress: { seoul: { status: 'success', lastSuccessDate: '2026-09-08', inserted: 99 } } };
    const result = await collectJobSources(deps);
    expect(result.sourceProgress.seoul).toMatchObject({ inserted: 0, requestCount: 0, reused: true });
    expect(deps.fetchText).toHaveBeenCalledTimes(3);
  });
  it('records missing keys and auth failures without retry or synthetic success', async () => {
    const deps = fixture();
    deps.keys = {};
    const result = await collectJobSources(deps);
    expect(Object.values(result.sourceProgress).every((source) => source.status === 'failed' && source.inserted === 0 && !source.retryable)).toBe(true);
    expect(deps.fetchText).not.toHaveBeenCalled();
    expect(deps.upsert).not.toHaveBeenCalled();
  });
  it('preserves safe transport failure diagnostics for operator investigation', async () => {
    const deps = fixture();
    deps.fetchText.mockRejectedValue(Object.assign(new JobSourceError('TIMEOUT', true), {
      diagnostics: { phase: 'connect', elapsedMs: 25000, responseBytes: 0, addressFamily: 4 },
    }));
    const result = await collectJobSources(deps);
    expect(result.sourceProgress.seoul.failureDiagnostics).toEqual({ phase: 'connect', elapsedMs: 25000, responseBytes: 0, addressFamily: 4 });
  });
});

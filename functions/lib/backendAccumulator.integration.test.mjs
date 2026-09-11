// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ documents: new Map(), collect: vi.fn(), analyze: vi.fn(), writeCount: 0 }));
vi.mock('./jobSourceCollection.mjs', () => ({ collectJobSources: mocks.collect }));
vi.mock('./jobBatchAnalysisService.mjs', async (importOriginal) => ({ ...await importOriginal(), runIncrementalJobAnalysis: mocks.analyze }));
vi.mock('./firestoreAdmin.mjs', () => {
  const snapshot = (ref) => ({ id: ref.id, exists: mocks.documents.has(ref.path), data: () => mocks.documents.get(ref.path) });
  const write = (ref, data) => { mocks.writeCount++; mocks.documents.set(ref.path, { ...mocks.documents.get(ref.path), ...data }); };
  const collection = (name) => {
    const query = {
      doc: (id) => ({ id, path: `${name}/${id}`, get: async () => snapshot({ id, path: `${name}/${id}` }), set: async (data) => write({ path: `${name}/${id}` }, data) }),
      get: async () => ({ size: 0, docs: [] }),
      orderBy: () => query, startAfter: () => query, limit: () => query,
      count: () => ({ get: async () => ({ data: () => ({ count: [...mocks.documents.keys()].filter((key) => key.startsWith(`${name}/`)).length }) }) }),
    };
    return query;
  };
  return { adminDb: {
    collection,
    getAll: async (...refs) => refs.map(snapshot),
    runTransaction: async (callback) => callback({ get: async (ref) => snapshot(ref), set: write }),
    batch: () => { const pending = []; return { set: (ref, data) => pending.push([ref, data]), commit: async () => pending.forEach(([ref, data]) => write(ref, data)) }; },
  } };
});

import { runBackendJobSync } from './backendAccumulator.mjs';
const statePath = 'job_sync_metadata/global_accumulator';
beforeEach(() => {
  mocks.documents.clear(); mocks.writeCount = 0; vi.clearAllMocks();
  mocks.analyze.mockResolvedValue({ processedCount: 1, status: 'success' });
});
describe('daily collector persistence integration', () => {
  it('persists only real inserts, completes once and blocks a repeated daily invocation', async () => {
    mocks.collect.mockImplementation(async ({ upsert, onSourceResult }) => {
      const counts = await upsert([{ id: 'SEOUL-real', title: '전략 총괄', companyName: '검증 기업', postedAt: '2026-09-01', deadline: '2099-01-01', updatedAt: new Date().toISOString() }]);
      const result = { sourceProgress: { seoul: { ...counts, status: 'success' } }, statePatch: {} };
      await onSourceResult(result.sourceProgress, result.statePatch);
      return result;
    });
    expect(await runBackendJobSync()).toMatchObject({ runStatus: 'success', insertedThisRun: 1, syncedThisRun: 1 });
    expect(mocks.documents.get('global_job_postings/SEOUL-real')).toMatchObject({ catalogStatus: 'active', sourceCreatedAt: expect.any(String) });
    expect(mocks.documents.has('global_job_postings/WORKNET-WN-DSN-02')).toBe(false);
    expect(mocks.documents.get(statePath)).toMatchObject({ runStatus: 'success', leaseUntil: null, lastSuccessfulAt: expect.any(String) });
    expect(await runBackendJobSync()).toMatchObject({ skipped: true, syncedThisRun: 0 });
    expect(mocks.collect).toHaveBeenCalledTimes(1);
  });
  it('keeps the prior last-success timestamp on failure and replaces stale nested result counters', async () => {
    mocks.documents.set(statePath, { lastSuccessfulAt: '2026-08-01', lastCompletedAt: '2026-08-01', sourceProgress: { seoul: { activeUpserts: 400, received: 500 } } });
    mocks.collect.mockResolvedValue({ sourceProgress: { seoul: { status: 'failed', errorCode: 'SOURCE_AUTH', retryable: false } }, statePatch: {} });
    expect(await runBackendJobSync()).toMatchObject({ runStatus: 'failed', syncedThisRun: 0, retryable: false });
    expect(mocks.documents.get(statePath)).toMatchObject({ lastSuccessfulAt: '2026-08-01', lastCompletedAt: '2026-08-01' });
    expect(mocks.documents.get(statePath).sourceProgress.seoul).not.toHaveProperty('activeUpserts');
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it('does not overwrite a newer lock owner on a stale invocation', async () => {
    mocks.collect.mockImplementation(async ({ onSourceResult }) => {
      mocks.documents.set(statePath, { runId: 'newer-owner', runStatus: 'running' });
      await onSourceResult({}, {});
    });
    await expect(runBackendJobSync()).rejects.toThrow('JOB_SYNC_LEASE_LOST');
    expect(mocks.documents.get(statePath)).toEqual({ runId: 'newer-owner', runStatus: 'running' });
  });
});

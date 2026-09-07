import { describe, expect, it } from 'vitest';
import { planDailySync, planSourcePages, summarizeSync, buildPostingUpdate } from './jobSyncPolicy.mjs';

const now = new Date('2026-09-08T00:00:00Z');
describe('daily ingestion safety policy', () => {
  it('allows one normal execution and blocks a completed day', () => {
    expect(planDailySync({}, now)).toMatchObject({ allowed: true, attempt: 1 });
    expect(planDailySync({ lastSourceSyncAttemptDate: '2026-09-08', runStatus: 'success' }, now).allowed).toBe(false);
  });
  it('blocks overlapping runs and limits same-day transient recovery to one run', () => {
    const state = { lastSourceSyncAttemptDate: '2026-09-08', attemptsToday: 1, runStatus: 'running', leaseUntil: '2026-09-08T00:01:00Z' };
    expect(planDailySync(state, now).reason).toBe('running');
    expect(planDailySync({ ...state, leaseUntil: '2026-09-07T23:59:00Z' }, now).allowed).toBe(true);
    expect(planDailySync({ ...state, attemptsToday: 2, leaseUntil: '' }, now).allowed).toBe(false);
  });
  it('does not recover permanent auth errors or retry before the cooldown', () => {
    const state = { lastSourceSyncAttemptDate: '2026-09-08', attemptsToday: 1, runStatus: 'partial', retryable: false };
    expect(planDailySync(state, now).allowed).toBe(false);
    expect(planDailySync({ ...state, retryable: true, retryAfter: '2026-09-08T00:10:00Z' }, now).allowed).toBe(false);
    expect(planDailySync({ ...state, retryable: true }, now).allowed).toBe(true);
  });
  it('replaces stale result counters instead of mistaking writes for new documents', () => {
    expect(summarizeSync({ seoul: { status: 'success', inserted: 3, updated: 7 }, public: { status: 'failed', retryable: true }, worknet: { status: 'failed', retryable: false } }))
      .toMatchObject({ runStatus: 'partial', insertedThisRun: 3, updatedThisRun: 7, retryable: true });
    expect(summarizeSync({ seoul: { status: 'failed' } }).runStatus).toBe('failed');
  });
  it('bounds daily pages and rotates past the first page without trusting an unbounded cursor', () => {
    expect(planSourcePages(4, 600, 100)).toEqual([1, 4]);
    expect(planSourcePages(9000, 600, 100)).toEqual([1, 2]);
    expect(planSourcePages(2, 20, 100)).toEqual([1]);
  });
  it('stores truthful source metadata and invalidates changed AI content', () => {
    const fresh = { id: 'job1', title: 'new', contentHash: 'new', updatedAt: now.toISOString() };
    const update = buildPostingUpdate(fresh, { contentHash: 'old', analysisStatus: 'COMPLETED', analyzedContentHash: 'old', catalogStatus: 'hidden', catalogHiddenReason: 'invalid' }, now.toISOString());
    expect(update).toMatchObject({ analysisStatus: 'PENDING', catalogStatus: 'active', sourceUpdatedAt: now.toISOString() });
    expect(update).not.toHaveProperty('analyzedContentHash');
    expect(buildPostingUpdate(fresh, { contentHash: 'new', catalogStatus: 'hidden', catalogHiddenReason: 'duplicate' }, now.toISOString()).catalogStatus).toBe('hidden');
  });
});

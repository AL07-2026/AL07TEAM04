export function kstDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function planDailySync(state, now = new Date()) {
  const dateKey = kstDateKey(now);
  if (Date.parse(state.leaseUntil || '') > now.getTime()) return { allowed: false, reason: 'running', dateKey };
  if (state.lastSourceSyncAttemptDate !== dateKey) return { allowed: true, attempt: 1, dateKey };
  if (state.runStatus === 'success') return { allowed: false, reason: 'already-synced-today', dateKey };
  const attempt = Math.max(1, Number(state.attemptsToday) || 1);
  if (attempt >= 2) return { allowed: false, reason: 'daily-attempt-limit', dateKey };
  if (Date.parse(state.retryAfter || '') > now.getTime()) return { allowed: false, reason: 'retry-cooldown', dateKey };
  if (state.runStatus !== 'running' && state.retryable !== true) return { allowed: false, reason: 'requires-configuration', dateKey };
  return { allowed: true, attempt: attempt + 1, dateKey };
}

export function planSourcePages(cursor, total, pageSize) {
  const totalPages = Math.max(1, Math.ceil((Number(total) || pageSize * 2) / pageSize));
  if (Number(total) > 0 && totalPages === 1) return [1];
  const requested = Math.max(2, Math.floor(Number(cursor) || 2));
  return [1, requested <= totalPages ? requested : 2];
}

export function summarizeSync(sourceProgress) {
  const sources = Object.values(sourceProgress).filter((source) => ['success', 'partial', 'failed'].includes(source?.status));
  const successful = sources.filter((source) => source.status === 'success').length;
  return {
    runStatus: successful === sources.length && sources.length ? 'success' : sources.some((source) => source.status !== 'failed') ? 'partial' : 'failed',
    insertedThisRun: sources.reduce((sum, source) => sum + (source.inserted || 0), 0),
    updatedThisRun: sources.reduce((sum, source) => sum + (source.updated || 0), 0),
    unchangedThisRun: sources.reduce((sum, source) => sum + (source.unchanged || 0), 0),
    retryable: sources.some((source) => source.status !== 'success' && source.retryable === true),
  };
}

export function buildPostingUpdate(posting, previous, nowStr) {
  const changed = !previous || (posting.sourceContentHash ? previous.sourceContentHash !== posting.sourceContentHash : previous.contentHash !== posting.contentHash);
  const analysisChanged = !previous || previous.contentHash !== posting.contentHash;
  const recoverableHidden = ['invalid', 'cancelled'].includes(previous?.catalogHiddenReason);
  const remainsHidden = previous?.catalogStatus === 'hidden' && !(changed && recoverableHidden);
  return {
    ...posting,
    catalogStatus: remainsHidden ? 'hidden' : 'active',
    sourceLastSeenAt: nowStr,
    sourceUpdatedAt: changed ? nowStr : previous?.sourceUpdatedAt || previous?.updatedAt || nowStr,
    updatedAt: changed ? nowStr : previous?.updatedAt || nowStr,
    ...(analysisChanged ? { analysisStatus: 'PENDING', aiExecutiveSummary: null, talentPersona: null } : {}),
    ...(!previous ? { sourceCreatedAt: nowStr } : {}),
    ...(recoverableHidden && !remainsHidden ? { catalogHiddenAt: null, catalogHiddenReason: null, canonicalJobId: null } : {}),
  };
}

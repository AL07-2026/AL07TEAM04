import { fetchJobSourceText, JobSourceError, parsePublicJobResponse, parseSeoulJobResponse, validateWorknetJobResponse } from './jobSourceTransport.mjs';
import { planSourcePages } from './jobSyncPolicy.mjs';

// One daily collection, not one request per visitor. Maximum: 6 requests, 12 with bounded retries.
export async function collectJobSources({ state, dateKey, nowStr, transforms, upsert, onSourceResult, keys = process.env, fetchText = fetchJobSourceText }) {
  const sourceProgress = {};
  const statePatch = {};
  for (const source of ['seoul', 'public', 'worknet']) {
    const previous = state.sourceProgress?.[source] || {};
    if (previous.status === 'success' && previous.lastSuccessDate === dateKey) {
      sourceProgress[source] = { ...previous, inserted: 0, updated: 0, unchanged: 0, activeUpserts: 0, requestCount: 0, reused: true };
      continue;
    }
    const progress = { status: 'running', received: 0, inserted: 0, updated: 0, unchanged: 0, activeUpserts: 0,
      requestCount: 0, lastSuccessAt: previous.lastSuccessAt || null, lastSuccessDate: previous.lastSuccessDate || null };
    const request = (url, parse) => fetchText(url, { parse, onAttempt: () => progress.requestCount++ });
    const persist = async (rows) => {
      progress.received += rows.length;
      const postings = [...new Map(rows.map(transforms[source]).filter(Boolean).map((item) => [item.id, item])).values()];
      const counts = await upsert(postings);
      for (const key of ['inserted', 'updated', 'unchanged', 'activeUpserts']) progress[key] += counts[key] || 0;
      const newest = postings.map((posting) => posting.postedAt || '').sort().at(-1) || null;
      if (newest && (!progress.newestPostedAt || newest > progress.newestPostedAt)) progress.newestPostedAt = newest;
    };
    try {
      const key = String(keys[{ seoul: 'SEOUL_JOB_API_KEY', public: 'PUBLIC_JOB_API_KEY', worknet: 'WORKNET_JOB_API_KEY' }[source]] || '').trim();
      if (!key) throw new JobSourceError('KEY_NOT_CONFIGURED');
      if (source === 'seoul') {
        const url = (start, end) => `http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/recMntList/${start}/${end}/`;
        const meta = await request(url(1, 5), parseSeoulJobResponse);
        const total = meta.totalAvailable;
        progress.totalAvailable = total;
        progress.service = 'recMntList';
        const tailStart = Math.max(1, total - 999);
        const cursor = Math.max(1, Math.floor(Number(state.seoulV2NextStartIndex) || 1));
        const rotatingStart = cursor < tailStart ? cursor : 1;
        const ranges = total ? [[tailStart, total]] : [];
        if (rotatingStart < tailStart) ranges.push([rotatingStart, Math.min(rotatingStart + 999, tailStart - 1)]);
        progress.requestedRanges = ranges.map(([start, end]) => `${start}-${end}`);
        for (const [start, end] of ranges) await persist((await request(url(start, end), parseSeoulJobResponse)).rows);
        statePatch.seoulV2NextStartIndex = rotatingStart + 1000 < tailStart ? rotatingStart + 1000 : 1;
        statePatch.seoulTotalAvailable = total;
      } else if (source === 'public') {
        const pages = planSourcePages(state.publicV2NextPage, state.publicTotalAvailable, 100);
        progress.requestedPages = pages;
        let total = 0;
        for (const pageNo of pages) {
          const params = new URLSearchParams({ serviceKey: key, pageNo: String(pageNo), numOfRows: '100', resultType: 'json' });
          const result = await request(`https://apis.data.go.kr/1051000/recruitment/list?${params}`, parsePublicJobResponse);
          total = Math.max(total, result.totalAvailable);
          await persist(result.rows);
        }
        progress.totalAvailable = total;
        const lastPage = pages.at(-1);
        statePatch.publicV2NextPage = lastPage < Math.ceil(total / 100) ? lastPage + 1 : 2;
        statePatch.publicTotalAvailable = total;
      } else {
        const params = new URLSearchParams({ authKey: key, callTp: 'L', returnType: 'XML', startPage: '1', display: '100', sortOrderBy: 'DESC' });
        const xml = await request(`https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do?${params}`, validateWorknetJobResponse);
        const result = transforms.parseWorknet(xml);
        if (result.error) throw new JobSourceError('SOURCE_API_ERROR');
        progress.requestedPages = [1];
        await persist(result.rows);
      }
      Object.assign(progress, { status: 'success', retryable: false, lastSuccessAt: nowStr, lastSuccessDate: dateKey });
    } catch (error) {
      Object.assign(progress, { status: progress.activeUpserts ? 'partial' : 'failed',
        errorCode: error instanceof JobSourceError ? error.code : 'PERSISTENCE_ERROR',
        retryable: error instanceof JobSourceError ? error.retryable : true });
    }
    sourceProgress[source] = progress;
    await onSourceResult?.(sourceProgress, statePatch);
  }
  return { sourceProgress, statePatch };
}

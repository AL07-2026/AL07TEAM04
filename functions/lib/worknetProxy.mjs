const WORKNET_JOB_ENDPOINT =
  'https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do';
const WORKNET_UPSTREAM_TIMEOUT_MS = 5_000;

const allowedQueryParameters = new Set([
  'authKey',
  'callTp',
  'returnType',
  'startPage',
  'display',
  'career',
  'minCareerM',
  'maxCareerM',
  'keyword',
  'sortOrderBy',
]);

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function createWorknetUpstreamUrl(query, configuredApiKey = '') {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query ?? {})) {
    if (!allowedQueryParameters.has(key)) continue;
    const value = firstQueryValue(rawValue);
    if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
  }

  const apiKey = configuredApiKey.trim() || params.get('authKey')?.trim() || '';
  if (!apiKey) return null;

  params.set('authKey', apiKey);
  params.set('callTp', 'L');
  params.set('returnType', 'XML');
  return `${WORKNET_JOB_ENDPOINT}?${params.toString()}`;
}

export async function proxyWorknetJobs(req, res, configuredApiKey = '') {
  const upstreamUrl = createWorknetUpstreamUrl(req.query, configuredApiKey);
  if (!upstreamUrl) {
    return res.status(500).json({ error: '고용24 채용정보 API 인증키가 설정되지 않았습니다.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WORKNET_UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(upstreamUrl, {
      headers: { Accept: 'application/xml,text/xml' },
      signal: controller.signal,
    });
    const body = await response.text();

    if (!response.ok) {
      return res.status(502).json({ error: `고용24 응답 오류 (${response.status})` });
    }

    res.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    res.type('application/xml');
    return res.status(200).send(body);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({ error: '고용24 응답 시간을 초과했습니다.' });
    }

    console.error('Worknet proxy failed:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: '고용24에 연결하지 못했습니다.' });
  } finally {
    clearTimeout(timeoutId);
  }
}

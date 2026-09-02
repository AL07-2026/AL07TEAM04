import http from 'http';
import https from 'https';
import { decodeUtf8Chunks } from './httpEncoding.mjs';

const PUBLIC_JOB_ENDPOINT_BASE = 'https://apis.data.go.kr/1051000/recruitment/list';
const PUBLIC_UPSTREAM_TIMEOUT_MS = 5_000;

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
      reject(new Error('Public Job API timeout'));
    });
  });
}

export function createPublicJobUpstreamUrl(query = {}, configuredApiKey = '') {
  const apiKey = (configuredApiKey || query.authKey || '').trim();
  if (!apiKey) throw new Error('PUBLIC_JOB_API_KEY is not configured');
  const pageNo = Number(query.pageNo) || 1;
  const numOfRows = Number(query.numOfRows) || 500;

  const params = new URLSearchParams();
  params.set('serviceKey', apiKey);
  params.set('pageNo', String(pageNo));
  params.set('numOfRows', String(numOfRows));
  params.set('resultType', 'json');

  return `${PUBLIC_JOB_ENDPOINT_BASE}?${params.toString()}`;
}

export async function proxyPublicJobs(req, res, configuredApiKey = '') {
  const upstreamUrl = createPublicJobUpstreamUrl(req.query, configuredApiKey);

  try {
    const data = await httpGetJson(upstreamUrl, PUBLIC_UPSTREAM_TIMEOUT_MS);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.type('application/json');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Public Job proxy failed:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: '공공기관 채용 API에 연결하지 못했습니다.' });
  }
}

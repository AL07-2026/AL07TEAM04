import { describe, expect, it } from 'vitest';
import {
  fetchPublicJobFeed,
  transformPublicJobToPosting,
  type PublicJobRaw,
} from './publicJobService';

describe('publicJobService', () => {
  it('correctly transforms raw Public job item into JobPosting', () => {
    const raw: PublicJobRaw = {
      recrutPblntSn: 1001,
      instNm: '한국전력공사',
      recrutPbancTtl: '2026년도 시니어 신재생에너지 사업관리 전문가 채용',
      ncsCdNmLst: '에너지/경영',
      workRgnNmLst: '서울특별시 / 전라남도',
      hireTypeNmLst: '정규직',
      pbancBgngYmd: '20260801',
      pbancEndYmd: '20260831',
      srcUrl: 'https://job.alio.go.kr/detail.do?id=1001',
    };

    const posting = transformPublicJobToPosting(raw);

    expect(posting?.id).toBe('PUBLIC-1001');
    expect(posting?.companyName).toBe('한국전력공사');
    expect(posting?.title).toBe('2026년도 시니어 신재생에너지 사업관리 전문가 채용');
    expect(posting?.source).toBe('public');
    expect(posting?.sourceProvider).toContain('이어잡 공식 검증');
    expect(posting?.companySize).toBe('공공기관/공기업');
    expect(posting?.deadline).toBe('2026-08-31');
  });

  it('rejects rows without a real source id or title instead of creating a synthetic duplicate', () => {
    expect(transformPublicJobToPosting({})).toBeNull();
    expect(transformPublicJobToPosting({ recrutPblntSn: 123 })).toBeNull();
  });

  it('fetches Public job feed without crashing in test environment', async () => {
    const feed = await fetchPublicJobFeed();
    expect(Array.isArray(feed)).toBe(true);
  });
});

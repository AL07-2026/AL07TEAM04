import { describe, expect, it, vi } from 'vitest';
import {
  fetchSeoulJobFeed,
  transformSeoulJobToPosting,
  type SeoulJobRaw,
} from './seoulJobService';

describe('seoulJobService', () => {
  it('correctly transforms raw Seoul job item into JobPosting', () => {
    const raw: SeoulJobRaw = {
      JO_REQST_NO: 'P12345',
      CMPNY_NM: '서울테크 주식회사',
      JO_SJ: '시니어 데이터 분석가 및 플랫폼 기획자 채용',
      JOBCODE_NM: '데이터 플랫폼',
      WORK_PARAR_BASS_ADRES_CN: '서울특별시 서초구 강남대로 100',
      EMPLYM_STLE_CMMN_MM: '정규직',
      HOPE_WAGE: '월급 3,500,000원',
      RCEPT_CLOS_NM: '2026-08-31',
      WORK_TIME_NM: '주 5일, 09:00~18:00',
    };

    const posting = transformSeoulJobToPosting(raw);

    expect(posting?.id).toBe('SEOUL-P12345');
    expect(posting?.companyName).toBe('서울테크 주식회사');
    expect(posting?.title).toBe('시니어 데이터 분석가 및 플랫폼 기획자 채용');
    expect(posting?.source).toBe('seoul');
    expect(posting?.sourceProvider).toContain('이어잡 공식 검증');
    expect(posting?.salaryRange).toBe('월급 3,500,000원');
  });

  it('rejects rows without a real source id or title instead of creating a synthetic duplicate', () => {
    expect(transformSeoulJobToPosting({})).toBeNull();
    expect(transformSeoulJobToPosting({ JO_REQST_NO: 'H123' })).toBeNull();
  });

  it('does not call the Seoul source API from the browser', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const feed = await fetchSeoulJobFeed();

    expect(Array.isArray(feed)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

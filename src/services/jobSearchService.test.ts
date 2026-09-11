import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearJobSearchClientCache,
  searchFullJobDatabase,
} from '@/services/jobSearchService';

beforeEach(() => {
  sessionStorage.clear();
  clearJobSearchClientCache();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('searchFullJobDatabase', () => {
  it('sends full-database filters and accepts paginated results', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          catalogTotal: 12_086,
          closingSoonTotal: 80,
          items: [{ id: 'job-1', title: 'UX 디자이너' }],
          page: 3,
          pageSize: 12,
          partTimeTotal: 100,
          preferredTotal: 500,
          total: 41,
          totalPages: 4,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await searchFullJobDatabase({
      categories: ['design'],
      certificationText: '정보처리기사',
      desiredCategories: ['other', 'design'],
      desiredOccupationRank: 1,
      desiredOccupationText: 'UX 리서처',
      desiredWorkType: '시간제·파트타임 (오전/오후)',
      employmentType: 'contract',
      experienceCardCategory: 'design-brand',
      experienceCardText: '브랜드 리뉴얼과 UX 디자인 시스템 구축',
      page: 3,
      pageSize: 12,
      profileExperience: '모바일 서비스 리뉴얼 총괄',
      profileField: 'UX/UI 및 브랜딩',
      profileKeySkills: 'UX/UI 디자인 시스템과 브랜드 고도화',
      profileSolvedExperience: '서비스 런칭과 사용자 흐름 개선',
      query: 'UX',
      requireDesiredOccupationMatch: true,
      workType: 'remote',
    });

    const requestUrl = fetchMock.mock.calls[0]?.[0];
    expect(typeof requestUrl).toBe('string');
    if (typeof requestUrl !== 'string') throw new Error('Expected a string request URL');
    expect(requestUrl).toContain('categories=design');
    expect(requestUrl).toContain('certificationText=');
    expect(requestUrl).toContain('desiredCategories=other%2Cdesign');
    expect(requestUrl).toContain('desiredOccupationRank=1');
    expect(requestUrl).toContain('desiredOccupationText=UX+%EB%A6%AC%EC%84%9C%EC%B2%98');
    expect(requestUrl).toContain('desiredWorkType=');
    expect(requestUrl).toContain('employmentType=contract');
    expect(requestUrl).toContain('experienceCardCategory=design-brand');
    expect(requestUrl).toContain('experienceCardText=');
    expect(requestUrl).toContain('page=3');
    expect(requestUrl).toContain('profileExperience=');
    expect(requestUrl).toContain('profileField=UX%2FUI+%EB%B0%8F+%EB%B8%8C%EB%9E%9C%EB%94%A9');
    expect(requestUrl).toContain('profileKeySkills=');
    expect(requestUrl).toContain('profileSolvedExperience=');
    expect(requestUrl).toContain('q=UX');
    expect(requestUrl).toContain('requireDesiredOccupationMatch=true');
    expect(result.total).toBe(41);
    expect(result.items[0]?.id).toBe('job-1');
  });

  it('동일한 검색 조건도 로그인 UID가 다르면 이전 계정의 검색 캐시를 재사용하지 않는다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'success',
            catalogTotal: 2,
            closingSoonTotal: 0,
            items: [{ id: 'senior-a-job', title: 'A 계정 추천' }],
            page: 1,
            pageSize: 5,
            partTimeTotal: 0,
            preferredTotal: 1,
            total: 1,
            totalPages: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'success',
            catalogTotal: 2,
            closingSoonTotal: 0,
            items: [{ id: 'senior-b-job', title: 'B 계정 추천' }],
            page: 1,
            pageSize: 5,
            partTimeTotal: 0,
            preferredTotal: 1,
            total: 1,
            totalPages: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const first = await searchFullJobDatabase({
      cacheScope: 'senior-a',
      desiredCategories: ['planning-strategy', 'service'],
    });
    const second = await searchFullJobDatabase({
      cacheScope: 'senior-b',
      desiredCategories: ['planning-strategy', 'service'],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.items[0]?.id).toBe('senior-a-job');
    expect(second.items[0]?.id).toBe('senior-b-job');
  });

  it('실시간 검색이 실패해도 임시 목록을 페이지 크기만큼 채우고 폴백임을 알린다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('cold start timeout'));

    const result = await searchFullJobDatabase({
      categories: ['planning-strategy'],
      page: 1,
      pageSize: 5,
    });

    expect(result.items).toHaveLength(5);
    expect(result.isFallback).toBe(true);
  });

  it('임시 목록 이후 강제 재시도는 콜드 함수가 준비될 시간을 충분히 기다린다', async () => {
    vi.useFakeTimers();
    let wasAborted = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => {
            wasAborted = true;
            reject(new DOMException('Timed out', 'AbortError'));
          },
          { once: true },
        );
      }),
    );

    const resultPromise = searchFullJobDatabase({
      forceRefresh: true,
      page: 1,
      pageSize: 5,
    });

    await vi.advanceTimersByTimeAsync(4_001);
    expect(wasAborted).toBe(false);

    await vi.advanceTimersByTimeAsync(11_000);
    const result = await resultPromise;
    expect(wasAborted).toBe(true);
    expect(result.isFallback).toBe(true);
  });

  it('omits all-valued filters so home and project database totals use the same scope', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          catalogTotal: 65,
          closingSoonTotal: 0,
          items: [],
          page: 1,
          pageSize: 12,
          partTimeTotal: 0,
          preferredTotal: 65,
          total: 65,
          totalPages: 6,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await searchFullJobDatabase({
      categories: ['service'],
      desiredCategories: ['service'],
      employmentType: 'all',
      hiringStage: 'all',
      page: 1,
      pageSize: 12,
      workType: 'all',
    });

    const requestUrl = fetchMock.mock.calls[0]?.[0];
    expect(typeof requestUrl).toBe('string');
    if (typeof requestUrl !== 'string') throw new Error('Expected a string request URL');
    expect(requestUrl).not.toContain('employmentType=all');
    expect(requestUrl).not.toContain('hiringStage=all');
    expect(requestUrl).not.toContain('workType=all');
  });
});

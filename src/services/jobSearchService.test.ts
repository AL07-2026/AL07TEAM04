import { afterEach, describe, expect, it, vi } from 'vitest';

import { searchFullJobDatabase } from '@/services/jobSearchService';

afterEach(() => {
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
      desiredCategories: ['other', 'design'],
      desiredOccupationRank: 1,
      desiredOccupationText: 'UX 리서처',
      employmentType: 'contract',
      experienceCardCategory: 'design-brand',
      experienceCardText: '브랜드 리뉴얼과 UX 디자인 시스템 구축',
      page: 3,
      pageSize: 12,
      query: 'UX',
      requireDesiredOccupationMatch: true,
      workType: 'remote',
    });

    const requestUrl = fetchMock.mock.calls[0]?.[0];
    expect(typeof requestUrl).toBe('string');
    if (typeof requestUrl !== 'string') throw new Error('Expected a string request URL');
    expect(requestUrl).toContain('categories=design');
    expect(requestUrl).toContain('desiredCategories=other%2Cdesign');
    expect(requestUrl).toContain('desiredOccupationRank=1');
    expect(requestUrl).toContain('desiredOccupationText=UX+%EB%A6%AC%EC%84%9C%EC%B2%98');
    expect(requestUrl).toContain('employmentType=contract');
    expect(requestUrl).toContain('experienceCardCategory=design-brand');
    expect(requestUrl).toContain('experienceCardText=');
    expect(requestUrl).toContain('page=3');
    expect(requestUrl).toContain('q=UX');
    expect(requestUrl).toContain('requireDesiredOccupationMatch=true');
    expect(result.total).toBe(41);
    expect(result.items[0]?.id).toBe('job-1');
  });
});

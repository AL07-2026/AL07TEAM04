import { describe, expect, it } from 'vitest';

import {
  filterAndPaginateJobPostings,
  filterAndPaginatePreparedJobCatalog,
  prepareJobCatalog,
} from './jobSearch.mjs';

const now = new Date('2026-08-18T12:00:00+09:00');

function posting(id, overrides = {}) {
  return {
    id,
    companyName: '테스트 기업',
    title: `일반 사무원 ${id}`,
    industry: '경영.회계.사무',
    category: 'hr-strategy',
    occupationCategory: 'general-legal-office',
    employmentType: 'full-time',
    hiringStage: 'open',
    workType: 'onsite',
    location: '서울',
    deadline: '2026-09-30',
    postedAt: '2026-08-18',
    requiredSkills: [],
    preferredSkills: [],
    matchingSignals: [],
    interviewFocus: [],
    ...overrides,
  };
}

describe('full Firestore job database search', () => {
  it('keeps ambiguous multi-role notices in all jobs but out of specific occupations', () => {
    const ambiguousPosting = posting('ambiguous-public', {
      title: '2026년 정보통신기획평가원 직원채용(공무직 미화관리, 경비관리, 운전관리)',
      industry: '정보통신',
      source: 'public',
    });

    const allJobs = filterAndPaginateJobPostings([ambiguousPosting], {}, now);
    const itJobs = filterAndPaginateJobPostings(
      [ambiguousPosting],
      { categories: 'it-development-data' },
      now,
    );
    const unclassifiedJobs = filterAndPaginateJobPostings(
      [ambiguousPosting],
      { categories: 'unclassified' },
      now,
    );

    expect(allJobs.total).toBe(1);
    expect(allJobs.items[0]?.occupationClassificationStatus).toBe('ambiguous');
    expect(itJobs.total).toBe(0);
    expect(unclassifiedJobs.items.map((item) => item.id)).toEqual(['ambiguous-public']);
  });

  it('matches a directly entered other occupation without treating every unclassified job as equal', () => {
    const result = filterAndPaginateJobPostings(
      [
        posting('ux-researcher', {
          title: '시니어 UX 리서처 채용',
          industry: '사용자 경험 조사',
          coreResponsibilities: ['사용자 인터뷰와 사용성 조사를 수행합니다.'],
        }),
        posting('unrelated-ambiguous', {
          title: '여러 분야 통합 인재 채용',
          industry: '기타 서비스',
          source: 'public',
        }),
      ],
      {
        desiredCategories: 'other',
        desiredOccupationRank: '1',
        desiredOccupationText: 'UX 리서처',
        requireDesiredOccupationMatch: 'true',
        sortBy: 'fit-desc',
      },
      now,
    );

    expect(result.items.map((item) => item.id)).toEqual(['ux-researcher']);
    expect(result.preferredTotal).toBe(1);
    expect(result.items[0]?.recommendationReasons[0]).toContain('UX 리서처');
  });

  it('routes compound job intents to the specific occupation instead of broad planning', () => {
    const productPlanner = posting('product-planner', {
      title: '상품기획PM 경력 채용',
      occupationCategory: 'planning-strategy',
      source: 'public',
    });

    const productJobs = filterAndPaginateJobPostings(
      [productPlanner],
      { categories: 'product-planning-md' },
      now,
    );
    const planningJobs = filterAndPaginateJobPostings(
      [productPlanner],
      { categories: 'planning-strategy' },
      now,
    );

    expect(productJobs.total).toBe(1);
    expect(planningJobs.total).toBe(0);
  });

  it('reuses prepared classification and search metadata across page requests', () => {
    const postings = Array.from({ length: 30 }, (_, index) =>
      posting(`cached-${index}`, { postedAt: `2026-08-${String(18 - (index % 10)).padStart(2, '0')}` }),
    );
    const catalog = prepareJobCatalog(postings, now);

    const firstPage = filterAndPaginatePreparedJobCatalog(catalog, {
      page: 1,
      pageSize: 12,
      sortBy: 'latest-desc',
    });
    const secondPage = filterAndPaginatePreparedJobCatalog(catalog, {
      page: 2,
      pageSize: 12,
      sortBy: 'latest-desc',
    });

    expect(catalog.entries).toHaveLength(30);
    expect(firstPage.items).toHaveLength(12);
    expect(secondPage.items).toHaveLength(12);
    expect(new Set([...firstPage.items, ...secondPage.items].map((item) => item.id)).size).toBe(24);
  });

  it('paginates across more than the previous 2,000-record browser limit', () => {
    const postings = Array.from({ length: 2_505 }, (_, index) =>
      posting(`office-${String(index).padStart(4, '0')}`),
    );

    const result = filterAndPaginateJobPostings(
      postings,
      { page: '209', pageSize: '12', sortBy: 'latest-desc' },
      now,
    );

    expect(result.catalogTotal).toBe(2_505);
    expect(result.total).toBe(2_505);
    expect(result.totalPages).toBe(209);
    expect(result.items).toHaveLength(9);
  });

  it('applies category, work type, employment type, status, and keyword conditions together', () => {
    const postings = [
      posting('matching', {
        title: '재택 UX/UI 디자이너 계약직',
        industry: '디자인',
        occupationCategory: 'design',
        category: 'design-brand',
        employmentType: 'contract',
        workType: 'remote',
      }),
      posting('wrong-category', { title: '재택 백엔드 개발자 계약직', workType: 'remote' }),
      posting('wrong-work-type', {
        title: 'UX/UI 디자이너 계약직',
        industry: '디자인',
        occupationCategory: 'design',
        workType: 'onsite',
        employmentType: 'contract',
      }),
    ];

    const result = filterAndPaginateJobPostings(
      postings,
      {
        categories: 'design',
        employmentType: 'contract',
        hiringStage: 'open',
        q: 'UX 디자이너',
        workType: 'remote',
      },
      now,
    );

    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe('matching');
  });

  it('filters preferred categories and orders all-database results by profile fit', () => {
    const postings = [
      posting('service', {
        title: '서비스 운영 관리자',
        occupationCategory: 'service',
        category: 'operations',
      }),
      posting('development', {
        title: '백엔드 개발자',
        industry: '소프트웨어',
        occupationCategory: 'it-development-data',
        category: 'dev-engineering',
      }),
      posting('accounting', { title: '회계 결산 담당자' }),
    ];

    const preferred = filterAndPaginateJobPostings(
      postings,
      {
        categories: 'it-development-data,service',
        desiredCategories: 'it-development-data,service',
        sortBy: 'fit-desc',
      },
      now,
    );

    expect(preferred.items.map((item) => item.id)).toEqual(['development', 'service']);
    expect(preferred.preferredTotal).toBe(2);
  });

  it('uses AI experience interview details to order postings inside the primary category', () => {
    const result = filterAndPaginateJobPostings(
      [
        posting('generic-design', {
          title: '편집 디자이너 인쇄물 제작',
          industry: '시각 디자인',
          category: 'design-brand',
          occupationCategory: 'design',
        }),
        posting('experience-design', {
          title: '브랜드 UX/UI 디자인 리뉴얼',
          industry: 'UX/UI 디자인',
          category: 'design-brand',
          occupationCategory: 'design',
          problemStatement: '사용자 흐름을 개선하는 브랜드 서비스 리뉴얼',
          requiredSkills: ['브랜드', 'UX/UI', '리뉴얼'],
        }),
      ],
      {
        categories: 'design',
        desiredCategories: 'design',
        experienceCardCategory: 'design-brand',
        experienceCardText: '브랜드 UX UI 리뉴얼 사용자 흐름 개선 성과',
        sortBy: 'fit-desc',
      },
      now,
    );

    expect(result.items.map((item) => item.id)).toEqual(['experience-design', 'generic-design']);
    expect(result.items[0]?.experienceRecommendationApplied).toBe(true);
    expect(result.items[0]?.recommendationReasons.some((reason) => reason.includes('AI 경험 인터뷰'))).toBe(true);
    expect(result.items[0]?.seniorFitScore).toBeGreaterThan(result.items[1]?.seniorFitScore);
  });

  it('prioritizes UX/UI and branding postings when those specialties are saved in the profile', () => {
    const result = filterAndPaginateJobPostings(
      [
        posting('generic-design', {
          title: '편집 디자이너 인쇄물 제작',
          industry: '시각 디자인',
          category: 'design-brand',
          occupationCategory: 'design',
          postedAt: '2026-08-18',
        }),
        posting('ux-senior-design', {
          title: '기업 글로벌 브랜드 리디자인 및 UX/UI 디자인 시스템 총괄 디렉터',
          industry: '디자인/글로벌 브랜딩',
          category: 'design-brand',
          occupationCategory: 'design',
          postedAt: '2026-08-10',
          requiredSkills: ['UX/UI 디자인', '글로벌 브랜딩', '디자인 시스템'],
        }),
      ],
      {
        categories: 'design',
        desiredCategories: 'design',
        profileText: 'UX/UI 및 브랜딩 UX/UI 디자인 설계와 서비스 런칭',
        sortBy: 'fit-desc',
      },
      now,
    );

    expect(result.items.map((item) => item.id)).toEqual([
      'ux-senior-design',
      'generic-design',
    ]);
    expect(
      result.items[0]?.recommendationReasons.some((reason) => reason.includes('전문 분야')),
    ).toBe(true);
  });

  it('excludes expired postings before calculating totals', () => {
    const result = filterAndPaginateJobPostings(
      [posting('active'), posting('expired', { deadline: '2026-08-17' })],
      {},
      now,
    );

    expect(result.catalogTotal).toBe(1);
    expect(result.total).toBe(1);
  });

  it('does not return mechanical CAD drafting when the design category is selected', () => {
    const result = filterAndPaginateJobPostings(
      [
        posting('visual-design', {
          title: '브랜드 UX/UI 디자이너',
          industry: '웹 디자이너',
        }),
        posting('mechanical-cad', {
          title: '자동화 포장기계 설계 담당 정규직 채용',
          industry: '기계·금속 제도사(캐드원)',
        }),
        posting('vague-computer-design', {
          title: '컴퓨터 디자인 구인',
          industry: '행정사·문서대행자',
          coreResponsibilities: [
            '캐드와 기계 프로그램을 사용해 자동화 장비 도면을 작성합니다.',
          ],
        }),
      ],
      { categories: 'design' },
      now,
    );

    expect(result.items.map((item) => item.id)).toEqual(['visual-design']);
  });

  it('excludes malformed legacy records and returns only the newest exact duplicate', () => {
    const result = filterAndPaginateJobPostings(
      [
        posting('PUBLIC-200', { title: '공공기관 전문 인재 채용 공고' }),
        posting('SEOUL-267'),
        posting('old-copy', { postedAt: '2026-08-01', title: '데이터 분석가 채용' }),
        posting('new-copy', { postedAt: '2026-08-18', title: '데이터 분석가 채용' }),
        posting('different-shift', {
          postedAt: '2026-08-18',
          title: '데이터 분석가 채용',
          workSchedule: '주 3일',
        }),
      ],
      { sortBy: 'latest-desc' },
      now,
    );

    expect(result.catalogTotal).toBe(2);
    expect(result.duplicateExcludedTotal).toBe(1);
    expect(result.items.map((item) => item.id)).toEqual(['different-shift', 'new-copy']);
  });

  it('does not expose postings that already contain unrecoverable UTF-8 replacement characters', () => {
    const result = filterAndPaginateJobPostings(
      [
        posting('healthy', { title: '방송미디어 국제협력 연구원 채용' }),
        posting('broken', { title: '방송미디어 ���제협력 연구원 채용' }),
      ],
      {},
      now,
    );

    expect(result.items.map((item) => item.id)).toEqual(['healthy']);
    expect(result.catalogTotal).toBe(1);
  });
});

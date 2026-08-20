import { describe, expect, it } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import {
  getCompanyOwnedProjects,
  getPublishedCompanyProjects,
  matchesPublishedCompanyProject,
  mergeSeniorPostings,
  resolveSeniorCategoryFilter,
} from '@/app/jobDatabaseProjectVisibility';

const companyProject: JobPosting = {
  id: 'company-project-1',
  ownerId: 'company-user',
  companyName: '테스트 기업',
  industry: '서비스업',
  companySize: '10명',
  title: '기업 운영 프로젝트',
  category: 'operations',
  seniority: 'lead',
  employmentType: 'project',
  hiringStage: 'open',
  workType: 'hybrid',
  location: '서울 강남',
  experienceYears: '5년 이상',
  salaryRange: '월 300만원',
  deadline: '2026-12-31',
  projectDuration: '3개월',
  collaborationTargets: [],
  coreResponsibilities: ['운영 흐름을 개선합니다.'],
  qualifications: [],
  benefits: [],
  problemStatement: '운영 체계를 정비합니다.',
  projectGoal: '기업 운영 프로젝트를 완성합니다.',
  successMetrics: [],
  requiredSkills: ['서비스 운영'],
  preferredSkills: [],
  matchingSignals: [],
  recommendedTalentType: '운영 전문가',
  matchingScoreCriteria: [],
  interviewFocus: [],
  seniorFitScore: 90,
  postedAt: '2026-08-19',
};

describe('기업 등록 프로젝트의 인재 목록 노출', () => {
  it('공개 중인 기업 프로젝트만 인재 목록에 포함한다', () => {
    const closedProject = { ...companyProject, id: 'company-project-2', hiringStage: 'closing' as const };

    expect(getPublishedCompanyProjects([companyProject, closedProject])).toEqual([companyProject]);
  });

  it('기업 관리 화면에는 로그인한 기업이 등록한 공고만 포함한다', () => {
    const legacyProject = { ...companyProject, id: 'legacy-project', ownerId: undefined };
    const anotherCompanyProject = { ...companyProject, id: 'company-project-2', ownerId: 'company-b' };

    expect(
      getCompanyOwnedProjects([companyProject, legacyProject, anotherCompanyProject], 'company-user'),
    ).toEqual([companyProject]);
    expect(getCompanyOwnedProjects([companyProject], undefined)).toEqual([]);
    expect(getPublishedCompanyProjects([legacyProject])).toEqual([legacyProject]);
  });

  it('기업이 입력한 프로젝트 제목으로 검색할 수 있고, 목록 중복을 제거한다', () => {
    expect(
      matchesPublishedCompanyProject(companyProject, {
        employmentType: 'all',
        hiringStage: 'all',
        query: '기업 운영',
        selectedCategory: 'all',
        workType: 'all',
      }),
    ).toBe(true);
    expect(mergeSeniorPostings([companyProject], [{ ...companyProject }])).toEqual([companyProject]);
  });

  it('새로고침 후에도 1순위 직무를 기업 공개 공고 필터에 적용한다', () => {
    const selectedCategory = resolveSeniorCategoryFilter('all', 'design');
    const designCompanyProject = {
      ...companyProject,
      category: 'design-brand' as const,
      id: 'design-company-project',
      occupationCategory: 'design' as const,
    };
    const itCompanyProject = {
      ...companyProject,
      category: 'dev-engineering' as const,
      id: 'it-company-project',
      occupationCategory: 'it-development-data' as const,
    };

    expect(selectedCategory).toBe('design');
    expect(
      [designCompanyProject, itCompanyProject].filter((project) =>
        matchesPublishedCompanyProject(project, {
          employmentType: 'all',
          hiringStage: 'all',
          query: '',
          selectedCategory,
          workType: 'all',
        }),
      ),
    ).toEqual([designCompanyProject]);
    expect(resolveSeniorCategoryFilter('it-development-data', 'design')).toBe('it-development-data');
    expect(resolveSeniorCategoryFilter('all')).toBe('all');
  });

  it('기타 직접 입력 1순위에는 키워드 또는 후순위 직무가 맞는 공고만 표시한다', () => {
    const matchingProject = {
      ...companyProject,
      coreResponsibilities: ['재활 학술 자료를 검토합니다.'],
      id: 'rehabilitation-project',
      title: '재활 학술 전문가',
    };
    const unrelatedProject = {
      ...companyProject,
      coreResponsibilities: ['고객 집청소와 식사를 지원합니다.'],
      id: 'home-helper-project',
      title: '홈프로텍터',
    };
    const fallbackCategoryProject = {
      ...companyProject,
      category: 'r-and-d-manufacturing' as const,
      id: 'research-project',
      occupationCategory: 'research-rd' as const,
      title: '기업 연구개발 자문',
    };
    const filters = {
      desiredOccupationText: '재활 학술',
      employmentType: 'all' as const,
      fallbackOccupationCategories: ['research-rd' as const, 'education' as const],
      hiringStage: 'all' as const,
      query: '',
      selectedCategory: 'custom-match' as const,
      workType: 'all' as const,
    };

    expect(
      [matchingProject, fallbackCategoryProject, unrelatedProject].filter((project) =>
        matchesPublishedCompanyProject(project, filters),
      ),
    ).toEqual([matchingProject, fallbackCategoryProject]);
  });
});

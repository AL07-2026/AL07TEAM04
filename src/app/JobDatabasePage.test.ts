import { describe, expect, it } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import {
  getPublishedCompanyProjects,
  matchesPublishedCompanyProject,
  mergeSeniorPostings,
} from '@/app/jobDatabaseProjectVisibility';

const companyProject: JobPosting = {
  id: 'company-project-1',
  ownerId: 'company-user',
  companyName: '(주)기업명',
  industry: '서비스업',
  companySize: '10명',
  title: '가나다라',
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
  projectGoal: '가나다라 프로젝트를 완성합니다.',
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

  it('기업이 입력한 프로젝트 제목으로 검색할 수 있고, 목록 중복을 제거한다', () => {
    expect(
      matchesPublishedCompanyProject(companyProject, {
        employmentType: 'all',
        hiringStage: 'all',
        query: '가나다라',
        selectedCategory: 'all',
        workType: 'all',
      }),
    ).toBe(true);
    expect(mergeSeniorPostings([companyProject], [{ ...companyProject }])).toEqual([companyProject]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import { createProject, deleteProject, fetchProjects, updateProject } from './projectService';

const projectInput: Omit<JobPosting, 'id' | 'postedAt'> = {
  ownerId: 'company-owner',
  companyName: '테스트 기업',
  industry: '서비스업',
  companySize: '10명',
  title: '운영 개선 프로젝트',
  category: 'operations',
  seniority: 'lead',
  employmentType: 'part-time',
  hiringStage: 'open',
  isPublic: true,
  workType: 'hybrid',
  location: '협의/미등록',
  experienceYears: '협의/미등록',
  salaryRange: '협의/미등록',
  attachments: [],
  deadline: '',
  projectDuration: '협의/미등록',
  collaborationTargets: [],
  coreResponsibilities: ['운영 흐름을 정리합니다.'],
  qualifications: [],
  benefits: [],
  problemStatement: '운영 병목을 개선합니다.',
  projectGoal: '',
  successMetrics: [],
  requiredSkills: [],
  preferredSkills: [],
  matchingSignals: [],
  recommendedTalentType: '관련 경험을 보유한 시니어 전문가',
  matchingScoreCriteria: [],
  interviewFocus: [],
  sourceDetailProvenance: {
    coreResponsibilities: 'source',
    problemStatement: 'source',
    projectGoal: 'unknown',
    requiredSkills: 'unknown',
  },
  seniorFitScore: 90,
};

describe('기업 프로젝트 관리 persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('소유자만 수정/삭제하고 변경 결과를 다시 읽을 수 있다', async () => {
    const { project } = await createProject(projectInput);

    await expect(updateProject(project.id, { title: '탈취된 수정' }, 'another-company')).rejects.toThrow(
      '본인 소유 프로젝트만 수정할 수 있습니다.',
    );
    await updateProject(project.id, { title: '수정된 프로젝트' }, 'company-owner');
    expect((await fetchProjects()).find((item) => item.id === project.id)?.title).toBe('수정된 프로젝트');

    await expect(deleteProject(project.id, 'another-company')).rejects.toThrow(
      '본인 소유 프로젝트만 삭제할 수 있습니다.',
    );
    await deleteProject(project.id, 'company-owner');
    expect((await fetchProjects()).some((item) => item.id === project.id)).toBe(false);
  });
});

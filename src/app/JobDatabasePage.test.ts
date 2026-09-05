import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ChangeEvent, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

const {
  mockAuthState,
  mockedCreateProject,
  mockedDeleteProject,
  mockedUpdateProject,
  mockedNavigate,
  mockedSearch,
  mockedProfile,
  mockedProjects,
  mockedExperienceCard,
} = vi.hoisted(() => {
  const mockAuthState: { user: { uid: string } | null } = {
    user: { uid: 'senior-test-user' },
  };
  return {
    mockAuthState,
    mockedCreateProject: vi.fn(),
    mockedDeleteProject: vi.fn(),
    mockedUpdateProject: vi.fn(),
    mockedNavigate: vi.fn(),
    mockedSearch: vi.fn(),
    mockedProfile: vi.fn(),
    mockedProjects: vi.fn(),
    mockedExperienceCard: vi.fn(),
  };
});

vi.mock('react-router', () => ({
  useNavigate: () => mockedNavigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));
vi.mock('@/lib/authContext', () => ({ useAuth: () => ({ user: mockAuthState.user }) }));
vi.mock('@/services/jobSearchService', () => ({
  clearJobSearchClientCache: vi.fn(),
  readLastCatalogMeta: vi.fn(() => null),
  searchFullJobDatabase: mockedSearch,
}));
vi.mock('@/services/profileService', () => ({ resolveSeniorProfile: mockedProfile }));
vi.mock('@/services/projectService', () => ({
  createProject: mockedCreateProject,
  deleteProject: mockedDeleteProject,
  fetchProjects: mockedProjects,
  updateProject: mockedUpdateProject,
}));
vi.mock('@/services/interviewService', () => ({ getLatestUserExperienceCard: mockedExperienceCard }));

import type { JobPosting } from '@/data/jobPostings';
import {
  getCompanyOwnedProjects,
  getPublishedCompanyProjects,
  matchesPublishedCompanyProject,
  mergeSeniorPostings,
  resolveSeniorCategoryFilter,
} from '@/app/jobDatabaseProjectVisibility';
import {
  CategoryPickerDialog,
  DetailPanel,
  JobDatabasePage,
  PostingCard,
  PostingWorkSummaryContent,
  type FilterOption,
} from '@/app/JobDatabasePage';
import type { PostingWorkSummary } from '@/services/postingWorkSummary';
import { getCompletedApplicationDestination } from '@/app/jobDatabaseApplicationNavigation';

beforeEach(() => {
  mockAuthState.user = { uid: 'senior-test-user' };
  mockedNavigate.mockReset();
});

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

describe('비로그인 추천 건수', () => {
  it('검색 서버의 추천 집계와 무관하게 0건을 표시한다', async () => {
    mockAuthState.user = null;
    mockedProfile.mockResolvedValueOnce(null);
    mockedProjects.mockResolvedValueOnce([]);
    mockedExperienceCard.mockReset().mockResolvedValue(null);
    mockedSearch.mockReset().mockResolvedValueOnce({
      catalogTotal: 13761,
      closingSoonTotal: 18,
      items: [{ ...companyProject, id: 'guest-project', title: '비로그인 추천 테스트' }],
      page: 1,
      pageSize: 5,
      partTimeTotal: 64,
      preferredTotal: 25,
      status: 'success' as const,
      total: 25,
      totalPages: 5,
    });

    render(createElement(JobDatabasePage, { role: 'senior' }));

    await screen.findByRole('button', { name: '비로그인 추천 테스트' });
    expect(screen.getByText('추천 건수').parentElement).toHaveTextContent('0건');
  });
});

describe('지원 접근 및 완료 경로', () => {
  it('비로그인 시니어는 지원 모달 대신 로그인 화면으로 이동한다', async () => {
    mockAuthState.user = null;
    mockedProfile.mockResolvedValueOnce(null);
    mockedExperienceCard.mockResolvedValueOnce(null);
    mockedSearch.mockResolvedValueOnce({
      catalogTotal: 1,
      closingSoonTotal: 0,
      items: [companyProject],
      page: 1,
      pageSize: 5,
      partTimeTotal: 0,
      preferredTotal: 1,
      status: 'success',
      total: 1,
      totalPages: 1,
    });

    render(createElement(JobDatabasePage, { role: 'senior' }));
    fireEvent.click(await screen.findByRole('button', { name: '이 프로젝트에 지원하기' }));

    expect(mockedNavigate).toHaveBeenCalledWith('/login?role=senior');
    expect(screen.queryByRole('heading', { name: '지원 내용을 확인해 주세요' })).toBeNull();
  });

  it('지원 성공 확인은 방금 저장한 제안 상세로 이동한다', () => {
    expect(getCompletedApplicationDestination('proposal-just-created')).toBe(
      '/senior/proposals/proposal-just-created',
    );
  });
});

describe('프로젝트 첫 진입 안정성', () => {
  const seniorProfile = {
    desiredCategory: 'planning-strategy',
    email: 'senior@example.com',
    experience: '서비스 전략 수립',
    field: '서비스 기획',
    period: '15년',
    phone: '010-0000-0000',
  };

  function searchResult(titlePrefix: string, isFallback = false) {
    return {
      catalogTotal: 10_446,
      closingSoonTotal: 10,
      isFallback,
      items: Array.from({ length: 5 }, (_, index) => ({
        ...companyProject,
        id: `${titlePrefix}-${index + 1}`,
        title: `${titlePrefix} ${index + 1}`,
      })),
      page: 1,
      pageSize: 5,
      partTimeTotal: 100,
      preferredTotal: 50,
      status: 'success' as const,
      total: 10_446,
      totalPages: 2_090,
    };
  }

  it('인재 목록 검색은 별도 Firestore 프로젝트 조회를 기다리거나 중복 호출하지 않는다', async () => {
    mockedProfile.mockResolvedValueOnce(seniorProfile);
    mockedExperienceCard.mockResolvedValueOnce(null);
    mockedProjects.mockReset();
    mockedSearch.mockReset().mockResolvedValueOnce(searchResult('실시간 공고'));

    render(createElement(JobDatabasePage, { role: 'senior' }));

    await screen.findByRole('button', { name: '실시간 공고 1' });
    expect(mockedSearch).toHaveBeenCalledTimes(1);
    expect(mockedProjects).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /^실시간 공고 \d$/ })).toHaveLength(5);
  });

  it('지원 화면은 자동 이메일 발송으로 오인시키지 않고 실제 접수 단계를 안내한다', async () => {
    mockedProfile.mockResolvedValueOnce(seniorProfile);
    mockedExperienceCard.mockReset().mockResolvedValue(null);
    mockedProjects.mockReset();
    mockedSearch.mockReset().mockResolvedValueOnce({
      ...searchResult('지원 안내 공고'),
      items: [
        {
          ...companyProject,
          id: 'WORKNET-application-guide',
          ownerId: undefined,
          source: 'worknet' as const,
          title: '지원 안내 공고 1',
        },
      ],
    });

    render(createElement(JobDatabasePage, { role: 'senior' }));

    fireEvent.click(await screen.findByRole('button', { name: '이 프로젝트에 지원하기' }));

    expect(screen.getByRole('heading', { name: '지원 내용을 확인해 주세요' })).toBeTruthy();
    expect(screen.getByText('실제 지원은 공식 채용 페이지에서 완료해야 합니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '지원 내용 저장하기' })).toBeTruthy();
    expect(screen.queryByText(/이메일로 실시간 지원서 알림이 자동 전송/)).toBeNull();
  });

  it('기업 직접 등록 프로젝트는 공식 외부 접수처로 잘못 안내하지 않는다', async () => {
    mockedProfile.mockResolvedValueOnce(seniorProfile);
    mockedExperienceCard.mockReset().mockResolvedValue(null);
    mockedProjects.mockReset();
    mockedSearch.mockReset().mockResolvedValueOnce({
      ...searchResult('기업 직접 등록'),
      items: [
        {
          ...companyProject,
          source: 'internal' as const,
          title: '기업 직접 등록 프로젝트',
        },
      ],
    });

    render(createElement(JobDatabasePage, { role: 'senior' }));

    fireEvent.click(await screen.findByRole('button', { name: '이 프로젝트에 지원하기' }));

    expect(
      screen.getByText('지원 완료 시 담당자에게 이메일이 자동 발송됩니다.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '기업에 지원 내용 보내기' })).toBeTruthy();
    expect(screen.queryByText('실제 지원은 공식 채용 페이지에서 완료해야 합니다.')).toBeNull();
  });

  it('임시 목록을 표시한 경우 홈 재방문 없이 실시간 목록을 자동 재조회한다', async () => {
    mockedProfile.mockResolvedValueOnce(seniorProfile);
    mockedExperienceCard.mockResolvedValueOnce(null);
    mockedProjects.mockReset();
    mockedSearch
      .mockReset()
      .mockResolvedValueOnce(searchResult('임시 공고', true))
      .mockResolvedValueOnce(searchResult('실시간 공고'));

    render(createElement(JobDatabasePage, { role: 'senior' }));

    await screen.findByRole('button', { name: '실시간 공고 1' }, { timeout: 2_000 });
    expect(mockedSearch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: '임시 공고 1' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^실시간 공고 \d$/ })).toHaveLength(5);
  });

  it('비로그인 임시 목록에서도 조회 가능한 공고 수를 0건으로 표시하지 않는다', async () => {
    mockAuthState.user = null;
    mockedProfile.mockResolvedValueOnce(null);
    mockedExperienceCard.mockResolvedValueOnce(null);
    mockedProjects.mockReset();
    mockedSearch
      .mockReset()
      .mockResolvedValueOnce(searchResult('임시 공고', true))
      .mockImplementationOnce(() => new Promise(() => undefined));

    render(createElement(JobDatabasePage, { role: 'senior' }));

    await screen.findByRole('button', { name: '임시 공고 1' });
    expect(screen.getByText('조회 공고').parentElement).toHaveTextContent('10,446건');
    expect(screen.getByText('추천 건수').parentElement).toHaveTextContent('0건');
  });

  it('로그인 검색 결과는 서버가 정렬에 사용한 적합도 점수를 그대로 표시한다', async () => {
    const profile = {
      ...seniorProfile,
      certifications: '정보처리기사',
      desiredCategory: 'service',
      desiredWorkType: '계약직·기간제 (1년 등)',
      experience: '서비스 운영 총괄',
    };
    const highScorePosting = {
      ...companyProject,
      id: 'server-score-high',
      occupationCategory: 'service',
      occupationClassificationStatus: 'classified' as const,
      seniorFitScore: 96,
      title: '서버 점수 상위 공고',
    };
    const lowerScorePosting = {
      ...highScorePosting,
      id: 'server-score-lower',
      seniorFitScore: 81,
      title: '서버 점수 하위 공고',
    };
    mockedProfile.mockResolvedValueOnce(profile);
    mockedExperienceCard.mockResolvedValueOnce(null);
    mockedProjects.mockReset();
    mockedSearch.mockReset().mockResolvedValueOnce({
      ...searchResult('서버 점수'),
      items: [highScorePosting, lowerScorePosting],
      pageSize: 5,
      preferredTotal: 2,
      total: 2,
      totalPages: 1,
    });

    render(createElement(JobDatabasePage, { role: 'senior' }));

    const highScoreButton = await screen.findByRole('button', { name: '서버 점수 상위 공고' });
    const lowerScoreButton = screen.getByRole('button', { name: '서버 점수 하위 공고' });
    expect(highScoreButton.closest('article')).toHaveTextContent('96점');
    expect(lowerScoreButton.closest('article')).toHaveTextContent('81점');
    const searchOptions = mockedSearch.mock.calls[0]?.[0] as
      | {
          certificationText?: string;
          desiredWorkType?: string;
          profileExperience?: string;
          profileField?: string;
          sortBy?: string;
        }
      | undefined;
    expect(searchOptions).toMatchObject({
      certificationText: '정보처리기사',
      desiredWorkType: '계약직·기간제 (1년 등)',
      sortBy: 'fit-desc',
    });
    expect(searchOptions?.profileExperience).toBe('서비스 운영 총괄');
    expect(searchOptions?.profileField).toBe(profile.field);
  });
});

describe('기업 등록 프로젝트의 인재 목록 노출', () => {
  it('새 프로젝트 등록 시 상세 화면에 보이는 추가 정보를 함께 저장한다', async () => {
    mockedProjects.mockResolvedValueOnce([]);
    mockedCreateProject.mockResolvedValueOnce({
      project: { ...companyProject, ownerId: 'senior-test-user', title: 'AI 자동화 프로젝트' },
      savedToFirestore: true,
    });

    render(createElement(JobDatabasePage, { role: 'company' }));
    fireEvent.click(screen.getByRole('button', { name: '새 프로젝트 등록' }));

    fireEvent.change(screen.getByLabelText('회사명 *'), { target: { value: '테스트 기업' } });
    fireEvent.change(screen.getByLabelText('회사 규모'), { target: { value: '100-300명' } });
    fireEvent.change(screen.getByLabelText('프로젝트 제목 *'), { target: { value: 'AI 자동화 프로젝트' } });
    fireEvent.change(screen.getByLabelText('산업/직무 분야'), { target: { value: 'IT / SW' } });
    fireEvent.change(screen.getByLabelText('근무 지역'), { target: { value: '서울 강남' } });
    fireEvent.change(screen.getByLabelText('프로젝트 기간'), { target: { value: '4개월' } });
    fireEvent.change(screen.getByLabelText('보수/예산'), { target: { value: '월 800만-1000만' } });
    fireEvent.change(screen.getByLabelText('필요 경력'), { target: { value: '12년 이상' } });
    fireEvent.change(screen.getByLabelText('해결해야 할 문제 (Problem Statement) *'), {
      target: { value: '업무 자동화 체계가 필요합니다.' },
    });
    fireEvent.change(screen.getByLabelText('실제로 하는 일'), {
      target: { value: '업무 흐름 진단\n자동화 설계' },
    });
    fireEvent.change(screen.getByLabelText('자격 요건'), {
      target: { value: 'AI 프로젝트 경험\n프로젝트 주도 경험' },
    });
    fireEvent.change(screen.getByLabelText('추천 인재 유형'), {
      target: { value: 'AI 자동화 리드' },
    });

    fireEvent.click(screen.getByRole('button', { name: '프로젝트 등록' }));

    await waitFor(() => expect(mockedCreateProject).toHaveBeenCalledTimes(1));
    expect(mockedCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        companySize: '100-300명',
        coreResponsibilities: ['업무 흐름 진단', '자동화 설계'],
        experienceYears: '12년 이상',
        location: '서울 강남',
        projectDuration: '4개월',
        qualifications: ['AI 프로젝트 경험', '프로젝트 주도 경험'],
        recommendedTalentType: 'AI 자동화 리드',
        salaryRange: '월 800만-1000만',
        source: 'internal',
        sourceProvider: '이어잡 기업 직접 등록',
      }),
    );
  });

  it('기업 프로젝트 관리 화면의 추천 결과를 인재 카드로 보여준다', async () => {
    mockedProjects.mockResolvedValueOnce([{ ...companyProject, ownerId: 'senior-test-user' }]);

    render(createElement(JobDatabasePage, { role: 'company' }));

    await waitFor(() => expect(screen.getByText('추천 인재 3명')).toBeTruthy());
    expect(screen.getByText('김도현')).toBeTruthy();
    expect(screen.getByText('박서연')).toBeTruthy();
    expect(screen.getByText('이준호')).toBeTruthy();
    expect(screen.getAllByText(/매칭 프로젝트 · 기업 운영 프로젝트/)).toHaveLength(3);
  });

  it('등록 프로젝트 상세는 추천 결과에서 숨기고 등록 프로젝트 카드 클릭 시 팝업으로 연다', async () => {
    mockedProjects.mockResolvedValueOnce([{ ...companyProject, ownerId: 'senior-test-user' }]);

    render(createElement(JobDatabasePage, { role: 'company' }));

    await waitFor(() => expect(screen.getByText('김도현')).toBeTruthy());
    expect(screen.queryByRole('heading', { name: companyProject.title })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /등록 프로젝트\s*1건/ }));
    expect(screen.getByRole('dialog', { name: /등록 프로젝트 1건/ })).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: companyProject.title }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '등록 프로젝트 팝업 닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /등록 프로젝트 1건/ })).toBeNull());
  });

  it('공개 중인 기업 프로젝트만 인재 목록에 포함한다', () => {
    const closedProject = { ...companyProject, id: 'company-project-2', hiringStage: 'closing' as const };
    const privateProject = { ...companyProject, id: 'company-project-3', isPublic: false };

    expect(getPublishedCompanyProjects([companyProject, closedProject, privateProject])).toEqual([companyProject]);
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
      title: '생활케어 가이드',
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

const sourceBackedSummary: PostingWorkSummary = {
  duties: ['업무 흐름을 정리하는 일', '운영 체계 만들기', '협업 일정을 조율하는 일'],
  evidence: [],
  evidenceLabel: '공고에 명시된 업무를 바탕으로 정리했어요.',
  facts: [],
  hasSourceBackedWork: true,
  items: [],
  summary: '업무 흐름을 정리하는 일과 운영 체계 만들기를 함께 맡아요.',
};

describe('공고 실제 업무의 task stack 표현', () => {
  it('source-backed 업무를 순서가 보존된 정적 semantic list로 보여주고 일반 provenance 문구는 숨긴다', () => {
    render(createElement(PostingWorkSummaryContent, { summary: sourceBackedSummary }));

    const stack = screen.getByRole('list', { name: '실제로 하는 일' });
    const rows = screen.getAllByTestId('posting-task-row');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.textContent)).toEqual(sourceBackedSummary.duties);
    expect(stack).toHaveClass('list-none');
    expect(stack.innerHTML).not.toContain('rounded-full');
    const firstRow = rows.at(0);
    if (!firstRow) throw new Error('첫 번째 task row를 찾지 못했습니다.');
    expect(firstRow.querySelector('[aria-hidden="true"]')).toHaveClass('rounded-sm');
    expect(firstRow.querySelector('span:last-child')).toHaveClass('break-words');
    expect(screen.queryByText('공고에 명시된 업무를 바탕으로 정리했어요.')).toBeNull();
  });

  it('한 개의 길게 줄바꿈되는 업무도 clip 없이 같은 task row로 유지한다', () => {
    const longDuty = '여러 이해관계자의 일정과 운영 기준을 함께 정리하고 공유하는 업무를 담당합니다.';
    render(
      createElement(PostingWorkSummaryContent, {
        summary: { ...sourceBackedSummary, duties: [longDuty] },
      }),
    );

    expect(screen.getAllByTestId('posting-task-row')).toHaveLength(1);
    expect(screen.getByText(longDuty)).toHaveClass('break-words');
  });
});

describe('선택된 프로젝트 카드의 조용한 강조', () => {
  it('서버 검색 결과는 정렬에 사용한 적합도 점수를 카드에도 동일하게 표시한다', () => {
    const profile = {
      desiredCategory: 'service',
      email: 'senior@example.com',
      experience: '서비스 운영',
      field: '서비스 운영',
      period: '12년',
      solvedExperiences: '운영 흐름을 개선하고 프로세스를 표준화했습니다.',
      phone: '010-0000-0000',
    };
    const posting = { ...companyProject, seniorFitScore: 42 };
    render(
      createElement(PostingCard, {
        activePrimaryCategory: 'service',
        posting,
        profile,
        role: 'senior',
        selected: false,
        preferServerFitScore: true,
        onSelect: vi.fn(),
      }),
    );

    expect(screen.getByText(`${posting.seniorFitScore}점`)).toBeTruthy();
  });

  it('선택된 카드에만 현재 항목 semantic과 inset accent를 적용하고 제목 button의 focus ring을 유지한다', () => {
    const { container, rerender } = render(
      createElement(PostingCard, {
        onSelect: vi.fn(),
        posting: companyProject,
        selected: false,
      }),
    );
    const unselected = container.querySelector('article')!;
    expect(unselected).not.toHaveAttribute('aria-current');
    expect(unselected.className).not.toContain('inset_3px');

    rerender(
      createElement(PostingCard, {
        onSelect: vi.fn(),
        posting: companyProject,
        selected: true,
      }),
    );
    const selected = container.querySelector('article')!;
    expect(selected).toHaveAttribute('aria-current', 'true');
    expect(selected.className).toContain('inset_3px');
    expect(screen.getByRole('button', { name: companyProject.title })).toHaveClass('focus-visible:ring-2');
  });
});

describe('프로젝트 상세의 조용한 상태와 sticky identity', () => {
  it('정상 탐색 상태에는 양성 안내를 만들지 않고, desktop title은 자연스럽게 스크롤되는 헤더에 둔다', () => {
    render(
      createElement(DetailPanel, {
        activePrimaryCategory: 'all_db',
        posting: companyProject,
        role: 'senior',
      }),
    );

    expect(screen.queryByText('선택 직종 탐색 안내')).toBeNull();
    expect(screen.queryByText(/채용 공고를 탐색 중입니다/)).toBeNull();
    expect(screen.getAllByRole('heading', { name: companyProject.title })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: companyProject.title }).closest('header')).toBeTruthy();
  });

  it('기타 직무 예외에서는 compact mismatch 안내를 유지한다', () => {
    render(
      createElement(DetailPanel, {
        activePrimaryCategory: 'unclassified',
        posting: { ...companyProject, occupationClassificationStatus: 'ambiguous' },
        role: 'senior',
      }),
    );

    expect(screen.getByText('자동 분류 확신이 낮아 기타·직무 확인 필요 목록에 표시된 공고입니다.')).toBeTruthy();
  });
});

describe('검색 결과 generation transition', () => {
  it('pending 동안 stale count/list/detail을 숨기고 새 snapshot을 함께 commit한다', async () => {
    const profile = {
      desiredCategory: 'accounting-tax-finance',
      desiredCategory2: 'service',
      email: 'senior@example.com',
      experience: '재무 운영',
      field: '재무 운영',
      period: '12년',
      phone: '010-0000-0000',
    };
    const initialPosting = { ...companyProject, id: 'posting-a', title: '기존 결과 A' };
    const nextPosting = { ...companyProject, id: 'posting-b', title: '새 결과 B' };
    const result = (total: number, item: JobPosting) => ({
      catalogTotal: 13761,
      closingSoonTotal: 0,
      items: [item],
      page: 1,
      pageSize: 12,
      partTimeTotal: 0,
      preferredTotal: total,
      status: 'success' as const,
      total,
      totalPages: Math.max(1, Math.ceil(total / 12)),
    });
    let resolveNext!: (value: ReturnType<typeof result>) => void;
    mockedProfile.mockResolvedValue(profile);
    mockedProjects.mockResolvedValue([]);
    mockedExperienceCard.mockResolvedValue(null);
    mockedSearch
      .mockReset()
      .mockResolvedValueOnce(result(64, initialPosting))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve; }));

    render(createElement(JobDatabasePage, { role: 'senior' }));
    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '기존 결과 A' })).toBeTruthy();
    expect(screen.getAllByText('64').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '다른 직무 선택' }));
    fireEvent.click(screen.getAllByRole('button', { name: /회계·세무·재무/ }).at(-1)!);
    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(2));
    expect(screen.queryAllByText('64')).toHaveLength(0);
    expect(screen.getByText('업데이트 중…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '기존 결과 A' })).toBeNull();

    resolveNext(result(241, nextPosting));
    await waitFor(() => expect(screen.getAllByText('241').length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: '새 결과 B' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '기존 결과 A' })).toBeNull();
  });

  it('빠른 연속 전환에서 늦은 이전 generation 응답이 현재 결과를 덮지 않는다', async () => {
    const profile = {
      desiredCategory: 'accounting-tax-finance',
      email: 'senior@example.com',
      experience: '재무 운영',
      field: '재무 운영',
      period: '12년',
      phone: '010-0000-0000',
    };
    const resolvers: Array<(value: ReturnType<typeof makeSearchResult>) => void> = [];
    function makeSearchResult(total: number, title: string) {
      return {
        catalogTotal: 13761,
        closingSoonTotal: 0,
        items: [{ ...companyProject, id: `posting-${total}`, title }],
        page: 1,
        pageSize: 12,
        partTimeTotal: 0,
        preferredTotal: total,
        status: 'success' as const,
        total,
        totalPages: 1,
      };
    }
    mockedProfile.mockResolvedValue(profile);
    mockedProjects.mockResolvedValue([]);
    mockedExperienceCard.mockResolvedValue(null);
    mockedSearch.mockReset().mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));

    render(createElement(JobDatabasePage, { role: 'senior' }));
    await waitFor(() => expect(resolvers).toHaveLength(1));

    resolveFirst(resolvers.shift(), makeSearchResult(64, '기존'));
    await waitFor(() => expect(screen.getByRole('button', { name: '기존' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '다른 직무 선택' }));
    fireEvent.click(screen.getAllByRole('button', { name: /회계·세무·재무/ }).at(-1)!);
    await waitFor(() => expect(resolvers).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '다른 직무 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /서비스/ }));
    await waitFor(() => expect(resolvers).toHaveLength(2));

    resolveFirst(resolvers.shift(), makeSearchResult(241, '늦은 회계'));
    resolveFirst(resolvers.shift(), makeSearchResult(18, '최종 서비스'));
    await waitFor(() => expect(screen.getByRole('button', { name: '최종 서비스' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: '늦은 회계' })).toBeNull();
  });
});

function resolveFirst<T>(resolver: ((value: T) => void) | undefined, value: T) {
  if (!resolver) throw new Error('해결할 pending search가 없습니다.');
  resolver(value);
}

const pickerChoices: FilterOption[] = [
  { id: 'all_db', label: '전체' },
  { id: 'marketing-sales', label: '마케팅·홍보·조사', badge: '1순위' },
  { id: 'accounting-tax-finance', label: '회계·세무·재무' },
  { id: 'planning-strategy', label: '기획 전략' },
  { id: 'product-planning-md', label: '기획 운영' },
  { id: 'unclassified', label: '기타 직무' },
];

function renderPicker(onSelect = vi.fn(), onClose = vi.fn()) {
  const view = render(
    createElement(CategoryPickerDialog, {
      choices: pickerChoices,
      onClose,
      onSelect,
      selectedCategory: 'all_db',
      title: '직무 선택',
    }),
  );
  return { ...view, onClose, onSelect };
}

describe('직무 선택 picker의 실제 DOM 흐름', () => {
  it('검색어는 dialog 안에서만 유지하고, 단일 결과 Enter는 선택 후 닫힌다', () => {
    const { onSelect } = renderPicker();
    const input = screen.getByPlaceholderText('직무명으로 찾기');
    fireEvent.change(input, { target: { value: '세무' } });
    expect(screen.getByRole('button', { name: /회계·세무·재무/ })).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('accounting-tax-finance', 'enter');
  });

  it('여러 결과 또는 결과 없음에서 Enter는 선택이나 닫힘을 만들지 않는다', () => {
    const { onClose, onSelect } = renderPicker();
    const input = screen.getByPlaceholderText('직무명으로 찾기');
    fireEvent.change(input, { target: { value: '기획' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '없는 직무' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape, 바깥 클릭, 명시적 선택을 기존 close/select contract로 유지한다', () => {
    const { container, onClose, onSelect } = renderPicker();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(container.querySelector('#project-category-picker')!);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /회계·세무·재무/ }));
    expect(onSelect).toHaveBeenCalledWith('accounting-tax-finance', 'click');
  });

  it('희망 직무와 다른 직무를 분리하고, 전체·기타 직무와 선택 표시를 보여준다', () => {
    renderPicker();
    expect(screen.getByText('내 희망 직무')).toBeTruthy();
    expect(screen.getByText('다른 직무')).toBeTruthy();
    expect(screen.getAllByText('전체')).toHaveLength(1);
    expect(screen.getByText('기타 직무')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
  });
});

function PickerPageHarness() {
  const [globalQuery, setGlobalQuery] = useState('서울');
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FilterOption['id']>('all_db');
  return createElement(
    'div',
    null,
    createElement('input', {
      'aria-label': 'global project search',
      onChange: (event: ChangeEvent<HTMLInputElement>) => setGlobalQuery(event.target.value),
      value: globalQuery,
    }),
    createElement('output', { 'data-testid': 'selected-category' }, selectedCategory),
    isOpen
      ? createElement(CategoryPickerDialog, {
          choices: pickerChoices,
          onClose: () => setIsOpen(false),
          onSelect: (category) => {
            setSelectedCategory(category);
            setIsOpen(false);
          },
          selectedCategory,
          title: '직무 선택',
        })
      : null,
  );
}

function getInputByLabel(label: string) {
  const element = screen.getByLabelText(label);
  if (!(element instanceof HTMLInputElement)) throw new Error(`${label} input을 찾지 못했습니다.`);
  return element;
}

describe('picker와 global search의 전체 DOM lifecycle', () => {
  it('sentinel global query는 회계 Enter 이후에도 DOM/state 모두 유지되고, picker node와 재사용되지 않는다', () => {
    render(createElement(PickerPageHarness));
    const globalInput = getInputByLabel('global project search');
    const pickerInput = screen.getByPlaceholderText('직무명으로 찾기');
    expect(pickerInput).not.toBe(globalInput);

    fireEvent.change(pickerInput, { target: { value: '회계' } });
    fireEvent.keyDown(pickerInput, { key: 'Enter' });
    fireEvent.keyPress(pickerInput, { key: 'Enter' });
    fireEvent.keyUp(document.body, { key: 'Enter' });

    expect(screen.queryByPlaceholderText('직무명으로 찾기')).toBeNull();
    expect(globalInput.value).toBe('서울');
    expect(screen.getByTestId('selected-category')).toHaveTextContent('accounting-tax-finance');
  });

  it('global search itself remains controlled and normally editable', () => {
    render(createElement(PickerPageHarness));
    const globalInput = getInputByLabel('global project search');
    fireEvent.change(globalInput, { target: { value: '부산' } });
    expect(globalInput.value).toBe('부산');
  });
});

describe('JobDatabasePage 페이지네이션 순서 및 전환', () => {
  it('새 페이지 응답 전에는 이전 페이지 목록과 상세를 즉시 숨긴다', async () => {
    const profile = {
      desiredCategory: 'customer-service-tm',
      email: 'senior@example.com',
      experience: '고객상담 10년',
      field: '고객상담·TM',
      period: '10년',
      phone: '010-0000-0000',
    };
    const makeResult = (page: number, title: string) => ({
      catalogTotal: 46,
      closingSoonTotal: 0,
      items: [{ ...companyProject, id: `cs-job-${page}`, title }],
      page,
      pageSize: 5,
      partTimeTotal: 0,
      preferredTotal: 46,
      status: 'success' as const,
      total: 46,
      totalPages: 10,
    });
    let resolvePageFour!: (value: ReturnType<typeof makeResult>) => void;
    mockedProfile.mockResolvedValue(profile);
    mockedProjects.mockResolvedValue([]);
    mockedExperienceCard.mockResolvedValue(null);
    mockedSearch
      .mockReset()
      .mockResolvedValueOnce(makeResult(1, '고객상담 1페이지 공고'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePageFour = resolve; }));

    render(createElement(JobDatabasePage, { role: 'senior' }));

    await screen.findByRole('button', { name: '고객상담 1페이지 공고' });
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    expect(screen.getByText('업데이트 중…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '고객상담 1페이지 공고' })).toBeNull();
    expect(screen.queryAllByRole('heading', { name: '고객상담 1페이지 공고' })).toHaveLength(0);

    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(2));
    resolvePageFour(makeResult(4, '고객상담 4페이지 공고'));
    await screen.findByRole('button', { name: '고객상담 4페이지 공고' });
    expect(screen.getByRole('heading', { name: '고객상담 4페이지 공고', level: 2 })).toBeTruthy();
  });

  it('페이지 번호 클릭 시 해당 페이지의 공고 목록을 요청하고 올바른 인덱스 범위를 표시한다', async () => {
    const profile = {
      desiredCategory: 'customer-service-tm',
      email: 'senior@example.com',
      experience: '고객상담 10년',
      field: '고객상담·TM',
      period: '10년',
      phone: '010-0000-0000',
    };
    mockedProfile.mockResolvedValue(profile);
    mockedProjects.mockResolvedValue([]);
    mockedExperienceCard.mockResolvedValue(null);

    mockedSearch.mockReset().mockImplementation(({ page = 1 }: { page?: number }) =>
      Promise.resolve({
        catalogTotal: 46,
        closingSoonTotal: 0,
        items: [
          { ...companyProject, id: `cs-job-${page}-1`, title: `고객상담 ${page}페이지 1번` },
          { ...companyProject, id: `cs-job-${page}-2`, title: `고객상담 ${page}페이지 2번` },
        ],
        page,
        pageSize: 5,
        partTimeTotal: 0,
        preferredTotal: 46,
        status: 'success' as const,
        total: 46,
        totalPages: 10,
      }),
    );

    render(createElement(JobDatabasePage, { role: 'senior' }));

    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: '고객상담 1페이지 1번' })).toBeTruthy());
    expect(screen.getByText('1~5')).toBeTruthy();
    expect(screen.getByText(/건 표시/)).toBeTruthy();

    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: '고객상담 2페이지 1번' })).toBeTruthy());
    expect(screen.getByText('6~10')).toBeTruthy();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { vi } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import type * as ProfileService from '@/services/profileService';
import type * as ProjectService from '@/services/projectService';
import type * as ProposalService from '@/services/proposalService';

const { fetchProjectsMock, updateProjectMock } = vi.hoisted(() => ({
  fetchProjectsMock: vi.fn(),
  updateProjectMock: vi.fn(),
}));

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({ user: { name: '테스트 기업', uid: 'company-user' } }),
}));

vi.mock('@/services/projectService', async (importOriginal) => {
  const original = await importOriginal<typeof ProjectService>();
  return {
    ...original,
    fetchProjects: fetchProjectsMock,
    updateProject: updateProjectMock,
  };
});

vi.mock('@/services/proposalService', async (importOriginal) => {
  const original = await importOriginal<typeof ProposalService>();
  return { ...original, getCompanyProposals: vi.fn().mockResolvedValue([]) };
});

vi.mock('@/services/profileService', async (importOriginal) => {
  const original = await importOriginal<typeof ProfileService>();
  return {
    ...original,
    getLocalCompanyProfile: vi.fn(() => null),
    resolveCompanyProfile: vi.fn().mockResolvedValue(null),
  };
});

import { CompanyHomePage } from './FlowPages';
import { ViewportProvider } from './Ui';

const project = {
  id: 'company-project-1',
  ownerId: 'company-user',
  companyName: '테스트 기업',
  industry: '서비스업',
  companySize: '10명',
  title: '자동매매 시스템 구축',
  category: 'operations',
  seniority: 'lead',
  employmentType: 'project',
  hiringStage: 'open',
  workType: 'hybrid',
  location: '서울 강남',
  experienceYears: '5년 이상',
  salaryRange: '협의',
  deadline: '',
  projectDuration: '3개월',
  collaborationTargets: [],
  coreResponsibilities: ['운영 흐름 개선'],
  qualifications: [],
  benefits: [],
  problemStatement: '운영 체계를 정비합니다.',
  projectGoal: '자동화 시스템을 구축합니다.',
  successMetrics: [],
  requiredSkills: ['서비스 운영'],
  preferredSkills: [],
  matchingSignals: [],
  recommendedTalentType: '운영 전문가',
  matchingScoreCriteria: [],
  interviewFocus: [],
  seniorFitScore: 90,
  postedAt: '2026-09-12',
} satisfies JobPosting;

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe('기업 홈 프로젝트 관리', () => {
  it('프로젝트 관리 버튼을 누르면 홈에 머물며 등록 프로젝트 상세를 연다', async () => {
    fetchProjectsMock.mockResolvedValueOnce([project]);

    render(
      <MemoryRouter initialEntries={['/company']}>
        <ViewportProvider>
          <CompanyHomePage />
          <LocationProbe />
        </ViewportProvider>
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: /자동매매 시스템 구축.*프로젝트 관리/ }),
    );

    expect(screen.getByRole('dialog', { name: '등록 프로젝트 1건' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '선택한 프로젝트 상세' })).toHaveTextContent(
      project.title,
    );
    expect(screen.getByRole('button', { name: '프로젝트 수정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '모집 마감' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '비공개' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '프로젝트 삭제' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/company');

    fireEvent.click(screen.getByRole('button', { name: '등록 프로젝트 팝업 닫기' }));
    fireEvent.click(screen.getByRole('button', { name: '등록 프로젝트 관리' }));

    expect(screen.getByRole('dialog', { name: '등록 프로젝트 1건' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/company');
  });

  it('모집 마감과 비공개 상태를 저장하고 같은 팝업에 즉시 표시한다', async () => {
    fetchProjectsMock.mockResolvedValueOnce([project]);
    updateProjectMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/company']}>
        <ViewportProvider>
          <CompanyHomePage />
        </ViewportProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '등록 프로젝트 관리' }));
    fireEvent.click(screen.getByRole('button', { name: '모집 마감' }));

    await waitFor(() =>
      expect(updateProjectMock).toHaveBeenCalledWith(
        project.id,
        { hiringStage: 'closed' },
        'company-user',
      ),
    );
    expect(screen.getByText('모집 상태: 모집 마감')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '모집 다시 열기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '비공개' }));
    await waitFor(() =>
      expect(updateProjectMock).toHaveBeenCalledWith(
        project.id,
        { isPublic: false },
        'company-user',
      ),
    );
    expect(screen.getByText('공개 상태: 비공개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 공개' })).toBeInTheDocument();
  });

  it('프로젝트 수정은 홈에 머물며 수정 폼을 열고 저장한다', async () => {
    fetchProjectsMock.mockResolvedValueOnce([project]);
    updateProjectMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/company']}>
        <ViewportProvider>
          <CompanyHomePage />
          <LocationProbe />
        </ViewportProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '등록 프로젝트 관리' }));
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 수정' }));

    expect(screen.getByRole('dialog', { name: '프로젝트 정보 수정' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/company');

    fireEvent.change(screen.getByLabelText('프로젝트 제목 *'), {
      target: { value: '수정한 자동매매 시스템' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(updateProjectMock).toHaveBeenCalled());
    expect(screen.getByTestId('location')).toHaveTextContent('/company');
  });
});

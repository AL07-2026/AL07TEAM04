import { render, screen } from '@testing-library/react';

import type { JobPosting } from '@/data/jobPostings';

import { ExperienceSummaryView, HomeRecommendationRow } from './FlowPages';
import { ViewportProvider } from './Ui';

const narrowRecommendation: JobPosting = {
  id: 'responsive-recommendation',
  companyName: '스튜디오 크리에이티브',
  industry: '디자인',
  companySize: '중소기업',
  title: '시니어 브랜드 프로젝트 리드',
  category: 'design-brand',
  seniority: 'lead',
  employmentType: 'project',
  hiringStage: 'open',
  workType: 'hybrid',
  location: '서울 강남구',
  experienceYears: '10년 이상',
  salaryRange: '월 750만 원 ~ 1,100만 원',
  deadline: '2026-10-31',
  projectDuration: '6개월',
  collaborationTargets: [],
  coreResponsibilities: [],
  qualifications: [],
  benefits: [],
  problemStatement: '',
  projectGoal: '',
  successMetrics: [],
  requiredSkills: [],
  preferredSkills: [],
  matchingSignals: [],
  recommendedTalentType: '',
  matchingScoreCriteria: [],
  interviewFocus: [],
  seniorFitScore: 97,
  postedAt: '2026-09-12',
};

describe('HomeRecommendationRow narrow-width fallback', () => {
  it('stacks the desktop-mode row below the small breakpoint instead of squeezing columns', () => {
    render(
      <HomeRecommendationRow
        isMobile={false}
        job={narrowRecommendation}
        onClick={() => {}}
        rank={1}
      />,
    );

    expect(screen.getByTestId('home-recommendation-row-desktop')).toHaveClass(
      'flex-col',
      'items-stretch',
      'md:flex-row',
      'md:items-center',
    );
    expect(screen.getByTestId('home-recommendation-row-summary')).toHaveClass(
      'w-full',
      'border-t',
      'md:w-auto',
      'md:border-0',
    );
    expect(screen.getByText('월 750만 원 ~ 1,100만 원')).toHaveClass(
      'max-w-[72%]',
      'shrink-0',
      'break-keep',
      'text-right',
      'md:max-w-none',
      'md:whitespace-nowrap',
    );
  });

  it('keeps the touch-mobile card clipped to its own width and allows long titles to wrap', () => {
    render(
      <HomeRecommendationRow isMobile job={narrowRecommendation} onClick={() => {}} rank={1} />,
    );

    expect(screen.getByTestId('home-recommendation-row-mobile')).toHaveClass(
      'w-full',
      'min-w-0',
      'overflow-hidden',
    );
    expect(screen.getByRole('heading', { name: '시니어 브랜드 프로젝트 리드' })).toHaveClass(
      'break-words',
    );
    expect(screen.getByText('월 750만 원 ~ 1,100만 원')).toHaveClass(
      'max-w-[72%]',
      'break-keep',
      'text-right',
    );
  });
});

describe('ExperienceSummaryView responsive ownership', () => {
  const snapshot = {
    workedOn: '운영 기준을 정리했습니다.',
    accomplished: '업무 흐름을 안정화했습니다.',
    strengths: ['문서화', '조율'],
    version: 1 as const,
    confirmedAt: '2026-08-30T00:00:00.000Z',
  };

  function setDeviceMode(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        addEventListener: () => {},
        dispatchEvent: () => false,
        matches,
        media: '(max-width: 767px) and (pointer: coarse)',
        onchange: null,
        removeEventListener: () => {},
      }),
    });
  }

  it('renders a structurally vertical mobile branch with no two-column utilities', () => {
    setDeviceMode(true);
    render(
      <ViewportProvider>
        <ExperienceSummaryView snapshot={snapshot} />
      </ViewportProvider>,
    );

    const root = screen.getByTestId('experience-summary-mobile');
    expect(root.className).toMatch(/flex-col|grid-cols-1/);
    expect(root.className).not.toMatch(/grid-cols-2|md:grid-cols-2|basis-1\/2|w-1\/2/);
    expect(screen.getByText('해온 일').compareDocumentPosition(screen.getByText('해낸 일'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText('해낸 일').compareDocumentPosition(screen.getByText('잘하는 점'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps the two-zone desktop branch separate', () => {
    setDeviceMode(false);
    render(
      <ViewportProvider>
        <ExperienceSummaryView snapshot={snapshot} />
      </ViewportProvider>,
    );
    expect(screen.getByTestId('experience-summary-desktop').className).toContain('md:grid-cols-2');
  });
});

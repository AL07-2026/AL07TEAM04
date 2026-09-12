import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import {
  ActionButton,
  BrandLogo,
  Chip,
  MobilePage,
  SiteMenu,
  SummaryCard,
  useViewportMode,
  ViewportProvider,
} from '@/app/wireframe/Ui';
import { ExperienceSummaryCard } from '@/app/wireframe/FlowPages';

function ViewportModeHarness() {
  const { mode } = useViewportMode();
  return <output aria-label="현재 화면 모드">{mode}</output>;
}

function mockDeviceMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    addEventListener: vi.fn((_type: string, listener: () => void) => listeners.add(listener)),
    dispatchEvent: vi.fn(),
    matches,
    media: '(max-width: 767px) and (pointer: coarse)',
    onchange: null,
    removeEventListener: vi.fn((_type: string, listener: () => void) => listeners.delete(listener)),
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => query),
  });
}

describe('기기 화면 모드', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
      writable: true,
    });
  });

  it('PC 창을 줄여도 포인터가 PC이면 모바일 모드로 바뀌지 않는다', () => {
    mockDeviceMedia(false);
    window.innerWidth = 520;
    render(
      <ViewportProvider>
        <ViewportModeHarness />
      </ViewportProvider>,
    );

    expect(screen.getByLabelText('현재 화면 모드')).toHaveTextContent('pc');
    window.innerWidth = 360;
    fireEvent(window, new Event('resize'));
    expect(screen.getByLabelText('현재 화면 모드')).toHaveTextContent('pc');
  });

  it('작은 터치 기기에서는 모바일 화면을 사용하고 예전 수동 설정을 삭제한다', () => {
    mockDeviceMedia(true);
    localStorage.setItem('eojob_viewport_mode', 'pc');
    render(
      <ViewportProvider>
        <ViewportModeHarness />
      </ViewportProvider>,
    );

    expect(screen.getByLabelText('현재 화면 모드')).toHaveTextContent('mobile');
    expect(localStorage.getItem('eojob_viewport_mode')).toBeNull();
  });
});

describe('공통 헤더', () => {
  beforeEach(() => mockDeviceMedia(false));

  it('서비스 로고를 본문과 같은 공통 기준선에 맞추고 화면 전환 UI를 표시하지 않는다', () => {
    render(
      <MemoryRouter>
        <ViewportProvider>
          <MobilePage activeNav="home" role="senior" title="홈">
            본문
          </MobilePage>
        </ViewportProvider>
      </MemoryRouter>,
    );

    const headerRail = screen
      .getByRole('img', { name: '이어잡' })
      .closest('header')?.firstElementChild;
    expect(headerRail).toHaveClass('site-rail', 'site-header-row');
    expect(screen.queryByRole('button', { name: /PC 화면|모바일 화면/ })).not.toBeInTheDocument();
  });

  it.each([
    { label: '인재', role: 'senior' as const },
    { label: '회사', role: 'company' as const },
  ])('$label 상단·하단 현재 메뉴를 이어잡 오렌지로 표시한다', ({ label, role }) => {
    render(
      <MemoryRouter>
        <MobilePage activeNav="database" role={role} title="프로젝트">
          본문
        </MobilePage>
      </MemoryRouter>,
    );

    const primaryProject = within(
      screen.getByRole('navigation', { name: `${label} 주요 메뉴` }),
    ).getByRole('button', { name: '프로젝트' });
    const bottomProject = within(
      screen.getByRole('navigation', { name: `${label} 하단 주요 메뉴` }),
    ).getByRole('button', { name: '프로젝트' });

    expect(primaryProject).toHaveClass('bg-[#F06B4F]', 'text-white');
    expect(bottomProject).toHaveClass('text-[#F06B4F]');
    expect(bottomProject.querySelector('svg')).toHaveClass('text-[#F06B4F]');
  });

  it.each([undefined, 'senior', 'company'] as const)(
    '역할 %s에도 같은 헤더와 본문 틀을 쓴다',
    (role) => {
      const { container } = render(
        <MemoryRouter>
          <MobilePage backTo="/" role={role} title="상세">
            <p>상세 본문</p>
          </MobilePage>
        </MemoryRouter>,
      );
      expect(container.querySelectorAll('.site-header')).toHaveLength(1);
      expect(container.querySelector('.site-header .site-rail')).toBeInTheDocument();
      expect(container.querySelector('main.site-rail.site-page-content')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '이전 화면으로 돌아가기' }).closest('header'),
      ).toBeNull();
      expect(container.querySelector('.site-header img')).toHaveAttribute('alt', '이어잡');
    },
  );

  it('메뉴에서 소개, 커뮤니티, 설문 참여, 문의하기를 제공한다', () => {
    render(
      <MemoryRouter>
        <SiteMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '더보기 열기' }));
    expect(screen.getByRole('menuitem', { name: /이어잡 소개/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /커뮤니티/ })).toBeInTheDocument();
    const surveyLink = screen.getByRole('menuitem', {
      name: '설문 참여하기 (새 창에서 열림)',
    });
    expect(surveyLink).toHaveAttribute(
      'href',
      'https://docs.google.com/forms/d/e/1FAIpQLScx3laaemzgvyd3YxWzaUA2Blx36en5E-06zveHA60ONbs_Eg/viewform',
    );
    expect(surveyLink).toHaveAttribute('target', '_blank');
    expect(surveyLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('menuitem', { name: /문의하기/ })).toHaveAttribute(
      'href',
      'mailto:ieojab2026@gmail.com',
    );
  });

  it('요청한 화면에서는 프로젝트 보러가기를 메뉴 첫 항목으로 제공한다', () => {
    render(
      <MemoryRouter>
        <SiteMenu showProjectLink />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '더보기 열기' }));
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveTextContent('프로젝트 보러가기');
  });

  it('MobilePage 비인증 화면에서는 기본적으로 프로젝트 보러가기를 메뉴에 포함한다', () => {
    render(
      <MemoryRouter>
        <MobilePage title="로그인 화면">
          <div>로그인 본문</div>
        </MobilePage>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '더보기 열기' }));
    expect(screen.getByRole('menuitem', { name: /프로젝트 보러가기/ })).toBeInTheDocument();
  });
});

describe('BrandLogo', () => {
  it('전체 로고와 아이콘 로고에 같은 28px 높이를 적용한다', () => {
    render(
      <>
        <BrandLogo />
        <BrandLogo variant="icon" />
      </>,
    );

    screen.getAllByRole('img', { name: '이어잡' }).forEach((logo) => {
      expect(logo).toHaveClass('h-7');
    });
  });
});

describe('Chip', () => {
  it('선택 상태를 단색 배경과 그림자 없는 평면 스타일로 표시한다', () => {
    render(
      <Chip onClick={vi.fn()} selected>
        전체
      </Chip>,
    );

    const chip = screen.getByRole('button', { name: '전체' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveClass(
      'bg-[#173F3A]',
      'h-11',
      'min-h-11',
      'shadow-none',
      'focus-visible:ring-2',
      'focus-visible:ring-offset-2',
    );
    expect(chip).not.toHaveClass('bg-gradient-to-b', 'hover:-translate-y-0.5');
  });

  it('선택하지 않은 상태를 흰색 배경과 얇은 테두리로 표시한다', () => {
    render(<Chip onClick={vi.fn()}>진행 중</Chip>);

    const chip = screen.getByRole('button', { name: '진행 중' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).toHaveClass('border-[#D4CBB8]', 'bg-white', 'shadow-none');
    expect(chip).not.toHaveClass('bg-gradient-to-b', 'hover:-translate-y-0.5');
  });
});

describe('SummaryCard', () => {
  it('renders an interactive metric as an accessible native button', () => {
    const onClick = vi.fn();

    render(
      <SummaryCard
        interactiveLabel="추천 프로젝트 18개 보기"
        label="추천 프로젝트"
        onClick={onClick}
        value="18개"
      />,
    );

    const card = screen.getByRole('button', { name: '추천 프로젝트 18개 보기' });
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledOnce();
    expect(card.querySelector('.lucide-arrow-right')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('공통 행동 아이콘', () => {
  it('문자 화살표를 읽기 쉬운 버튼 이름과 Lucide 아이콘으로 분리한다', () => {
    const { container } = render(<ActionButton>다음 단계로 이동 →</ActionButton>);

    expect(screen.getByRole('button', { name: '다음 단계로 이동' })).toBeInTheDocument();
    expect(container.querySelector('.lucide-arrow-right')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText('→')).not.toBeInTheDocument();
  });

  it('인증 화면용 브랜드 행동 버튼은 역할과 무관하게 오렌지 색상을 사용한다', () => {
    render(<ActionButton tone="brand">회원가입</ActionButton>);

    expect(screen.getByRole('button', { name: '회원가입' })).toHaveClass(
      'border-[#D85A3F]',
      'via-[#F06B4F]',
    );
  });
});

describe('ExperienceSummaryCard', () => {
  it('지원서의 AI 경험 요약을 문제·역할·행동·결과 카드로 보여준다', () => {
    render(
      <ExperienceSummaryCard
        coverNote="등록된 시니어 경험과 AI 인터뷰 결과를 바탕으로 지원합니다."
        summary="직종: AI 자동화 · 문제: 토큰이 부족해서 어려움을 겪었습니다. · 역할: 자동화 담당자였습니다. · 실행: 대화 내용을 압축했습니다. · 결과: 지원 효율이 높아졌습니다."
      />,
    );

    expect(screen.getByText('인재 대표 경험 카드')).toBeInTheDocument();
    expect(screen.getByText('문제 (Problem)')).toBeInTheDocument();
    expect(screen.getByText('역할 (Role)')).toBeInTheDocument();
    expect(screen.getByText('행동 (Action)')).toBeInTheDocument();
    expect(screen.getByText('결과 (Result)')).toBeInTheDocument();
    expect(screen.getByText('토큰이 부족해서 어려움을 겪었습니다.')).toBeInTheDocument();
    expect(screen.getByText('지원 효율이 높아졌습니다.')).toBeInTheDocument();
    expect(screen.queryByText(/^직종: AI 자동화 · 문제:/)).not.toBeInTheDocument();
  });
});

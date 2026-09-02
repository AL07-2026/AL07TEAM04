import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BrandLogo,
  SummaryCard,
  useViewportMode,
  ViewportProvider,
} from '@/app/wireframe/Ui';
import { ExperienceSummaryCard } from '@/app/wireframe/FlowPages';

function ViewportModeHarness() {
  const { mode, setMode } = useViewportMode();
  return (
    <div>
      <output aria-label="현재 화면 모드">{mode}</output>
      <button onClick={() => setMode('pc')} type="button">
        PC 화면
      </button>
      <button onClick={() => setMode('mobile')} type="button">
        모바일 화면
      </button>
    </div>
  );
}

describe('화면 모드 수동 전환', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280, writable: true });
  });

  it('PC 창을 줄여도 자동으로 모바일 모드로 바뀌지 않는다', () => {
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

  it('모바일 버튼을 누른 경우에만 모드를 바꾸고 선택을 저장한다', () => {
    render(
      <ViewportProvider>
        <ViewportModeHarness />
      </ViewportProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '모바일 화면' }));

    expect(screen.getByLabelText('현재 화면 모드')).toHaveTextContent('mobile');
    expect(localStorage.getItem('eojob_viewport_mode')).toBe('mobile');
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

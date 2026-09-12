import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initialPremiumCompanies, type PremiumCompany } from '@/data/premiumCompanies';
import { listPremiumCompaniesWithFallback } from '@/services/premiumCompanyService';
import { PremiumCompanyBanner } from './PremiumCompanyBanner';

vi.mock('@/services/premiumCompanyService', () => ({
  listPremiumCompaniesWithFallback: vi.fn(),
}));

let reducedMotion = false;
let motionListener: ((event: MediaQueryListEvent) => void) | undefined;

async function renderBanner(isCompact = true) {
  await act(async () => {
    render(
      <MemoryRouter>
        <PremiumCompanyBanner isCompact={isCompact} />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });
}

function activeCompany(name: string) {
  return screen.getByRole('link', { name: `${name} 기업 소개 보기` });
}

async function advance(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

describe('PremiumCompanyBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotion = false;
    motionListener = undefined;
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return reducedMotion;
        },
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          motionListener = listener;
        },
        removeEventListener: vi.fn(),
      })),
    );
    vi.mocked(listPremiumCompaniesWithFallback).mockResolvedValue([...initialPremiumCompanies]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('6.5초마다 기업을 바꾸고 마지막 기업 뒤에 처음으로 돌아온다', async () => {
    await renderBanner();
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    await advance(6_499);
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    await advance(1);
    expect(activeCompany('한결바이오연구소')).toHaveStyle({ transitionDuration: '180ms' });
    await advance(6_500);
    await advance(6_500);
    expect(activeCompany('바른물류기술')).toBeInTheDocument();
    await advance(6_500);
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    expect(screen.getByLabelText('4개 기업 중 1번째')).toBeInTheDocument();
  });

  it('일시정지 상태를 유지하고 재생 버튼으로 다시 순환한다', async () => {
    await renderBanner();
    fireEvent.click(screen.getByRole('button', { name: '배너 일시정지' }));
    await advance(20_000);
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '배너 자동 재생' }));
    await advance(6_500);
    expect(activeCompany('한결바이오연구소')).toBeInTheDocument();
  });

  it('마우스와 키보드로 내용을 읽는 동안 멈추고 키보드 이동은 즉시 반영한다', async () => {
    await renderBanner();
    const banner = screen.getByRole('region', { name: '프리미엄 기업 소개' });
    fireEvent.pointerEnter(banner);
    await advance(10_000);
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    fireEvent.pointerLeave(banner);
    const companyLink = activeCompany('담은생활연구소');
    act(() => {
      companyLink.focus();
    });
    await advance(10_000);
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    fireEvent.keyDown(companyLink, { key: 'ArrowRight' });
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    expect(document.activeElement).toBe(companyLink);
    const nextButton = screen.getByRole('button', { name: '다음 기업' });
    act(() => {
      nextButton.focus();
    });
    fireEvent.keyDown(nextButton, { key: 'ArrowRight' });
    expect(activeCompany('한결바이오연구소')).toHaveStyle({ transitionDuration: '0ms' });
    expect(document.activeElement).toBe(nextButton);
    fireEvent.click(screen.getByRole('button', { name: '이전 기업' }), { detail: 0 });
    expect(activeCompany('담은생활연구소')).toHaveStyle({ transitionDuration: '0ms' });
    act(() => {
      nextButton.blur();
    });
    await advance(6_500);
    expect(activeCompany('한결바이오연구소')).toBeInTheDocument();
  });

  it('숨겨진 탭에서는 멈추고 다시 보일 때 새 주기로 재생한다', async () => {
    await renderBanner();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    await advance(30_000);
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    await advance(6_500);
    expect(activeCompany('한결바이오연구소')).toBeInTheDocument();
  });

  it('동작 줄이기를 적용하면 자동 재생을 끄고 수동 탐색을 유지한다', async () => {
    reducedMotion = true;
    await renderBanner();
    expect(screen.getByRole('button', { name: '배너 자동 재생' })).toBeDisabled();
    await advance(20_000);
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음 기업' }), { detail: 1 });
    expect(activeCompany('한결바이오연구소')).toHaveStyle({ transitionDuration: '0ms' });
  });

  it('사용 중 동작 줄이기 설정이 켜져도 즉시 자동 재생을 중단한다', async () => {
    await renderBanner();
    act(() => {
      motionListener?.({ matches: true } as MediaQueryListEvent);
    });
    await advance(20_000);
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배너 자동 재생' })).toBeDisabled();
  });

  it('서버에서 등록 기업이 도착하면 샘플을 교체하고 해당 기업 주소로 연결한다', async () => {
    let resolveCompanies: (companies: PremiumCompany[]) => void = () => undefined;
    vi.mocked(listPremiumCompaniesWithFallback).mockReturnValue(
      new Promise((resolve) => {
        resolveCompanies = resolve;
      }),
    );
    await renderBanner();
    expect(activeCompany('담은생활연구소')).toBeInTheDocument();
    const registeredCompany: PremiumCompany = {
      ...initialPremiumCompanies[0]!,
      companyName: '등록 기업 & 파트너',
      id: 'approved-company',
      isSample: false,
    };
    await act(async () => {
      resolveCompanies([registeredCompany]);
      await Promise.resolve();
    });
    expect(activeCompany(registeredCompany.companyName)).toHaveAttribute(
      'href',
      `/premium-companies?company=${encodeURIComponent(registeredCompany.companyName)}`,
    );
    expect(screen.queryByText('샘플 노출')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 기업' })).toBeDisabled();
    expect(listPremiumCompaniesWithFallback).toHaveBeenCalledWith(4);
  });

  it('좁은 화면은 포인터 유형과 무관하게 원본 3:2 비율을 사용한다', async () => {
    await renderBanner();
    const compactImage = screen.getByRole('img', { name: '담은생활연구소 업무 현장' });
    expect(compactImage).toHaveClass('aspect-[3/2]', 'object-center');
    expect(compactImage).toHaveAttribute('height', '800');
    expect(compactImage).toHaveAttribute('width', '1200');

    cleanup();
    await act(async () => {
      render(
        <MemoryRouter>
          <PremiumCompanyBanner />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    expect(screen.getByRole('img', { name: '담은생활연구소 업무 현장' })).toHaveClass(
      'aspect-[3/2]',
      'sm:aspect-[1600/893]',
      'object-center',
    );
  });

  it('모바일 조작부는 좌측 상단, 기업 정보는 하단 글래스 패널로 분리한다', async () => {
    await renderBanner();

    const banner = screen.getByRole('region', { name: '프리미엄 기업 소개' });
    const companyLink = activeCompany('담은생활연구소');
    const activeBanner = within(companyLink);
    const compactImage = activeBanner.getByRole('img', { name: '담은생활연구소 업무 현장' });
    const glassPanel = activeBanner.getByTestId('premium-company-glass-panel');
    const primaryLine = activeBanner.getByTestId('premium-company-primary-line');
    const labels = activeBanner.getByTestId('premium-company-labels');
    const mobileLinkIndicator = activeBanner.getByTestId('premium-company-mobile-link-indicator');
    const desktopLinkIndicator = activeBanner.getByTestId('premium-company-desktop-link-indicator');
    const controls = screen.getByTestId('premium-company-controls');
    const position = screen.getByLabelText('4개 기업 중 1번째');

    expect(glassPanel).toHaveClass(
      'absolute',
      'inset-x-3',
      'bottom-3',
      'flex',
      'h-12',
      'items-center',
      'overflow-hidden',
      'px-3',
      'bg-[#FFFEFC]/62',
      'backdrop-blur-[2px]',
      'supports-[backdrop-filter]:bg-[#FFFEFC]/52',
    );
    expect(glassPanel).not.toHaveClass('-mt-24', 'mb-3');
    expect(glassPanel).not.toHaveClass('min-h-[7.5rem]');
    expect(glassPanel).not.toHaveClass('pb-14');
    expect(glassPanel).not.toHaveClass('min-h-[6.5rem]');
    expect(glassPanel).not.toHaveClass('pb-11');
    expect(banner).toHaveClass('overflow-hidden');
    expect(companyLink).toHaveClass('relative');
    expect(companyLink).toContainElement(compactImage);
    expect(glassPanel.parentElement).toBe(companyLink);
    expect(primaryLine).toHaveClass('flex', 'items-center', 'gap-1');
    expect(labels).toHaveClass('gap-1', 'text-xs', 'max-sm:!text-[11px]');
    expect(activeBanner.getByText('프리미엄 기업')).toHaveClass('text-[#2F0C08]');
    expect(activeBanner.getByText('프리미엄 기업')).not.toHaveClass('sr-only');
    expect(activeBanner.getByText('샘플 노출')).toHaveClass('hidden');
    expect(activeBanner.getByRole('heading', { name: '담은생활연구소' })).toHaveClass(
      'truncate',
      'text-base',
      'font-extrabold',
      'leading-snug',
      'max-sm:!text-[13px]',
      'max-sm:font-bold',
      'max-sm:leading-none',
      'min-[360px]:max-sm:!text-sm',
    );
    expect(activeBanner.getByText('경험이 브랜드의 기준이 되는 곳')).toHaveClass('hidden');
    expect(mobileLinkIndicator).toHaveClass('size-8');
    expect(desktopLinkIndicator).toHaveClass('hidden');
    expect(controls).toHaveClass(
      'absolute',
      'top-3',
      'left-3',
      'z-20',
      'h-10',
      'gap-0',
      'rounded-xl',
      'bg-[#FFFEFC]/58',
      'px-0.5',
      'backdrop-blur-[2px]',
      'supports-[backdrop-filter]:bg-[#FFFEFC]/48',
    );
    expect(controls).not.toHaveClass('right-3', 'bottom-3');
    expect(position).toHaveClass('min-w-7', 'text-sm', 'max-sm:!text-[11px]', 'text-center');
    expect(position).not.toHaveClass('sr-only');
    for (const name of ['배너 일시정지', '이전 기업', '다음 기업']) {
      expect(screen.getByRole('button', { name })).toHaveClass('size-10', 'sm:size-11');
    }
    expect(banner).toContainElement(glassPanel);
  });

  it('isCompact=false여도 640px 미만 배치는 모바일 CSS를 우선한다', async () => {
    await renderBanner(false);

    const desktopBanner = within(activeCompany('담은생활연구소'));
    const desktopGlassPanel = desktopBanner.getByTestId('premium-company-glass-panel');
    const desktopPrimaryLine = desktopBanner.getByTestId('premium-company-primary-line');
    const desktopLabels = desktopBanner.getByTestId('premium-company-labels');
    const desktopHeading = desktopBanner.getByRole('heading', { name: '담은생활연구소' });
    const desktopControls = screen.getByTestId('premium-company-controls');
    expect(desktopGlassPanel).toHaveClass(
      'absolute',
      'inset-x-3',
      'bottom-3',
      'flex',
      'h-12',
      'overflow-hidden',
      'sm:relative',
      'sm:inset-x-auto',
      'sm:bottom-auto',
      'sm:mx-4',
      'sm:-mt-28',
      'sm:mb-4',
      'sm:block',
      'sm:h-auto',
      'sm:min-h-24',
      'sm:overflow-visible',
    );
    expect(desktopGlassPanel).not.toHaveClass('bottom-[4.5rem]');
    expect(desktopPrimaryLine).toHaveClass('gap-1', 'sm:gap-2');
    expect(desktopLabels).toHaveClass('gap-1', 'text-xs', 'max-sm:!text-[11px]', 'sm:gap-1.5');
    expect(desktopHeading).toHaveClass(
      'text-base',
      'font-extrabold',
      'leading-snug',
      'max-sm:!text-[13px]',
      'max-sm:font-bold',
      'max-sm:leading-none',
      'min-[360px]:max-sm:!text-sm',
      'sm:text-xl',
    );
    expect(desktopBanner.getByText('경험이 브랜드의 기준이 되는 곳')).toHaveClass(
      'sm:line-clamp-1',
    );
    expect(desktopBanner.getByTestId('premium-company-mobile-link-indicator')).toHaveClass(
      'sm:hidden',
    );
    expect(desktopBanner.getByTestId('premium-company-desktop-link-indicator')).toHaveClass(
      'sm:grid',
      'sm:right-[14.25rem]',
      'sm:bottom-[2.625rem]',
    );
    expect(desktopControls).toHaveClass(
      'top-3',
      'left-3',
      'h-10',
      'sm:right-8',
      'sm:bottom-[2.625rem]',
      'sm:top-auto',
      'sm:left-auto',
      'sm:h-auto',
      'sm:gap-1',
      'sm:rounded-none',
      'sm:bg-transparent',
      'sm:px-0',
      'sm:shadow-none',
      'sm:ring-0',
      'sm:backdrop-blur-none',
      'sm:supports-[backdrop-filter]:bg-transparent',
    );
    expect(desktopControls).not.toHaveClass('right-3', 'bottom-3');
    expect(screen.getByLabelText('4개 기업 중 1번째')).toHaveClass(
      'min-w-7',
      'text-sm',
      'max-sm:!text-[11px]',
      'sm:min-w-12',
    );
  });
});

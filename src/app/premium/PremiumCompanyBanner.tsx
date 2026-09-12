import { ArrowUpRight, Building2, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { initialPremiumCompanies, type PremiumCompany } from '@/data/premiumCompanies';
import { cn } from '@/lib/utils';
import { listPremiumCompaniesWithFallback } from '@/services/premiumCompanyService';

const ROTATION_INTERVAL_MS = 6_500;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const controlClassName =
  'grid size-11 shrink-0 place-items-center rounded-xl text-[#061C1A] transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100';

function CompanyBannerImage({
  company,
  compact,
  priority,
}: {
  company: PremiumCompany;
  compact: boolean;
  priority: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imageClassName = cn(
    'aspect-[3/2] w-full bg-[#EAF2EF] object-cover object-center',
    !compact && 'sm:aspect-[1600/893]',
  );

  return failed ? (
    <div
      className={cn(
        imageClassName,
        'flex flex-col items-center justify-center gap-2 text-[#52645F]',
      )}
    >
      <Building2 aria-hidden="true" className="size-8" />
      <span className="text-sm font-semibold">기업 이미지 준비 중</span>
    </div>
  ) : (
    <img
      alt={`${company.companyName} 업무 현장`}
      className={imageClassName}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      height={800}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      src={company.imageUrl}
      width={1200}
    />
  );
}

export function PremiumCompanyBanner({ isCompact = false }: { isCompact?: boolean }) {
  const [companies, setCompanies] = useState(() => initialPremiumCompanies.slice(0, 4));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );
  const [playing, setPlaying] = useState(() => !reducedMotion);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [pageHidden, setPageHidden] = useState(() => document.hidden);
  const [animated, setAnimated] = useState(false);
  const canRotate = companies.length > 1;
  const rotating =
    canRotate && playing && !reducedMotion && !hovered && !focusWithin && !pageHidden;

  useEffect(() => {
    let active = true;
    void listPremiumCompaniesWithFallback(4).then((items) => {
      if (!active || !Array.isArray(items) || !items.length) return;
      setCompanies(items.slice(0, 4));
      setCurrentIndex(0);
      setAnimated(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const media =
      typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    const onMotionChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches) {
        setPlaying(false);
        setAnimated(false);
      }
    };
    media?.addEventListener('change', onMotionChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      media?.removeEventListener('change', onMotionChange);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => {
      setAnimated(true);
      setCurrentIndex((index) => (index + 1) % companies.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [companies, currentIndex, rotating]);

  function move(direction: number, withAnimation: boolean) {
    if (!canRotate) return;
    setAnimated(withAnimation && !reducedMotion);
    setCurrentIndex((index) => (index + direction + companies.length) % companies.length);
  }

  return (
    <section
      aria-label="프리미엄 기업 소개"
      aria-roledescription="캐러셀"
      className="relative isolate overflow-hidden rounded-2xl bg-[#EAF2EF]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
      }}
      onFocus={() => setFocusWithin(true)}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <div aria-atomic="true" aria-live={rotating ? 'off' : 'polite'} className="grid">
        {companies.map((company, index) => {
          const selected = index === currentIndex;
          return (
            <Link
              aria-hidden={!selected}
              aria-label={`${company.companyName} 기업 소개 보기`}
              className={cn(
                'group relative min-w-0 [grid-area:1/1] transition-opacity focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#173F3A] motion-reduce:transition-none',
                selected ? 'z-10 opacity-100' : 'pointer-events-none opacity-0',
              )}
              inert={!selected}
              key={company.id}
              style={{
                transitionDuration: animated && !reducedMotion ? '180ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              tabIndex={selected ? 0 : -1}
              to={`/premium-companies?company=${encodeURIComponent(company.companyName)}`}
            >
              <CompanyBannerImage
                company={company}
                compact={isCompact}
                key={company.imageUrl}
                priority={index === 0}
              />
              <div
                data-testid="premium-company-glass-panel"
                className={cn(
                  'absolute inset-x-3 bottom-[4.5rem] z-10 flex h-12 items-center rounded-xl bg-[#FFFEFC]/62 px-3 shadow-[0_2px_8px_rgba(23,63,58,0.12)] ring-1 ring-inset ring-white/70 backdrop-blur-[2px] supports-[backdrop-filter]:bg-[#FFFEFC]/52',
                  !isCompact &&
                    'sm:relative sm:inset-x-auto sm:bottom-auto sm:mx-4 sm:-mt-28 sm:mb-4 sm:block sm:h-auto sm:min-h-24 sm:px-6 sm:py-4 sm:pr-72',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className="flex min-w-0 items-center gap-2"
                    data-testid="premium-company-primary-line"
                  >
                    <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
                      <span className="text-[#2F0C08]">프리미엄 기업</span>
                      {company.isSample ? (
                        <span
                          className={cn(
                            'text-[#061C1A]',
                            isCompact ? 'sr-only' : 'hidden sm:inline',
                          )}
                        >
                          샘플 노출
                        </span>
                      ) : null}
                    </div>
                    <h3
                      className={cn(
                        'min-w-0 truncate text-base font-extrabold leading-snug text-[#061C1A]',
                        !isCompact && 'sm:text-xl',
                      )}
                    >
                      {company.companyName}
                    </h3>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'ml-auto grid size-8 shrink-0 place-items-center text-[#061C1A]',
                        !isCompact && 'sm:hidden',
                      )}
                      data-testid="premium-company-mobile-link-indicator"
                    >
                      <ArrowUpRight className="size-5" />
                    </span>
                  </div>
                  <p
                    className={cn(
                      'hidden text-sm text-[#0F1917]',
                      !isCompact && 'sm:mt-1 sm:line-clamp-1 sm:leading-6',
                    )}
                  >
                    {company.headline}
                  </p>
                </div>
              </div>
              <span
                aria-hidden="true"
                className={cn(
                  'absolute z-20 hidden size-11 place-items-center text-[#061C1A]',
                  !isCompact && 'sm:right-[14.25rem] sm:bottom-[2.625rem] sm:grid',
                )}
                data-testid="premium-company-desktop-link-indicator"
              >
                <ArrowUpRight className="size-5" />
              </span>
            </Link>
          );
        })}
      </div>
      <div
        className={cn(
          'absolute right-3 bottom-3 z-20 flex h-11 items-center justify-end gap-0 rounded-xl bg-[#FFFEFC]/58 px-1 shadow-[0_2px_8px_rgba(23,63,58,0.12)] ring-1 ring-inset ring-white/70 backdrop-blur-[2px]',
          !isCompact &&
            'sm:right-8 sm:bottom-[2.625rem] sm:h-auto sm:gap-1 sm:rounded-none sm:bg-transparent sm:px-0 sm:shadow-none sm:ring-0 sm:backdrop-blur-none',
        )}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1, false);
        }}
      >
        <button
          aria-label={playing && !reducedMotion ? '배너 일시정지' : '배너 자동 재생'}
          className={controlClassName}
          disabled={!canRotate || reducedMotion}
          onClick={() => setPlaying((value) => !value)}
          title={reducedMotion ? '동작 줄이기 설정으로 자동 재생이 꺼져 있습니다.' : undefined}
          type="button"
        >
          {playing && !reducedMotion ? (
            <Pause aria-hidden="true" className="size-4" />
          ) : (
            <Play aria-hidden="true" className="size-4" />
          )}
        </button>
        <span
          aria-label={`${companies.length}개 기업 중 ${currentIndex + 1}번째`}
          className={cn(
            'min-w-10 text-center text-sm font-semibold tabular-nums text-[#0F1917]',
            !isCompact && 'sm:min-w-12',
          )}
        >
          <span className="font-extrabold text-[#061C1A]">{currentIndex + 1}</span> /{' '}
          {companies.length}
        </span>
        <button
          aria-label="이전 기업"
          className={controlClassName}
          disabled={!canRotate}
          onClick={(event) => move(-1, event.detail > 0)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <button
          aria-label="다음 기업"
          className={controlClassName}
          disabled={!canRotate}
          onClick={(event) => move(1, event.detail > 0)}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>
    </section>
  );
}

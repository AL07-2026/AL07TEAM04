import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Home,
  Inbox,
  Info,
  Mail,
  Menu,
  Send,
  User,
  Users,
  X,
} from 'lucide-react';
import { createContext, useContext, useEffect, useRef, type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';

import { cn } from '@/lib/utils';

export type Role = 'senior' | 'company';
export type SeniorNav = 'home' | 'projects' | 'database' | 'proposals' | 'profile';
export type CompanyNav = 'home' | 'projects' | 'database' | 'proposals' | 'profile';

export type ViewportMode = 'pc' | 'mobile';

type ViewportContextType = {
  mode: ViewportMode;
};

const ViewportContext = createContext<ViewportContextType>({
  mode: 'pc',
});

// eslint-disable-next-line react-refresh/only-export-components
export const useViewportMode = () => useContext(ViewportContext);

function detectViewportMode(): ViewportMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'pc';
  return window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches ? 'mobile' : 'pc';
}

export function ViewportProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewportMode>(detectViewportMode);

  useEffect(() => {
    localStorage.removeItem('eojob_viewport_mode');
    const query = window.matchMedia?.('(max-width: 767px) and (pointer: coarse)');
    if (!query) return undefined;
    const syncMode = () => setMode(query.matches ? 'mobile' : 'pc');
    query.addEventListener('change', syncMode);
    return () => query.removeEventListener('change', syncMode);
  }, []);

  return <ViewportContext.Provider value={{ mode }}>{children}</ViewportContext.Provider>;
}

export function BrandLogo({
  className,
  variant = 'full',
}: {
  className?: string;
  variant?: 'full' | 'icon';
}) {
  return (
    <img
      alt="이어잡"
      className={cn('h-7 object-contain', variant === 'icon' ? 'w-7' : 'w-auto', className)}
      src={variant === 'icon' ? '/logo_icon.png' : '/logo_text.png'}
    />
  );
}

export function SiteMenu({
  compact = false,
  onProjectClick,
  showProjectLink = false,
}: {
  compact?: boolean;
  onProjectClick?: () => void;
  showProjectLink?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const moveTo = (path: string) => {
    setOpen(false);
    void navigate(path);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls="eojob-site-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? '더보기 닫기' : '더보기 열기'}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E1E2E4] bg-white font-bold text-[#171719] transition-[color,background-color,border-color,transform] duration-150 hover:bg-[#F7F7F8] hover:text-[#005EEB] hover:border-[#005EEB]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005EEB] focus-visible:ring-offset-2 active:scale-[0.97] cursor-pointer shadow-2xs',
          compact ? 'min-w-11 px-2' : 'px-3.5 text-sm',
        )}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        {open ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
        {compact ? null : <span className="hidden sm:inline">더보기</span>}
      </button>

      {open ? (
        <div
          aria-label="이어잡 더보기 메뉴"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#E1E2E4] bg-white p-2 shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
          id="eojob-site-menu"
          role="menu"
        >
          {showProjectLink ? (
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#171719] hover:bg-[#F7F7F8] hover:text-[#005EEB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005EEB] active:scale-[0.98] transition-colors cursor-pointer"
              onClick={() => {
                onProjectClick?.();
                moveTo('/senior/project-database');
              }}
              role="menuitem"
              type="button"
            >
              <Briefcase aria-hidden="true" className="size-5 text-[#005EEB]" />
              <span>프로젝트 보러가기</span>
            </button>
          ) : null}
          <button
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#171719] hover:bg-[#F7F7F8] hover:text-[#005EEB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005EEB] active:scale-[0.98] transition-colors cursor-pointer"
            onClick={() => moveTo('/')}
            role="menuitem"
            type="button"
          >
            <Info aria-hidden="true" className="size-5 text-[#005EEB]" />
            <span>이어잡 소개</span>
          </button>
          <button
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#171719] hover:bg-[#F7F7F8] hover:text-[#005EEB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005EEB] active:scale-[0.98] transition-colors cursor-pointer"
            onClick={() => moveTo('/community')}
            role="menuitem"
            type="button"
          >
            <Users aria-hidden="true" className="size-5 text-[#005EEB]" />
            <span>커뮤니티</span>
          </button>
          <a
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#171719] hover:bg-[#F7F7F8] hover:text-[#005EEB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005EEB] active:scale-[0.98] transition-colors cursor-pointer"
            href="mailto:ieojab2026@gmail.com"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Mail aria-hidden="true" className="size-5 text-[#005EEB]" />
            <span>문의하기</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}

type MobilePageProps = {
  activeNav?: SeniorNav | CompanyNav;
  backTo?: string;
  children: ReactNode;
  contentClassName?: string;
  role?: Role;
  showBack?: boolean;
  showProjectLink?: boolean;
  title: string;
};

export function MobilePage({
  activeNav,
  backTo,
  children,
  contentClassName,
  role,
  showBack = Boolean(backTo),
  showProjectLink = !role,
  title,
}: MobilePageProps) {
  const navigate = useNavigate();
  const { mode: viewportMode } = useViewportMode();

  const isMobileMode = viewportMode === 'mobile';

  return (
    <>
      {isMobileMode ? (
        <main className="fixed inset-0 sm:static h-full sm:h-dvh sm:max-h-dvh w-full overflow-hidden bg-[#F7F7F8] text-[#171719] sm:flex sm:items-center sm:justify-center sm:p-6">
          <section className="mx-auto flex h-full sm:h-[844px] sm:max-h-[calc(100dvh-3rem)] w-full max-w-full sm:max-w-[430px] flex-col overflow-hidden border-[#E1E2E4] bg-[#F7F7F8] shadow-2xl sm:rounded-[28px] sm:border relative">
            {/* Mobile header */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E1E2E4] bg-white px-3 shadow-2xs">
              <div className="flex items-center gap-2">
                {showBack ? (
                  <button
                    aria-label="이전 화면으로 돌아가기"
                    className="-ml-1 flex size-8 items-center justify-center rounded-full text-[#171719] transition hover:bg-[#F7F7F8]"
                    onClick={() => {
                      if (backTo) void navigate(backTo);
                      else void navigate(-1);
                    }}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="size-5" />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void navigate('/')}
                  className="flex items-center rounded-xl hover:opacity-85 transition"
                >
                  <BrandLogo />
                </button>
                <h1 className="sr-only">{title}</h1>
              </div>

              <div>
                <SiteMenu compact showProjectLink={showProjectLink} />
              </div>
            </header>

            {/* Content Container */}
            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full px-4 py-4',
                contentClassName,
              )}
            >
              {children}
            </div>

            {/* Bottom Navigation */}
            {role ? <BottomNav active={activeNav} role={role} forceShow /> : null}
          </section>
        </main>
      ) : !role ? (
        /* Unauthenticated / Login / Signup Screen: Desktop Card Frame Layout */
        <main className="min-h-dvh bg-[#F7F7F8] text-[#171719] sm:p-4 md:p-6 lg:p-10 sm:flex sm:items-center sm:justify-center">
          <section className="mx-auto flex w-full max-w-full md:max-w-5xl lg:max-w-6xl xl:max-w-7xl flex-col overflow-hidden border-[#E1E2E4] bg-[#F7F7F8] shadow-2xl sm:rounded-[28px] sm:border min-h-[640px] md:min-h-[740px] lg:min-h-[820px]">
            {/* Header */}
            <header className="flex h-14 md:h-18 shrink-0 items-center justify-between border-b border-[#E1E2E4] bg-white px-4 md:px-7 shadow-2xs">
              <div className="flex items-center gap-3">
                {showBack ? (
                  <button
                    aria-label="이전 화면으로 돌아가기"
                    className="-ml-1 flex size-8 md:size-9 items-center justify-center rounded-full text-[#171719] transition hover:bg-[#F7F7F8] hover:scale-105 active:scale-95"
                    onClick={() => {
                      if (backTo) void navigate(backTo);
                      else void navigate(-1);
                    }}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="size-5 md:size-6" />
                  </button>
                ) : null}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void navigate('/')}
                    className="flex items-center gap-2 rounded-xl hover:opacity-85 transition"
                  >
                    <BrandLogo />
                  </button>
                  <h1 className="sr-only">{title}</h1>
                </div>
              </div>

              <SiteMenu showProjectLink={showProjectLink} />
            </header>

            {/* Content Container */}
            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full',
                contentClassName,
              )}
            >
              {children}
            </div>
          </section>
        </main>
      ) : (
        /* Logged-In Service Pages: Full Version Responsive Web Layout */
        <main className="min-h-dvh bg-[#F7F7F8] text-[#171719] flex flex-col w-full">
          <section className="w-full min-h-dvh flex flex-col bg-[#F7F7F8]">
            {/* Top Navbar */}
            <header className="sticky top-0 z-30 h-16 w-full shrink-0 border-b border-[#E1E2E4] bg-white shadow-2xs md:h-18">
              <div className="relative mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6 md:px-8">
                <div className="flex items-center gap-4">
                  {showBack ? (
                    <button
                      aria-label="이전 화면으로 돌아가기"
                      className="-ml-1 flex size-8 md:size-9 items-center justify-center rounded-full text-[#171719] transition hover:bg-[#F7F7F8] hover:scale-105 active:scale-95"
                      onClick={() => {
                        if (backTo) void navigate(backTo);
                        else void navigate(-1);
                      }}
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" className="size-5 md:size-6" />
                    </button>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void navigate('/')}
                      className="flex items-center gap-2 rounded-xl hover:opacity-85 transition"
                    >
                      <BrandLogo />
                    </button>
                    <h1 className="sr-only">{title}</h1>
                  </div>
                </div>

                {/* Fixed Center Navigation Tabs (Pinned to Dead-Center on Desktop PC) */}
                {role ? (
                  <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1 bg-[#F4F4F5] p-1 rounded-full border border-[#E1E2E4] shadow-2xs">
                    {navItems[role].map((item) => {
                      const selected = item.id === activeNav;
                      const IconComponent = item.Icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void navigate(item.path)}
                          className={cn(
                            'flex items-center justify-center gap-2 h-9 min-w-[104px] px-3.5 rounded-full text-xs md:text-sm font-bold transition-[color,background-color,box-shadow] duration-150',
                            selected
                              ? 'bg-[#005EEB] text-white shadow-xs'
                              : 'text-[#70737C] hover:text-[#171719] hover:bg-white',
                          )}
                        >
                          <IconComponent
                            className={cn(
                              'size-4 shrink-0',
                              selected ? 'text-white' : 'text-[#70737C]',
                            )}
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <SiteMenu showProjectLink={showProjectLink} />
              </div>
            </header>

            {/* Main Content Area (Full Width Responsive) */}
            <div className={cn('w-full max-w-7xl mx-auto flex-1 p-6 md:p-8', contentClassName)}>
              {children}
            </div>
          </section>
        </main>
      )}
    </>
  );
}

const navItems = {
  senior: [
    { id: 'database', label: '프로젝트', path: '/senior/project-database', Icon: Briefcase },
    { id: 'home', label: '홈', path: '/senior', Icon: Home },
    { id: 'proposals', label: '내 제안', path: '/senior/proposals', Icon: Send },
    { id: 'profile', label: '내 정보', path: '/senior/profile', Icon: User },
  ],
  company: [
    { id: 'database', label: '프로젝트', path: '/company/project-database', Icon: FolderKanban },
    { id: 'home', label: '홈', path: '/company', Icon: Home },
    { id: 'proposals', label: '받은 제안', path: '/company/proposals', Icon: Inbox },
    { id: 'profile', label: '내 정보', path: '/company/profile', Icon: Building2 },
  ],
} as const;

function BottomNav({
  active,
  forceShow,
  role,
}: {
  active?: SeniorNav | CompanyNav;
  forceShow?: boolean;
  role: Role;
}) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label={`${role === 'senior' ? '인재' : '회사'} 주요 메뉴`}
      className={cn(
        'w-full shrink-0 border-t border-[#E1E2E4] bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg z-40',
        forceShow ? 'flex' : 'flex md:hidden',
      )}
    >
      <div className="flex items-center justify-around w-full">
        {navItems[role].map((item) => {
          const selected = item.id === active;
          const IconComponent = item.Icon;
          return (
            <button
              aria-current={selected ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[12px] font-medium transition cursor-pointer',
                selected ? 'font-bold text-[#005EEB]' : 'text-[#70737C] hover:text-[#171719]',
              )}
              key={item.id}
              onClick={() => void navigate(item.path)}
              type="button"
            >
              <IconComponent
                className={cn(
                  'size-5 transition-transform',
                  selected ? 'scale-110 text-[#005EEB]' : 'text-[#878A93]',
                )}
              />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function StepProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold tracking-wide text-[#171719]">경험 등록</span>
        <span className="rounded-full bg-[#EAF2FE] px-2.5 py-0.5 text-[11px] font-bold text-[#005EEB] shadow-2xs">
          {current}/{total} 단계
        </span>
      </div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[#E1E2E4]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#005EEB] to-[#3385FF] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  role?: Role;
  secondary?: boolean;
};

export function ActionButton({
  className,
  role = 'senior',
  secondary,
  ...props
}: ActionButtonProps) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  return (
    <button
      className={cn(
        'flex w-full items-center justify-center rounded-xl font-bold leading-none transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 select-none active:scale-[0.98]',
        isMobile ? 'h-[50px] min-h-[50px] px-5 text-[15px]' : 'h-14 min-h-14 px-6 text-[16px]',
        secondary
          ? 'border border-[#E1E2E4] bg-white text-[#171719] shadow-2xs hover:bg-[#F7F7F8] hover:border-[#C2C4C8] hover:text-[#005EEB] active:bg-[#F4F4F5]'
          : role === 'company'
            ? 'border border-[#005EEB] bg-[#005EEB] text-white shadow-[0_4px_14px_rgba(0,94,235,0.25)] hover:bg-[#0054D1] active:bg-[#0047B3]'
            : 'border border-[#005EEB] bg-[#005EEB] text-white shadow-[0_4px_14px_rgba(0,94,235,0.25)] hover:bg-[#0054D1] active:bg-[#0047B3]',
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  children,
  onClick,
  selected,
}: {
  children: ReactNode;
  onClick?: () => void;
  role?: Role;
  selected?: boolean;
}) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const Element = onClick ? 'button' : 'span';
  return (
    <Element
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        'flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-bold leading-none transition-all duration-150 break-keep select-none',
        isMobile ? 'h-[38px] min-h-[38px] px-3.5 text-[13px]' : 'h-10 min-h-10 px-4 text-[14px]',
        onClick ? 'cursor-pointer active:scale-95' : 'cursor-default',
        selected
          ? 'border border-[#005EEB] bg-[#005EEB] text-white shadow-[0_2px_8px_rgba(0,94,235,0.25)]'
          : onClick
            ? 'border border-[#E1E2E4] bg-white text-[#70737C] hover:border-[#005EEB]/40 hover:text-[#171719] hover:bg-[#F7F7F8]'
            : 'border border-[#E1E2E4] bg-[#F7F7F8] text-[#70737C]',
      )}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Element>
  );
}

export type Project = {
  action?: string;
  company: string;
  meta: string;
  title: string;
};

export function ProjectCard({ onClick, project }: { onClick?: () => void; project: Project }) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  const parts = project.meta.split(' · ');
  const statusLabels = ['검토 중', '연락 받음', '검토 전', '공개 중', '연락함', '마감'];
  const companyIsStatus = statusLabels.includes(project.company.trim());
  const isStatusMeta = parts.length > 1 && statusLabels.includes(parts[0]!.trim());
  const statusText = companyIsStatus
    ? project.company.trim()
    : isStatusMeta
      ? parts[0]!.trim()
      : null;
  const detailParts = (isStatusMeta ? parts.slice(1) : parts).filter(Boolean);
  const actionLabel = (project.action ?? '상세 보기').replace(/\s*→\s*$/, '');

  const content = (
    <div
      className={cn(
        'flex w-full gap-3',
        isMobile ? 'flex-col items-stretch' : 'flex-row items-center justify-between',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start text-left">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {!companyIsStatus ? (
              <span
                className={cn(
                  'truncate font-bold text-[#171719]',
                  isMobile ? 'text-[14px]' : 'text-[16px]',
                )}
              >
                {project.company}
              </span>
            ) : null}
            {statusText ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-1 font-bold shadow-2xs',
                  isMobile ? 'text-[11.5px]' : 'text-[13px]',
                  statusText === '연락 받음' || statusText === '연락함'
                    ? 'bg-[#D9FFE6] text-[#00BF40] border-[#A3F7BF]'
                    : statusText === '공개 중'
                      ? 'bg-[#EAF2FE] text-[#005EEB] border-[#C9DEFE]'
                      : 'bg-[#FFF0E6] text-[#FF5E00] border-[#FFD6B8]',
                )}
              >
                <span aria-hidden="true" className="mr-1 text-[8px]">
                  ●
                </span>
                {statusText}
              </span>
            ) : null}
          </div>
          {isMobile ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-bold text-[#005EEB]">
              {actionLabel}
              <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2.5} />
            </span>
          ) : null}
        </div>

        <strong
          className={cn(
            'text-left font-bold leading-snug text-[#171719] transition-colors group-hover:text-[#005EEB]',
            isMobile ? 'mt-2.5 text-[17px]' : 'mt-2 text-[22px]',
          )}
        >
          {project.title}
        </strong>

        {isMobile ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {detailParts.map((part, index) => (
              <span
                className="rounded-md bg-[#F4F4F5] px-2 py-1 text-[11.5px] font-medium leading-4 text-[#70737C]"
                key={`${part}-${index}`}
              >
                {isStatusMeta && index === 0 ? `제안일 ${part}` : part}
              </span>
            ))}
          </div>
        ) : (
          <span className="mt-2 text-left text-[16px] font-medium text-[#70737C]">
            {isStatusMeta ? `제안일: ${detailParts.join(' · ')}` : project.meta}
          </span>
        )}
      </div>

      {!isMobile ? (
        <div className="flex shrink-0 items-center justify-end md:w-auto">
          <span className="inline-flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#E1E2E4] bg-white px-5 text-[14px] font-bold leading-none text-[#005EEB] shadow-2xs transition-all group-hover:border-[#005EEB] group-hover:bg-[#005EEB] group-hover:text-white">
            {actionLabel}
            <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2.5} />
          </span>
        </div>
      ) : null}
    </div>
  );

  const classes = cn(
    'group flex w-full flex-col rounded-2xl border border-[#E1E2E4] bg-white shadow-xs transition-all duration-200 hover:border-[#005EEB]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:scale-[0.998]',
    isMobile ? 'rounded-[18px] p-4' : 'p-6',
  );

  return onClick ? (
    <button className={classes} onClick={onClick} type="button">
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function SummaryCard({
  actionHint,
  caption,
  interactiveLabel,
  label,
  onClick,
  value,
}: {
  actionHint?: string;
  caption?: string;
  interactiveLabel?: string;
  label: string;
  onClick?: () => void;
  role?: Role;
  value: string;
}) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  const classes = cn(
    'flex flex-1 flex-col justify-between rounded-[20px] border border-[#E1E2E4] bg-white shadow-2xs text-left min-w-0 overflow-hidden h-full',
    onClick &&
      'cursor-pointer transition hover:-translate-y-px hover:shadow-md hover:border-[#005EEB]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EEB] focus-visible:ring-offset-2',
    isMobile ? 'min-h-[124px] p-3.5 sm:p-4' : 'min-h-[148px] p-5 md:p-6',
  );
  const content = (
    <>
      <span className="flex items-start justify-between gap-2 min-w-0">
        <span
          className={cn(
            'font-medium text-[#70737C] min-w-0 truncate',
            isMobile ? 'text-[13px]' : 'text-[16px]',
          )}
        >
          {label}
        </span>
        {onClick ? (
          <span aria-hidden="true" className="text-[#005EEB]">
            →
          </span>
        ) : null}
      </span>
      <div className="mt-auto min-w-0">
        <strong
          className={cn(
            'block font-extrabold tracking-tight text-[#171719] truncate',
            isMobile ? 'text-[25px] sm:text-[27px]' : 'text-[34px]',
          )}
        >
          {value}
        </strong>
        <span
          className={cn(
            'mt-1 block font-medium leading-4 text-[#878A93] whitespace-nowrap truncate min-w-0 text-[11px] sm:text-[11.5px] md:text-[12.5px] min-h-[16px]',
          )}
          title={caption || ''}
        >
          {caption || '\u00A0'}
        </span>
        {actionHint ? (
          <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#005EEB]">
            {actionHint} <ChevronRight aria-hidden="true" className="size-3" />
          </span>
        ) : null}
      </div>
    </>
  );

  return onClick ? (
    <button
      aria-label={interactiveLabel ?? `${label} ${value} 보기`}
      className={classes}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function InfoPanel({ children, label }: { children: ReactNode; label: string }) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-2xl border border-[#E1E2E4] bg-white shadow-2xs',
        isMobile ? 'gap-2.5 p-4' : 'gap-3 p-6',
      )}
    >
      <strong
        className={cn('font-bold text-[#171719]', isMobile ? 'text-[15px]' : 'text-[18px]')}
      >
        {label}
      </strong>
      <div
        className={cn(
          'font-medium text-[#171719]/90',
          isMobile ? 'text-[15.5px] leading-6' : 'text-[18px] leading-8',
        )}
      >
        {children}
      </div>
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ className, label, ...props }: FieldProps) {
  return (
    <label className="flex w-full flex-col gap-1.5 font-bold text-[#171719] text-[13px] md:text-sm">
      <span>{label}</span>
      <input
        className={cn(
          'w-full rounded-xl border border-[#E1E2E4] bg-white px-3.5 font-medium text-[#171719] outline-none placeholder:text-[#878A93] focus:border-[#005EEB] focus:ring-2 focus:ring-[#005EEB]/20 shadow-2xs transition-all h-[46px] md:h-12 text-[13.5px] md:text-sm',
          className,
        )}
        {...props}
      />
    </label>
  );
}

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function TextAreaField({ className, label, ...props }: TextAreaFieldProps) {
  return (
    <label className="flex w-full flex-col gap-1.5 font-bold text-[#171719] text-[13px] md:text-sm">
      <span>{label}</span>
      <textarea
        className={cn(
          'w-full resize-none rounded-xl border border-[#E1E2E4] bg-white p-3.5 font-medium text-[#171719] outline-none placeholder:text-[#878A93] focus:border-[#005EEB] focus:ring-2 focus:ring-[#005EEB]/20 shadow-2xs transition-all h-26 md:h-28 text-[13.5px] md:text-sm leading-relaxed',
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit rounded-xl border border-[#C9DEFE] bg-[#EAF2FE] px-3.5 py-1.5 text-[13px] md:text-[15px] font-bold text-[#005EEB]">
      ● {children}
    </span>
  );
}

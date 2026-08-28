import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Home,
  Inbox,
  Monitor,
  Send,
  Smartphone,
  User,
} from 'lucide-react';
import { createContext, useContext, useEffect, type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';

import { cn } from '@/lib/utils';

export type Role = 'senior' | 'company';
export type SeniorNav = 'home' | 'projects' | 'database' | 'proposals' | 'profile';
export type CompanyNav = 'home' | 'projects' | 'database' | 'proposals' | 'profile';

export type ViewportMode = 'pc' | 'mobile';

type ViewportContextType = {
  mode: ViewportMode;
  setMode: (mode: ViewportMode) => void;
};

const ViewportContext = createContext<ViewportContextType>({
  mode: 'pc',
  setMode: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useViewportMode = () => useContext(ViewportContext);

export function ViewportProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewportMode>(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileUA =
        /iphone|ipad|ipod|android|blackberry|mini|windows\sphone|palm|smartphone|tablet|iemobile|mobi/i.test(
          userAgent,
        );
      const isSmallScreen = window.innerWidth < 768;
      if (isMobileUA || isSmallScreen) {
        return 'mobile';
      }
      const saved = localStorage.getItem('eojob_viewport_mode');
      if (saved === 'pc' || saved === 'mobile') return saved;
    }
    return 'pc';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileUA =
        /iphone|ipad|ipod|android|blackberry|mini|windows\sphone|palm|smartphone|tablet|iemobile|mobi/i.test(
          userAgent,
        );
      if (isMobileUA || window.innerWidth < 768) {
        setModeState('mobile');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setMode = (newMode: ViewportMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('eojob_viewport_mode', newMode);
    }
  };

  return <ViewportContext.Provider value={{ mode, setMode }}>{children}</ViewportContext.Provider>;
}

type MobilePageProps = {
  activeNav?: SeniorNav | CompanyNav;
  backTo?: string;
  children: ReactNode;
  contentClassName?: string;
  role?: Role;
  showBack?: boolean;
  title: string;
};

export function MobilePage({
  activeNav,
  backTo,
  children,
  contentClassName,
  role,
  showBack = Boolean(backTo),
  title,
}: MobilePageProps) {
  const navigate = useNavigate();
  const { mode: viewportMode, setMode: setViewportMode } = useViewportMode();

  const isMobileMode = viewportMode === 'mobile';

  return (
    <>
      {isMobileMode ? (
        <main className="h-dvh max-h-dvh overflow-hidden bg-[#F7F3EA] text-[#17212B] sm:flex sm:items-center sm:justify-center sm:p-6">
          <section className="mx-auto flex h-dvh sm:h-[844px] w-full max-w-full sm:max-w-[430px] flex-col overflow-hidden border-[#E0D9C8] bg-[#F7F3EA] shadow-2xl sm:rounded-[28px] sm:border relative">
            {/* Top Header Bar (Hidden on Mobile Screens, Visible only on PC Simulator) */}
            <header className="hidden sm:flex h-14 shrink-0 items-center justify-between border-b border-[#E0D9C8] bg-white px-3 shadow-2xs">
              <div className="flex items-center gap-2">
                {showBack ? (
                  <button
                    aria-label="이전 화면으로 돌아가기"
                    className="-ml-1 flex size-8 items-center justify-center rounded-full text-[#17212B] transition hover:bg-[#F7F3EA]"
                    onClick={() => {
                      if (backTo) void navigate(backTo);
                      else void navigate(-1);
                    }}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="size-5" />
                  </button>
                ) : null}

                <div className="flex items-center gap-1.5">
                  <img src="/logo_icon.png" alt="이어잡" className="size-5 object-contain" />
                  <h1 className="text-[17px] font-extrabold tracking-tight text-[#17212B]">
                    {title}
                  </h1>
                </div>
              </div>

              {/* Mode Switcher Toggle Pill for Mobile View (Hidden on Smartphones) */}
              <div className="flex items-center gap-0.5 bg-[#FAF7F2] p-0.5 rounded-full border border-[#E0D9C8]">
                <button
                  type="button"
                  onClick={() => setViewportMode('pc')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition',
                    !isMobileMode
                      ? 'bg-[#17212B] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-[#17212B] hover:bg-white',
                  )}
                >
                  <Monitor className="size-3" />
                  <span>PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition',
                    isMobileMode
                      ? 'bg-[#17212B] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-[#17212B] hover:bg-white',
                  )}
                >
                  <Smartphone className="size-3" />
                  <span>모바일</span>
                </button>
              </div>
            </header>

            {/* Content Container */}
            <div className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full px-4 py-4', contentClassName)}>
              {children}
            </div>

            {/* Bottom Navigation */}
            {role && activeNav ? <BottomNav active={activeNav} role={role} forceShow /> : null}
          </section>
        </main>
      ) : !role ? (
        /* Unauthenticated / Login / Signup Screen: Desktop Card Frame Layout */
        <main className="min-h-dvh bg-[#F7F3EA] text-[#17212B] sm:p-4 md:p-6 lg:p-10 sm:flex sm:items-center sm:justify-center">
          <section className="mx-auto flex w-full max-w-full md:max-w-5xl lg:max-w-6xl xl:max-w-7xl flex-col overflow-hidden border-[#E0D9C8] bg-[#F7F3EA] shadow-2xl sm:rounded-[28px] sm:border min-h-[640px] md:min-h-[740px] lg:min-h-[820px]">
            {/* Header (Responsive: Desktop PC Top Navbar + View Mode Switcher) */}
            <header className="flex h-14 md:h-18 shrink-0 items-center justify-between border-b border-[#E0D9C8] bg-white px-4 md:px-7 shadow-2xs">
              <div className="flex items-center gap-3">
                {showBack ? (
                  <button
                    aria-label="이전 화면으로 돌아가기"
                    className="-ml-1 flex size-8 md:size-9 items-center justify-center rounded-full text-[#17212B] transition hover:bg-[#F7F3EA] hover:scale-105 active:scale-95"
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
                    onClick={() => void navigate('/login')}
                    className="flex items-center gap-2 rounded-xl hover:opacity-85 transition"
                  >
                    <img
                      src="/logo_text.png"
                      alt="이어잡"
                      className="hidden md:block h-[21px] w-auto object-contain"
                    />
                    <img
                      src="/logo_icon.png"
                      alt="이어잡"
                      className="md:hidden size-[17px] object-contain"
                    />
                  </button>
                  <h1 className="sr-only">{title}</h1>
                </div>
              </div>

              {/* Viewport Mode Switcher */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-full border border-[#E0D9C8] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewportMode('pc')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all',
                      !isMobileMode
                        ? 'bg-[#17212B] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#17212B] hover:bg-white',
                    )}
                  >
                    <Monitor className="size-3.5" />
                    <span className="hidden sm:inline">PC 웹</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all',
                      isMobileMode
                        ? 'bg-[#17212B] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#17212B] hover:bg-white',
                    )}
                  >
                    <Smartphone className="size-3.5" />
                    <span className="hidden sm:inline">모바일</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Content Container */}
            <div className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full', contentClassName)}>{children}</div>
          </section>
        </main>
      ) : (
        /* Logged-In Service Pages: Full Version Responsive Web Layout */
        <main className="min-h-dvh bg-[#FAF7F2] text-[#17212B] flex flex-col w-full">
          <section className="w-full min-h-dvh flex flex-col bg-[#FAF7F2]">
            {/* Top Navbar */}
            <header className="relative w-full h-16 md:h-18 shrink-0 items-center justify-between border-b border-[#E0D9C8] bg-white px-6 md:px-12 shadow-2xs sticky top-0 z-30 flex">
              <div className="flex items-center gap-4">
                {showBack ? (
                  <button
                    aria-label="이전 화면으로 돌아가기"
                    className="-ml-1 flex size-8 md:size-9 items-center justify-center rounded-full text-[#17212B] transition hover:bg-[#FAF7F2] hover:scale-105 active:scale-95"
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
                    onClick={() => void navigate(role === 'company' ? '/company' : '/senior')}
                    className="flex items-center gap-2 rounded-xl hover:opacity-85 transition"
                  >
                    <img
                      src="/logo_text.png"
                      alt="이어잡"
                      className="hidden md:block h-[22px] w-auto object-contain"
                    />
                    <img
                      src="/logo_icon.png"
                      alt="이어잡"
                      className="md:hidden size-[20px] object-contain"
                    />
                  </button>
                  <h1 className="sr-only">{title}</h1>
                </div>
              </div>

              {/* Fixed Center Navigation Tabs (Pinned to Dead-Center on Desktop PC) */}
              {role ? (
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1 bg-[#FAF7F2] p-1.5 rounded-full border border-[#E0D9C8] shadow-2xs">
                  {navItems[role].map((item) => {
                    const selected = item.id === activeNav;
                    const IconComponent = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void navigate(item.path)}
                        className={cn(
                          'flex items-center justify-center gap-2 h-9 min-w-[104px] px-3.5 rounded-full text-xs md:text-sm font-extrabold transition-all',
                          selected
                            ? 'bg-[#F06B4F] text-white shadow-xs'
                            : 'text-slate-600 hover:text-[#17212B] hover:bg-white',
                        )}
                      >
                        <IconComponent
                          className={cn('size-4 shrink-0', selected ? 'text-white' : 'text-slate-500')}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Right Mode Switcher */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-full border border-[#E0D9C8] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewportMode('pc')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all',
                      !isMobileMode
                        ? 'bg-[#17212B] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#17212B] hover:bg-white',
                    )}
                  >
                    <Monitor className="size-3.5" />
                    <span className="hidden sm:inline">PC 웹</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all',
                      isMobileMode
                        ? 'bg-[#17212B] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#17212B] hover:bg-white',
                    )}
                  >
                    <Smartphone className="size-3.5" />
                    <span className="hidden sm:inline">모바일</span>
                  </button>
                </div>
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
  active: SeniorNav | CompanyNav;
  forceShow?: boolean;
  role: Role;
}) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label={`${role === 'senior' ? '인재' : '회사'} 주요 메뉴`}
      className={cn(
        'sticky bottom-0 z-40 flex h-[72px] shrink-0 border-t border-[#E0D9C8] bg-white px-2 py-2 shadow-lg pb-[env(safe-area-inset-bottom)]',
        forceShow ? 'w-full' : 'md:hidden',
      )}
    >
      {navItems[role].map((item) => {
        const selected = item.id === active;
        const IconComponent = item.Icon;
        return (
          <button
            aria-current={selected ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[12px] font-medium transition',
              selected ? 'font-extrabold text-[#F06B4F]' : 'text-slate-400 hover:text-[#17212B]',
            )}
            key={item.id}
            onClick={() => void navigate(item.path)}
            type="button"
          >
            <IconComponent
              className={cn(
                'size-5 transition-transform',
                selected ? 'scale-110 text-[#F06B4F]' : 'text-slate-400',
              )}
            />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function StepProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-extrabold tracking-wide text-[#17212B]">경험 등록</span>
        <span className="rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-2.5 py-0.5 text-[11px] font-extrabold text-[#173F3A] shadow-2xs">
          {current}/{total} 단계
        </span>
      </div>
      <div className="h-2 w-40 overflow-hidden rounded-full bg-[#E5DFC9]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#173F3A] to-[#F06B4F] transition-all duration-300"
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
        'flex w-full items-center justify-center rounded-full font-extrabold leading-none transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
        isMobile ? 'h-[50px] min-h-[50px] px-5 text-[15px]' : 'h-14 min-h-14 px-6 text-[16px]',
        secondary
          ? 'border border-[#D4CBB8] bg-gradient-to-b from-white via-[#FAF7F2] to-[#F2EDE2] text-[#17212B] shadow-[0_2px_6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-[#173F3A] hover:from-white hover:to-[#E8F2EF] hover:text-[#173F3A] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(23,63,58,0.15)] active:translate-y-0 active:scale-[0.98]'
          : role === 'company'
            ? 'border border-[#D85A3F] bg-gradient-to-b from-[#F57B61] via-[#F06B4F] to-[#D85A3F] text-white shadow-[0_4px_14px_rgba(240,107,79,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#F78B73] hover:via-[#F2755B] hover:to-[#E06146] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(240,107,79,0.4)] active:translate-y-0 active:scale-[0.98]'
            : 'border border-[#173F3A] bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-white shadow-[0_4px_14px_rgba(23,63,58,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(23,63,58,0.4)] active:translate-y-0 active:scale-[0.98]',
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
        'flex items-center justify-center whitespace-nowrap rounded-full font-extrabold leading-none transition-all duration-200',
        isMobile ? 'h-[42px] min-h-[42px] px-4 text-[13.5px]' : 'h-11 min-h-11 px-5 text-[14px]',
        onClick ? 'cursor-pointer' : 'cursor-default select-none',
        selected
          ? 'border border-[#173F3A] bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-white shadow-[0_4px_12px_rgba(23,63,58,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(23,63,58,0.4)] active:translate-y-0 active:scale-[0.98]'
          : onClick
            ? 'border border-[#D4CBB8] bg-gradient-to-b from-white to-[#FAF7F2] text-[#17212B] shadow-[0_2px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] hover:border-[#173F3A] hover:from-[#F4FAF8] hover:to-[#E5F2EE] hover:text-[#173F3A] hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(23,63,58,0.15)] active:translate-y-0 active:scale-[0.98]'
            : 'border border-[#E0D9C8] bg-[#FAF7F2] text-slate-700 shadow-none',
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
                  'truncate font-extrabold text-[#173F3A]',
                  isMobile ? 'text-[14px]' : 'text-[16px]',
                )}
              >
                {project.company}
              </span>
            ) : null}
            {statusText ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-1 font-extrabold shadow-2xs',
                  isMobile ? 'text-[11.5px]' : 'text-[13px]',
                  statusText === '연락 받음' || statusText === '연락함'
                    ? 'bg-[#DDEBE7] text-[#173F3A] border-[#BBD5CE]'
                    : statusText === '공개 중'
                      ? 'bg-[#EBF5FF] text-[#1D4ED8] border-[#BFDBFE]'
                      : 'bg-[#FFF2EE] text-[#F06B4F] border-[#FCD8CF]',
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
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-extrabold text-[#F06B4F]">
              {actionLabel}
              <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2.5} />
            </span>
          ) : null}
        </div>

        <strong
          className={cn(
            'text-left font-extrabold leading-snug text-[#17212B] transition-colors group-hover:text-[#F06B4F]',
            isMobile ? 'mt-2.5 text-[17px]' : 'mt-2 text-[22px]',
          )}
        >
          {project.title}
        </strong>

        {isMobile ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {detailParts.map((part, index) => (
              <span
                className="rounded-md bg-[#F7F3EA] px-2 py-1 text-[11.5px] font-bold leading-4 text-[#4B5768]"
                key={`${part}-${index}`}
              >
                {isStatusMeta && index === 0 ? `제안일 ${part}` : part}
              </span>
            ))}
          </div>
        ) : (
          <span className="mt-2 text-left text-[16px] font-semibold text-slate-500">
            {isStatusMeta ? `제안일: ${detailParts.join(' · ')}` : project.meta}
          </span>
        )}
      </div>

      {!isMobile ? (
        <div className="flex shrink-0 items-center justify-end md:w-auto">
          <span className="inline-flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#E0D9C8] bg-[#FAF7F2] px-5 text-[14px] font-extrabold leading-none text-[#F06B4F] shadow-2xs transition-all group-hover:border-[#F06B4F] group-hover:bg-[#F06B4F] group-hover:text-white">
            {actionLabel}
            <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2.5} />
          </span>
        </div>
      ) : null}
    </div>
  );

  const classes = cn(
    'group flex w-full flex-col rounded-2xl border border-[#E0D9C8] bg-white shadow-xs transition-all duration-200 hover:border-[#F06B4F]/50 hover:shadow-md active:scale-[0.998]',
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
    'flex flex-1 flex-col rounded-[20px] border border-[#E0D9C8] bg-white shadow-xs text-left min-w-0 overflow-hidden',
    onClick &&
      'cursor-pointer transition hover:-translate-y-px hover:border-[#BBD5CE] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2',
    isMobile
      ? caption
        ? 'min-h-[128px] p-3.5 sm:p-4'
        : 'h-[110px] p-3.5 sm:p-4'
      : caption
        ? 'min-h-[152px] p-6'
        : 'h-[136px] p-6',
  );
  const content = (
    <>
      <span className="flex items-start justify-between gap-2 min-w-0">
        <span className={cn('font-bold text-[#4B5768] min-w-0 truncate', isMobile ? 'text-[13.5px]' : 'text-[17px]')}>
          {label}
        </span>
        {onClick ? <span aria-hidden="true" className="text-[#173F3A]">→</span> : null}
      </span>
      <div className="mt-auto min-w-0">
        <strong
          className={cn(
            'block font-extrabold tracking-tight text-[#173F3A] truncate',
            isMobile ? 'text-[25px] sm:text-[27px]' : 'text-[38px]',
          )}
        >
          {value}
        </strong>
        {caption ? (
          <span
            className={cn(
              'mt-1 block font-semibold leading-4 sm:leading-5 text-slate-400 break-keep min-w-0 line-clamp-2',
              isMobile ? 'text-[11px] sm:text-[11.5px]' : 'text-[13px]',
            )}
          >
            {caption}
          </span>
        ) : null}
        {actionHint ? (
          <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-extrabold text-[#173F3A]">
            {actionHint} <ChevronRight aria-hidden="true" className="size-3.5" />
          </span>
        ) : null}
      </div>
    </>
  );

  return onClick ? (
    <button aria-label={interactiveLabel ?? `${label} ${value} 보기`} className={classes} onClick={onClick} type="button">
      {content}
    </button>
  ) : (
    <div className={classes}>
      {content}
    </div>
  );
}

export function InfoPanel({ children, label }: { children: ReactNode; label: string }) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-xl border border-[#E0D9C8] bg-white shadow-xs',
        isMobile ? 'gap-2.5 p-4' : 'gap-3 p-6',
      )}
    >
      <strong
        className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-[15px]' : 'text-[18px]')}
      >
        {label}
      </strong>
      <div
        className={cn(
          'font-medium text-[#17212B]/85',
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
    <label className="flex w-full flex-col gap-1.5 font-extrabold text-[#173F3A] text-[13px] md:text-sm">
      <span>{label}</span>
      <input
        className={cn(
          'w-full rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-3.5 font-medium text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:bg-white focus:ring-2 focus:ring-[#173F3A]/15 shadow-2xs transition-all h-[46px] md:h-12 text-[13.5px] md:text-sm',
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
    <label className="flex w-full flex-col gap-1.5 font-extrabold text-[#173F3A] text-[13px] md:text-sm">
      <span>{label}</span>
      <textarea
        className={cn(
          'w-full resize-none rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] p-3.5 font-medium text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:bg-white focus:ring-2 focus:ring-[#173F3A]/15 shadow-2xs transition-all h-26 md:h-28 text-[13.5px] md:text-sm leading-relaxed',
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit rounded-xl border border-[#BBD5CE] bg-[#DDEBE7] px-3.5 py-1.5 text-[13px] md:text-[16px] font-extrabold text-[#173F3A]">
      ● {children}
    </span>
  );
}

import {
  Briefcase,
  Building2,
  ChevronLeft,
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
export type SeniorNav = 'home' | 'projects' | 'proposals' | 'profile';
export type CompanyNav = 'home' | 'projects' | 'proposals' | 'profile';

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

  return (
    <ViewportContext.Provider value={{ mode, setMode }}>
      {children}
    </ViewportContext.Provider>
  );
}

const roleStyles = {
  senior: {
    accent: 'text-[#173F3A]',
    background:
      'bg-gradient-to-t from-[#12332F] via-[#173F3A] to-[#1E4E48] hover:from-[#0E2825] hover:to-[#173F3A]',
  },
  company: {
    accent: 'text-[#173F3A]',
    background:
      'bg-gradient-to-t from-[#12332F] via-[#173F3A] to-[#21544E] hover:from-[#0E2825] hover:to-[#173F3A]',
  },
};

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
        <main className="min-h-dvh bg-[#F7F3EA] text-[#17212B] sm:flex sm:items-center sm:justify-center sm:p-6">
          <section className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden border-[#E0D9C8] bg-[#F7F3EA] shadow-2xl sm:h-[844px] sm:min-h-0 sm:rounded-[28px] sm:border relative">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E0D9C8] bg-white px-3 shadow-2xs">
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
              <div className="hidden sm:flex items-center gap-0.5 bg-[#FAF7F2] p-0.5 rounded-full border border-[#E0D9C8]">
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
            <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4', contentClassName)}>
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
                    className="flex items-center gap-2 rounded-xl hover:opacity-85 transition -translate-y-[2.5px]"
                  >
                    <img
                      src="/logo_text.png"
                      alt="이어잡"
                      className="hidden md:block h-[25px] w-auto object-contain"
                    />
                    <img
                      src="/logo_icon.png"
                      alt="이어잡"
                      className="md:hidden size-5 object-contain"
                    />
                  </button>
                  <span className="hidden md:inline-block text-slate-300 font-light select-none text-xs translate-y-[0.5px]">|</span>
                  <h1 className="text-[16px] md:text-[18px] font-extrabold tracking-tight text-[#17212B] translate-y-[1px]">
                    {title}
                  </h1>
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
            <div className={cn('min-h-0 flex-1 overflow-y-auto', contentClassName)}>{children}</div>
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
                      className="hidden md:block h-[26px] w-auto object-contain"
                    />
                    <img
                      src="/logo_icon.png"
                      alt="이어잡"
                      className="md:hidden size-6 object-contain"
                    />
                  </button>
                  <span className="hidden md:inline-block text-slate-300 font-light select-none text-sm">|</span>
                  <h1 className="text-base md:text-lg font-extrabold tracking-tight text-[#17212B]">
                    {title}
                  </h1>
                </div>
              </div>

              {/* Fixed Center Navigation Tabs (Pinned to Dead-Center on Desktop PC) */}
              {role ? (
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 bg-[#FAF7F2] p-1.5 rounded-full border border-[#E0D9C8] shadow-2xs">
                  {navItems[role].map((item) => {
                    const selected = item.id === activeNav;
                    const IconComponent = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void navigate(item.path)}
                        className={cn(
                          'flex items-center gap-2 px-4.5 py-2 rounded-full text-xs md:text-sm font-extrabold transition-all',
                          selected
                            ? 'bg-[#F06B4F] text-white shadow-xs'
                            : 'text-slate-600 hover:text-[#17212B] hover:bg-white',
                        )}
                      >
                        <IconComponent className={cn('size-4', selected ? 'text-white' : 'text-slate-500')} />
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
    { id: 'home', label: '홈', path: '/senior', Icon: Home },
    { id: 'projects', label: '프로젝트', path: '/senior/projects', Icon: Briefcase },
    { id: 'proposals', label: '내 제안', path: '/senior/proposals', Icon: Send },
    { id: 'profile', label: '내 정보', path: '/senior/profile', Icon: User },
  ],
  company: [
    { id: 'home', label: '홈', path: '/company', Icon: Home },
    { id: 'projects', label: '프로젝트 관리', path: '/company/projects', Icon: FolderKanban },
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
        'flex h-16 shrink-0 border-t border-[#E0D9C8] bg-white px-2 py-1.5 shadow-lg',
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
              selected
                ? 'font-extrabold text-[#F06B4F]'
                : 'text-slate-400 hover:text-[#17212B]',
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
        <span className="text-[12px] font-extrabold tracking-wide text-[#17212B]">
          경험 등록
        </span>
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
  return (
    <button
      className={cn(
        'flex w-full h-9 items-center justify-center rounded-full px-4 text-xs font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-40 shadow-xs',
        secondary
          ? 'border border-[#E0D9C8] bg-white text-[#17212B] shadow-2xs hover:bg-[#FAF7F2] active:scale-[0.99]'
          : cn(
              roleStyles[role].background,
              'text-white shadow-xs shadow-[#173F3A]/20 hover:shadow-md hover:scale-[1.005] active:scale-[0.995]',
            ),
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
  const Element = onClick ? 'button' : 'span';
  return (
    <Element
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        'flex h-9 md:h-[40px] items-center justify-center rounded-full px-4 text-[13px] md:text-[16px] font-extrabold transition',
        selected
          ? 'border border-[#173F3A] bg-[#173F3A] text-white shadow-xs'
          : 'border border-[#E0D9C8] bg-white text-[#17212B] hover:border-[#173F3A]/40 hover:bg-[#F7F3EA]',
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
  const isStatusMeta =
    parts.length > 1 &&
    ['검토 중', '연락 받음', '검토 전', '공개 중', '연락함', '마감'].includes(parts[0]!.trim());
  const statusText = isStatusMeta ? parts[0]!.trim() : null;
  const detailMeta = isStatusMeta ? parts.slice(1).join(' · ') : project.meta;

  const content = (
    <div className={cn('flex w-full gap-3', isMobile ? 'flex-col items-stretch' : 'flex-row items-center justify-between')}>
      {/* Left / Primary Content Column */}
      <div className="flex flex-col items-start gap-1.5 text-left flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={cn('font-extrabold text-[#173F3A]', isMobile ? 'text-[13px]' : 'text-[16px]')}>
            {project.company}
          </span>
          {statusText ? (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full font-extrabold border shadow-2xs',
                isMobile ? 'text-[11px]' : 'text-[13px]',
                statusText === '연락 받음' || statusText === '연락함'
                  ? 'bg-[#DDEBE7] text-[#173F3A] border-[#BBD5CE]'
                  : statusText === '공개 중'
                    ? 'bg-[#EBF5FF] text-[#1D4ED8] border-[#BFDBFE]'
                    : 'bg-[#FFF2EE] text-[#F06B4F] border-[#FCD8CF]',
              )}
            >
              ● {statusText}
            </span>
          ) : null}
        </div>

        <strong className={cn('text-left font-extrabold text-[#17212B] leading-snug group-hover:text-[#F06B4F] transition-colors', isMobile ? 'text-[15px]' : 'text-[22px]')}>
          {project.title}
        </strong>

        <span className={cn('text-left font-semibold text-slate-500', isMobile ? 'text-[12px]' : 'text-[16px]')}>
          {isStatusMeta ? `제안일: ${detailMeta}` : detailMeta}
        </span>
      </div>

      {/* Right Column: Action Button Badge - RIGHT ALIGNED INSIDE BOX CARD WITH UNIFIED H-9 HEIGHT */}
      <div className={cn('flex items-center shrink-0', isMobile ? 'justify-end w-full pt-2 border-t border-[#E0D9C8]/40 mt-1' : 'justify-end md:w-auto pt-0')}>
        <span className={cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#FAF7F2] border border-[#E0D9C8] text-[#F06B4F] font-extrabold group-hover:bg-[#F06B4F] group-hover:text-white group-hover:border-[#F06B4F] transition-all shadow-2xs', isMobile ? 'px-3.5 text-xs' : 'px-5 text-[15px]')}>
          {project.action ?? '프로젝트 보기 →'}
        </span>
      </div>
    </div>
  );

  const classes = cn(
    'group flex w-full flex-col rounded-2xl border border-[#E0D9C8] bg-white shadow-xs transition-all duration-200 hover:border-[#F06B4F]/50 hover:shadow-md active:scale-[0.998]',
    isMobile ? 'p-4' : 'p-6',
  );

  return onClick ? (
    <button className={classes} onClick={onClick} type="button">
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function SummaryCard({ label, value }: { label: string; role?: Role; value: string }) {
  return (
    <div className="flex h-[108px] md:h-34 flex-1 flex-col justify-between rounded-[20px] border border-[#E0D9C8] bg-white p-4 md:p-6 shadow-xs">
      <span className="text-[13px] md:text-[17px] font-bold text-[#4B5768]">{label}</span>
      <strong className="text-[26px] md:text-[38px] font-extrabold tracking-tight text-[#173F3A]">
        {value}
      </strong>
    </div>
  );
}

export function InfoPanel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-xl border border-[#E0D9C8] bg-white p-4 md:p-6 shadow-xs">
      <strong className="text-[14px] md:text-[18px] font-extrabold text-[#17212B]">{label}</strong>
      <div className="text-[14px] md:text-[18px] leading-6 md:leading-8 text-[#17212B]/85 font-medium">{children}</div>
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ className, label, ...props }: FieldProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-[13px] md:text-[17px] font-extrabold text-[#17212B]">
      <span>{label}</span>
      <input
        className={cn(
          'h-12 md:h-14 w-full rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-4 text-[14px] md:text-[18px] text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:bg-white focus:ring-2 focus:ring-[#173F3A]/15 font-medium',
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
    <label className="flex w-full flex-col gap-2 text-[13px] md:text-[17px] font-extrabold text-[#17212B]">
      <span>{label}</span>
      <textarea
        className={cn(
          'h-24 md:h-32 w-full resize-none rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] p-4 text-[14px] md:text-[18px] leading-5 md:leading-7 text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:bg-white focus:ring-2 focus:ring-[#173F3A]/15 font-medium',
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

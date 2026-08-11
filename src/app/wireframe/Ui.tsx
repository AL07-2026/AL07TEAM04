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
                      ? 'bg-[#F06B4F] text-white shadow-2xs'
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
                      ? 'bg-[#F06B4F] text-white shadow-2xs'
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
      ) : (
        <main className="min-h-dvh bg-[#F7F3EA] text-[#17212B] sm:p-4 md:p-6 lg:p-8 sm:flex sm:items-center sm:justify-center">
          <section className="mx-auto flex w-full max-w-full md:max-w-5xl lg:max-w-6xl xl:max-w-7xl flex-col overflow-hidden border-[#E0D9C8] bg-[#F7F3EA] shadow-2xl sm:rounded-[28px] sm:border">
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
                    onClick={() => void navigate(role === 'company' ? '/company' : '/senior')}
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

              {/* Desktop Top Nav Menu */}
              {role && activeNav ? (
                <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1.5 rounded-full border border-[#E0D9C8]">
                  {navItems[role].map((item) => {
                    const selected = item.id === activeNav;
                    const IconComponent = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void navigate(item.path)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold transition-all',
                          selected
                            ? 'bg-[#173F3A] text-white shadow-xs'
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

              {/* Viewport Mode Switcher & Quick Role Switcher */}
              <div className="flex items-center gap-2">
                {/* 2-Mode View Switcher Toggle Pill */}
                <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-full border border-[#E0D9C8] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewportMode('pc')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all',
                      !isMobileMode
                        ? 'bg-[#F06B4F] text-white shadow-2xs'
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
                        ? 'bg-[#F06B4F] text-white shadow-2xs'
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

            {/* Bottom Navigation (Mobile Only) */}
            {role && activeNav ? <BottomNav active={activeNav} role={role} /> : null}
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
    { id: 'profile', label: '내 정보', path: '/basic-profile', Icon: User },
  ],
  company: [
    { id: 'home', label: '홈', path: '/company', Icon: Home },
    { id: 'projects', label: '프로젝트 관리', path: '/company/projects', Icon: FolderKanban },
    { id: 'proposals', label: '받은 제안', path: '/company/proposals', Icon: Inbox },
    { id: 'profile', label: '회사 정보', path: '/company-info', Icon: Building2 },
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
                ? 'font-extrabold text-[#173F3A]'
                : 'text-slate-400 hover:text-[#17212B]',
            )}
            key={item.id}
            onClick={() => void navigate(item.path)}
            type="button"
          >
            <IconComponent
              className={cn(
                'size-5 transition-transform',
                selected ? 'scale-110 text-[#173F3A]' : 'text-slate-400',
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
        'flex h-12 w-full items-center justify-center rounded-full px-4 text-[15px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-40',
        secondary
          ? 'border border-[#E0D9C8] bg-white text-[#17212B] shadow-xs hover:bg-[#F7F3EA]'
          : cn(
              roleStyles[role].background,
              'text-white shadow-md shadow-[#173F3A]/20 hover:shadow-lg hover:scale-[1.008] active:scale-[0.992]',
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
        'flex h-[32px] items-center justify-center rounded-full px-3.5 text-[13px] font-extrabold transition',
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
  const content = (
    <>
      <span className="text-[13px] font-extrabold text-[#173F3A]">{project.company}</span>
      <strong className="text-left text-[17px] font-extrabold text-[#17212B]">{project.title}</strong>
      <span className="text-left text-[13px] font-medium text-[#4B5768]">{project.meta}</span>
      <span className="text-[13px] font-extrabold text-[#F06B4F]">
        {project.action ?? '프로젝트 보기 →'}
      </span>
    </>
  );
  const classes =
    'flex h-40 w-full flex-col items-start gap-2.5 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs';

  return onClick ? (
    <button
      className={cn(classes, 'transition hover:border-[#173F3A]/40 hover:shadow-md')}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function SummaryCard({ label, value }: { label: string; role?: Role; value: string }) {
  return (
    <div className="flex h-[104px] flex-1 flex-col justify-between rounded-[20px] border border-[#E0D9C8] bg-white p-4 shadow-xs">
      <span className="text-[13px] font-semibold text-[#4B5768]">{label}</span>
      <strong className="text-[26px] font-extrabold tracking-tight text-[#173F3A]">
        {value}
      </strong>
    </div>
  );
}

export function InfoPanel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
      <strong className="text-[13px] font-bold text-[#17212B]">{label}</strong>
      <div className="text-[14px] leading-6 text-[#17212B]/85 font-medium">{children}</div>
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ className, label, ...props }: FieldProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-[13px] font-extrabold text-[#17212B]">
      <span>{label}</span>
      <input
        className={cn(
          'h-12 w-full rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-3.5 text-[14px] text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:bg-white focus:ring-2 focus:ring-[#173F3A]/15 font-medium',
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
    <label className="flex w-full flex-col gap-2 text-[13px] font-extrabold text-[#17212B]">
      <span>{label}</span>
      <textarea
        className={cn(
          'h-24 w-full resize-none rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] p-3.5 text-[14px] leading-5 text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:bg-white focus:ring-2 focus:ring-[#173F3A]/15 font-medium',
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit rounded-xl border border-[#BBD5CE] bg-[#DDEBE7] px-3 py-1.5 text-[13px] font-bold text-[#173F3A]">
      ● {children}
    </span>
  );
}

import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  ContactRound,
  FolderKanban,
  Home,
  Inbox,
  LogOut,
  Mail,
  Menu,
  Mic,
  MessageCircle,
  Send,
  UserRound,
  X,
} from 'lucide-react';
import { createContext, useContext, useEffect, type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

export type Role = 'senior' | 'company';
export type SeniorNav = 'home' | 'interview' | 'projects' | 'database' | 'proposals' | 'profile';
export type CompanyNav = 'home' | 'projects' | 'database' | 'proposals' | 'profile';

export type ViewportMode = 'pc' | 'mobile';

const navItems = {
  senior: [
    { id: 'database', label: '프로젝트', path: '/senior/project-database', Icon: Briefcase },
    { id: 'interview', label: 'AI 경험 인터뷰', path: '/senior/experience/interview', Icon: Mic },
    { id: 'proposals', label: '내 제안', path: '/senior/proposals', Icon: Send },
    { id: 'profile', label: '내 정보', path: '/senior/profile', Icon: ContactRound },
  ],
  company: [
    { id: 'database', label: '프로젝트', path: '/company/project-database', Icon: FolderKanban },
    { id: 'home', label: '홈', path: '/company', Icon: Home },
    { id: 'proposals', label: '받은 제안', path: '/company/proposals', Icon: Inbox },
    { id: 'profile', label: '내 정보', path: '/company/profile', Icon: ContactRound },
  ],
} as const;

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

type SiteHeaderProps = {
  activeNav?: SeniorNav | CompanyNav;
  role?: Role;
  showLogout?: boolean;
  showPageTitle?: boolean;
  title: string;
};

export function SiteHeader({
  activeNav,
  role,
  showLogout = true,
  showPageTitle = true,
  title,
}: SiteHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedSupportMenu, setExpandedSupportMenu] = useState<'community' | 'contact' | null>(null);
  const menuRole = user?.role ?? role ?? 'senior';
  const serviceHomePath = menuRole === 'company' ? '/company' : '/senior';

  const moveTo = (path: string, itemId?: string) => {
    setIsMenuOpen(false);
    if (!user && (itemId === 'profile' || itemId === 'proposals')) {
      void navigate('/login');
      return;
    }
    void navigate(path);
  };

  const moveToLogin = async (targetRole: Role) => {
    if (user) await signOut();
    void navigate(`/login?role=${targetRole}`);
  };

  const signOutToLanding = async () => {
    setIsMenuOpen(false);
    setExpandedSupportMenu(null);
    if (user) await signOut();
    void navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full shrink-0 border-b border-[#E0D9C8] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-8">
          <button
            type="button"
            onClick={() => void navigate('/')}
            className="flex min-w-0 items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A]"
            aria-label="이어잡 첫 화면"
          >
            <img src="/logo_text.png" alt="이어잡" className="h-6 w-auto object-contain sm:h-7" />
          </button>

          <nav className="flex items-center gap-1" aria-label="빠른 이동">
            <button
              type="button"
              onClick={() => void moveToLogin('senior')}
              className="grid size-10 place-items-center rounded-md text-[#173F3A] transition-colors hover:bg-[#EDF6F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.97]"
              aria-label="인재로 로그인"
              title="인재로 로그인"
            >
              <UserRound className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void moveToLogin('company')}
              className="grid size-10 place-items-center rounded-md text-[#173F3A] transition-colors hover:bg-[#EDF6F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.97]"
              aria-label="기업으로 로그인"
              title="기업으로 로그인"
            >
              <Building2 className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void navigate(serviceHomePath)}
              className="grid size-10 place-items-center rounded-md text-[#173F3A] transition-colors hover:bg-[#EDF6F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.97]"
              aria-label="서비스 홈"
              title="서비스 홈"
            >
              <Home className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
            {showLogout && user ? (
              <button
                type="button"
                onClick={() => void signOutToLanding()}
                className="grid size-10 place-items-center rounded-md text-[#173F3A] transition-colors hover:bg-[#FFF0EC] hover:text-[#C7503B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.97]"
                aria-label="로그아웃"
                title="로그아웃"
              >
                <LogOut className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="grid size-10 place-items-center rounded-md text-[#173F3A] transition-colors hover:bg-[#EDF6F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.97]"
              aria-expanded={isMenuOpen}
              aria-controls="site-navigation-drawer"
              aria-label="전체 메뉴 열기"
              title="전체 메뉴"
            >
              <Menu className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </nav>
          {showPageTitle ? <h1 className="sr-only">{title}</h1> : null}
        </div>
      </header>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <button
            type="button"
            className="absolute inset-0 bg-[#17212B]/25 backdrop-blur-[1px]"
            onClick={() => setIsMenuOpen(false)}
            aria-label="전체 메뉴 닫기"
          />
          <aside
            id="site-navigation-drawer"
            className="relative flex h-full w-[min(22rem,calc(100vw-1.5rem))] flex-col bg-white shadow-[-18px_0_42px_rgba(23,33,43,0.18)]"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E0D9C8] px-5">
              <img src="/logo_text.png" alt="이어잡" className="h-6 w-auto object-contain" />
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="grid size-10 place-items-center rounded-md text-[#173F3A] transition-colors hover:bg-[#EDF6F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.97]"
                aria-label="전체 메뉴 닫기"
                title="닫기"
              >
                <X className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5" aria-label="주요 메뉴">
              <div className="flex flex-col gap-1.5">
                {navItems[menuRole].map((item) => {
                  const IconComponent = item.Icon;
                  const selected = item.id === activeNav;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => moveTo(item.path, item.id)}
                      className={cn(
                        'flex min-h-14 w-full items-center gap-3.5 rounded-md px-3.5 text-left text-[1.125rem] font-extrabold leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.99] sm:min-h-15 sm:text-[1.25rem]',
                        selected
                          ? 'bg-[#EDF6F2] text-[#173F3A]'
                          : 'text-[#334155] hover:bg-[#F7F3EA] hover:text-[#17212B]',
                      )}
                    >
                      <IconComponent className="size-6 shrink-0 text-[#173F3A]" strokeWidth={1.8} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 border-t border-[#E0D9C8]">
                <button
                  type="button"
                  onClick={() => moveTo('/')}
                  className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-[#E0D9C8] px-3.5 text-left text-[1.125rem] font-extrabold text-[#334155] transition-colors hover:bg-[#F7F3EA] hover:text-[#17212B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] sm:min-h-15 sm:text-[1.25rem]"
                >
                  <span>Brand</span>
                  <ChevronRight className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <div
                  className="border-b border-[#E0D9C8]"
                  onMouseEnter={() => setExpandedSupportMenu('community')}
                  onMouseLeave={() => setExpandedSupportMenu((current) => (current === 'community' ? null : current))}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSupportMenu('community')}
                    aria-expanded={expandedSupportMenu === 'community'}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-3.5 text-left text-[1.125rem] font-extrabold text-[#334155] transition-colors hover:bg-[#F7F3EA] hover:text-[#17212B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] sm:min-h-15 sm:text-[1.25rem]"
                  >
                    <span>Community</span>
                    <ChevronDown
                      className={cn('size-5 shrink-0 transition-transform', expandedSupportMenu === 'community' && 'rotate-180')}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </button>
                  {expandedSupportMenu === 'community' ? (
                    <a
                      href="https://open.kakao.com/o/pCtnwCIi"
                      target="_blank"
                      rel="noreferrer"
                      className="mb-3 flex min-h-12 items-center gap-3 rounded-md bg-[#EDF6F2] px-3.5 text-base font-extrabold text-[#173F3A] transition-colors hover:bg-[#DDEBE7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A]"
                    >
                      <MessageCircle className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      카카오톡 오픈채팅방
                    </a>
                  ) : null}
                </div>
                <div
                  className="border-b border-[#E0D9C8]"
                  onMouseEnter={() => setExpandedSupportMenu('contact')}
                  onMouseLeave={() => setExpandedSupportMenu((current) => (current === 'contact' ? null : current))}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSupportMenu('contact')}
                    aria-expanded={expandedSupportMenu === 'contact'}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-3.5 text-left text-[1.125rem] font-extrabold text-[#334155] transition-colors hover:bg-[#F7F3EA] hover:text-[#17212B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] sm:min-h-15 sm:text-[1.25rem]"
                  >
                    <span>Contact</span>
                    <ChevronDown
                      className={cn('size-5 shrink-0 transition-transform', expandedSupportMenu === 'contact' && 'rotate-180')}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </button>
                  {expandedSupportMenu === 'contact' ? (
                    <a
                      href="mailto:phj1120@gmail.com"
                      className="mb-3 flex min-h-12 items-center gap-3 rounded-md bg-[#FFF0EC] px-3.5 text-base font-extrabold text-[#9E3D2E] transition-colors hover:bg-[#FFE3DC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A]"
                    >
                      <Mail className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      이어잡에 컨택하기
                    </a>
                  ) : null}
                </div>
              </div>
              {user ? (
                <button
                  type="button"
                  onClick={() => void signOutToLanding()}
                  className="mt-auto flex min-h-14 w-full items-center gap-3.5 rounded-md border-t border-[#E0D9C8] px-3.5 pt-4 text-left text-[1.125rem] font-extrabold leading-snug text-[#C7503B] transition-colors hover:bg-[#FFF0EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.99] sm:min-h-15 sm:text-[1.25rem]"
                >
                  <LogOut className="size-6 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span>로그아웃</span>
                </button>
              ) : null}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
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
  children,
  contentClassName,
  role,
  title,
}: MobilePageProps) {
  const { mode: viewportMode } = useViewportMode();

  const isMobileMode = viewportMode === 'mobile';

  return (
    <>
      {isMobileMode ? (
        <main className="fixed inset-0 sm:static h-full sm:h-dvh sm:max-h-dvh w-full overflow-hidden bg-[#F7F3EA] text-[#17212B] sm:flex sm:items-center sm:justify-center sm:p-6">
          <section className="mx-auto flex h-full sm:h-[844px] sm:max-h-[calc(100dvh-3rem)] w-full max-w-full sm:max-w-[430px] flex-col overflow-hidden border-[#E0D9C8] bg-[#F7F3EA] shadow-2xl sm:rounded-[28px] sm:border relative">
            <SiteHeader activeNav={activeNav} role={role} title={title} />

            {/* Content Container */}
            <div className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full px-4 py-4', contentClassName)}>
              {children}
            </div>

          </section>
        </main>
      ) : !role ? (
        /* Unauthenticated / Login / Signup Screen: Desktop Card Frame Layout */
        <main className="min-h-dvh bg-[#F7F3EA] text-[#17212B] sm:p-4 md:p-6 lg:p-10 sm:flex sm:items-center sm:justify-center">
          <section className="mx-auto flex w-full max-w-full md:max-w-5xl lg:max-w-6xl xl:max-w-7xl flex-col overflow-hidden border-[#E0D9C8] bg-[#F7F3EA] shadow-2xl sm:rounded-[28px] sm:border min-h-[640px] md:min-h-[740px] lg:min-h-[820px]">
            <SiteHeader activeNav={activeNav} role={role} title={title} />

            {/* Content Container */}
            <div className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full', contentClassName)}>{children}</div>
          </section>
        </main>
      ) : (
        /* Logged-In Service Pages: Full Version Responsive Web Layout */
        <main className="min-h-dvh bg-[#FAF7F2] text-[#17212B] flex flex-col w-full">
          <section className="w-full min-h-dvh flex flex-col bg-[#FAF7F2]">
            <SiteHeader activeNav={activeNav} role={role} title={title} />

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
        'flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-extrabold leading-none transition-all duration-200 break-keep select-none',
        isMobile ? 'h-[38px] min-h-[38px] px-3.5 text-[13px]' : 'h-11 min-h-11 px-5 text-[14px]',
        onClick ? 'cursor-pointer' : 'cursor-default',
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
    'flex flex-1 flex-col justify-between rounded-[20px] bg-white shadow-xs text-left min-w-0 overflow-hidden h-full',
    onClick &&
      'cursor-pointer transition hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2',
    isMobile
      ? 'min-h-[124px] p-3.5 sm:p-4'
      : 'min-h-[148px] p-5 md:p-6',
  );
  const content = (
    <>
      <span className="flex items-start justify-between gap-2 min-w-0">
        <span className={cn('font-bold text-[#4B5768] min-w-0 truncate', isMobile ? 'text-[13px]' : 'text-[16px]')}>
          {label}
        </span>
        {onClick ? <span aria-hidden="true" className="text-[#173F3A]">→</span> : null}
      </span>
      <div className="mt-auto min-w-0">
        <strong
          className={cn(
            'block font-extrabold tracking-tight text-[#173F3A] truncate',
            isMobile ? 'text-[25px] sm:text-[27px]' : 'text-[34px]',
          )}
        >
          {value}
        </strong>
        <span
          className={cn(
            'mt-1 block font-semibold leading-4 text-slate-400 whitespace-nowrap truncate min-w-0 text-[11px] sm:text-[11.5px] md:text-[12.5px] min-h-[16px]',
          )}
          title={caption || ''}
        >
          {caption || '\u00A0'}
        </span>
        {actionHint ? (
          <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-extrabold text-[#173F3A]">
            {actionHint} <ChevronRight aria-hidden="true" className="size-3" />
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
          'w-full rounded-xl border-0 bg-[#FAF7F2] px-3.5 font-medium text-[#17212B] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#173F3A]/20 shadow-2xs transition-all h-[46px] md:h-12 text-[13.5px] md:text-sm',
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
          'w-full resize-none rounded-xl border-0 bg-[#FAF7F2] p-3.5 font-medium text-[#17212B] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#173F3A]/20 shadow-2xs transition-all h-26 md:h-28 text-[13.5px] md:text-sm leading-relaxed',
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

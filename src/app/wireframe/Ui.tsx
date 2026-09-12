import {
  ArrowRight,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  ExternalLink,
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
  type LucideIcon,
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

const SURVEY_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScx3laaemzgvyd3YxWzaUA2Blx36en5E-06zveHA60ONbs_Eg/viewform';

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
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D8D1C2] bg-white font-extrabold text-[#173F3A] transition-[color,background-color,transform] duration-150 hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] focus-visible:ring-offset-2 active:scale-[0.97] cursor-pointer',
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
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl bg-white p-2 shadow-[0_6px_12px_rgba(23,63,58,0.16)]"
          id="eojob-site-menu"
          role="menu"
        >
          {showProjectLink ? (
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#17212B] hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] active:scale-[0.98] transition-colors cursor-pointer"
              onClick={() => {
                onProjectClick?.();
                moveTo('/senior/project-database');
              }}
              role="menuitem"
              type="button"
            >
              <Briefcase aria-hidden="true" className="size-5 text-[#173F3A]" />
              <span>프로젝트 보러가기</span>
            </button>
          ) : null}
          <button
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#17212B] hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] active:scale-[0.98] transition-colors cursor-pointer"
            onClick={() => moveTo('/')}
            role="menuitem"
            type="button"
          >
            <Info aria-hidden="true" className="size-5 text-[#173F3A]" />
            <span>이어잡 소개</span>
          </button>
          <button
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#17212B] hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] active:scale-[0.98] transition-colors cursor-pointer"
            onClick={() => moveTo('/community')}
            role="menuitem"
            type="button"
          >
            <Users aria-hidden="true" className="size-5 text-[#173F3A]" />
            <span>커뮤니티</span>
          </button>
          <a
            aria-label="설문 참여하기 (새 창에서 열림)"
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#17212B] hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] active:scale-[0.98] transition-colors cursor-pointer"
            href={SURVEY_FORM_URL}
            onClick={() => setOpen(false)}
            rel="noopener noreferrer"
            role="menuitem"
            target="_blank"
          >
            <ClipboardCheck aria-hidden="true" className="size-5 text-[#173F3A]" />
            <span className="flex-1">설문 참여하기</span>
            <ExternalLink aria-hidden="true" className="size-4 text-[#61716F]" />
          </a>
          <a
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#17212B] hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] active:scale-[0.98] transition-colors cursor-pointer"
            href="mailto:ieojab2026@gmail.com"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Mail aria-hidden="true" className="size-5 text-[#173F3A]" />
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
  return (
    <div className="site-page">
      <SiteHeader role={role} activeNav={activeNav} showProjectLink={showProjectLink} />
      <main className="site-rail site-page-content">
        <h1 className="sr-only">{title}</h1>
        {showBack ? (
          <button
            aria-label="이전 화면으로 돌아가기"
            className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-[#173F3A] hover:bg-[#DDEBE7]"
            onClick={() => {
              if (backTo) void navigate(backTo);
              else void navigate(-1);
            }}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
            이전 화면
          </button>
        ) : null}
        <div className={cn('site-page-body', contentClassName)}>{children}</div>
      </main>
      {role ? (
        <div className="site-bottom-nav">
          <BottomNav active={activeNav} role={role} forceShow />
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({
  activeNav,
  role,
  actions,
  onProjectClick,
  showProjectLink = !role,
}: {
  activeNav?: SeniorNav | CompanyNav;
  role?: Role;
  actions?: ReactNode;
  onProjectClick?: () => void;
  showProjectLink?: boolean;
}): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <header className="site-header">
      <div className="site-rail site-header-row">
        <button
          type="button"
          aria-label="이어잡 첫 화면"
          onClick={() => void navigate('/')}
          className="site-brand inline-flex min-h-11 items-center rounded-lg hover:opacity-85"
        >
          <BrandLogo />
        </button>
        {role ? (
          <nav
            className="site-primary-nav"
            aria-label={`${role === 'senior' ? '인재' : '회사'} 주요 메뉴`}
          >
            {navItems[role].map((item) => {
              const selected = item.id === activeNav;
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => void navigate(item.path)}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-extrabold transition-colors',
                    selected
                      ? 'bg-[#F06B4F] text-white'
                      : 'text-slate-600 hover:bg-white hover:text-[#17212B]',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : null}
        <div className="site-header-actions">
          {actions}
          <SiteMenu onProjectClick={onProjectClick} showProjectLink={showProjectLink} />
        </div>
      </div>
    </header>
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
      aria-label={`${role === 'senior' ? '인재' : '회사'} 하단 주요 메뉴`}
      className={cn(
        'w-full shrink-0 border-t border-[#E0D9C8] bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg z-40',
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
                selected ? 'font-extrabold text-[#F06B4F]' : 'text-slate-400 hover:text-[#17212B]',
              )}
              key={item.id}
              onClick={() => void navigate(item.path)}
              type="button"
            >
              <IconComponent
                className={cn(
                  'size-5 transition-colors',
                  selected ? 'text-[#F06B4F]' : 'text-slate-400',
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
        <span className="text-[12px] font-black tracking-wide text-[#17212B]">경험 등록</span>
        <span className="rounded-full bg-[#DDEBE7] px-2.5 py-0.5 text-[11px] font-black text-[#173F3A] shadow-2xs">
          {current}/{total} 단계
        </span>
      </div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[#DDEBE7]/70">
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
  tone?: 'brand' | 'role';
};

export function ActionButton({
  className,
  children,
  role = 'senior',
  secondary,
  tone = 'role',
  ...props
}: ActionButtonProps) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const textChildren = typeof children === 'string' ? children.trim() : null;
  const hasTrailingArrow = textChildren ? /(?:→|➔)$/.test(textChildren) : false;
  const content = hasTrailingArrow ? (
    <span className="inline-flex min-w-0 items-center justify-center gap-2">
      <span>{textChildren?.replace(/\s*(?:→|➔)$/, '')}</span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
    </span>
  ) : (
    children
  );

  return (
    <button
      className={cn(
        'flex w-full items-center justify-center rounded-full font-extrabold leading-none transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
        isMobile ? 'h-[50px] min-h-[50px] px-5 text-[15px]' : 'h-14 min-h-14 px-6 text-[16px]',
        secondary
          ? 'border border-[#D4CBB8] bg-gradient-to-b from-white via-[#FAF7F2] to-[#F2EDE2] text-[#17212B] shadow-[0_2px_6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-[#173F3A] hover:from-white hover:to-[#E8F2EF] hover:text-[#173F3A] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(23,63,58,0.15)] active:translate-y-0 active:scale-[0.98]'
          : tone === 'brand' || role === 'company'
            ? 'border border-[#D85A3F] bg-gradient-to-b from-[#F57B61] via-[#F06B4F] to-[#D85A3F] text-white shadow-[0_4px_14px_rgba(240,107,79,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#F78B73] hover:via-[#F2755B] hover:to-[#E06146] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(240,107,79,0.4)] active:translate-y-0 active:scale-[0.98]'
            : 'border border-[#173F3A] bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-white shadow-[0_4px_14px_rgba(23,63,58,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(23,63,58,0.4)] active:translate-y-0 active:scale-[0.98]',
        className,
      )}
      {...props}
    >
      {content}
    </button>
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
      aria-pressed={onClick ? Boolean(selected) : undefined}
      className={cn(
        'flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border font-extrabold break-keep select-none transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2',
        isMobile ? 'h-11 min-h-11 px-3.5 text-[13px]' : 'h-11 min-h-11 px-5 text-[14px]',
        'leading-none',
        onClick ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default',
        selected
          ? 'border-[#173F3A] bg-[#173F3A] text-white shadow-none hover:bg-[#21544E]'
          : onClick
            ? 'border-[#D4CBB8] bg-white text-[#354B46] shadow-none hover:border-[#173F3A] hover:bg-[#F2F7F5] hover:text-[#173F3A]'
            : 'border-[#E0D9C8] bg-[#FAF7F2] text-slate-700 shadow-none',
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
                <CircleDot aria-hidden="true" className="mr-1 size-3 shrink-0" strokeWidth={2.5} />
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
  icon: Icon,
  interactiveLabel,
  label,
  onClick,
  value,
}: {
  actionHint?: string;
  caption?: string;
  icon?: LucideIcon;
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
    isMobile ? 'min-h-[124px] p-3.5 sm:p-4' : 'min-h-[148px] p-5 md:p-6',
  );
  const content = (
    <>
      <span className="flex items-start justify-between gap-2 min-w-0">
        <span
          className={cn(
            'inline-flex min-w-0 items-center gap-1.5 truncate font-bold text-[#4B5768]',
            isMobile ? 'text-[13px]' : 'text-[16px]',
          )}
        >
          {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} /> : null}
          <span className="truncate">{label}</span>
        </span>
        {onClick ? (
          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-[#173F3A]"
            strokeWidth={2.25}
          />
        ) : null}
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
    <span className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7] px-3.5 py-1.5 text-[13px] font-extrabold text-[#173F3A] md:text-[16px]">
      <CircleDot aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.5} />
      {children}
    </span>
  );
}

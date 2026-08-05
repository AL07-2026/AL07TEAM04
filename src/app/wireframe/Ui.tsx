import { ChevronLeft } from 'lucide-react';
import { type ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { cn } from '@/lib/utils';

export type Role = 'senior' | 'company';
export type SeniorNav = 'home' | 'projects' | 'proposals' | 'profile';
export type CompanyNav = 'home' | 'projects' | 'proposals' | 'profile';

const roleStyles = {
  senior: {
    accent: 'text-[#2563eb]',
    background: 'bg-[#2563eb] hover:bg-[#1d4ed8]',
  },
  company: {
    accent: 'text-[#4f46e5]',
    background: 'bg-[#4f46e5] hover:bg-[#4338ca]',
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

  return (
    <main className="min-h-dvh bg-slate-200 text-slate-200 sm:flex sm:items-center sm:justify-center sm:p-6">
      <section className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-[#020617] shadow-2xl sm:h-[844px] sm:min-h-0 sm:rounded-[24px]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#334155] bg-[#0f172a] px-4">
          {showBack ? (
            <button
              aria-label="이전 화면으로 돌아가기"
              className="-ml-1 flex size-8 items-center justify-center rounded-full text-slate-200 transition hover:bg-white/10"
              onClick={() => {
                if (backTo) void navigate(backTo);
                else void navigate(-1);
              }}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
          ) : null}
          <h1 className="text-[18px] font-bold">{title}</h1>
        </header>
        <div className={cn('min-h-0 flex-1 overflow-y-auto', contentClassName)}>{children}</div>
        {role && activeNav ? <BottomNav active={activeNav} role={role} /> : null}
      </section>
    </main>
  );
}

const navItems = {
  senior: [
    { id: 'home', label: '홈', path: '/senior' },
    { id: 'projects', label: '프로젝트', path: '/senior/projects' },
    { id: 'proposals', label: '내 제안', path: '/senior/proposals' },
    { id: 'profile', label: '내 정보', path: '/basic-profile' },
  ],
  company: [
    { id: 'home', label: '홈', path: '/company' },
    { id: 'projects', label: '프로젝트 관리', path: '/company/projects' },
    { id: 'proposals', label: '받은 제안', path: '/company/proposals' },
    { id: 'profile', label: '회사 정보', path: '/company-info' },
  ],
} as const;

function BottomNav({ active, role }: { active: SeniorNav | CompanyNav; role: Role }) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label={`${role === 'senior' ? '인재' : '회사'} 주요 메뉴`}
      className="flex h-16 shrink-0 border-t border-[#334155] bg-[#0f172a] px-3 py-2"
    >
      {navItems[role].map((item) => {
        const selected = item.id === active;
        return (
          <button
            aria-current={selected ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition',
              selected ? roleStyles[role].accent : 'text-slate-400 hover:text-slate-200',
            )}
            key={item.id}
            onClick={() => void navigate(item.path)}
            type="button"
          >
            <span aria-hidden="true" className="text-[10px]">
              {selected ? '●' : '○'}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
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
        'flex h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        secondary
          ? 'border border-[#334155] bg-[#1e293b] text-slate-200 hover:bg-[#26354a]'
          : cn(roleStyles[role].background, 'text-white'),
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  children,
  onClick,
  role = 'senior',
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
        'flex h-[30px] items-center justify-center rounded-xl px-3 text-xs font-medium transition',
        selected
          ? role === 'senior'
            ? 'bg-[#2563eb] text-white'
            : 'bg-[#4f46e5] text-white'
          : 'border border-[#334155] bg-[#1e293b] text-slate-200',
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
      <span className="text-xs font-medium text-[#2563eb]">{project.company}</span>
      <strong className="text-left text-base font-bold text-slate-200">{project.title}</strong>
      <span className="text-left text-xs text-slate-400">{project.meta}</span>
      <span className="text-xs font-medium text-[#2563eb]">
        {project.action ?? '프로젝트 보기 →'}
      </span>
    </>
  );
  const classes =
    'flex h-40 w-full flex-col items-start gap-3 rounded-2xl border border-[#334155] bg-[#1e293b] p-4';

  return onClick ? (
    <button
      className={cn(classes, 'transition hover:border-slate-500')}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function SummaryCard({ label, role, value }: { label: string; role: Role; value: string }) {
  return (
    <div className="flex h-[104px] flex-1 flex-col gap-1.5 rounded-[14px] bg-[#0f172a] px-3.5 py-4">
      <span className="text-xs text-slate-400">{label}</span>
      <strong className={cn('text-[22px] font-bold', roleStyles[role].accent)}>{value}</strong>
    </div>
  );
}

export function InfoPanel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-[#334155] bg-[#1e293b] p-3.5">
      <strong className="text-xs font-medium text-slate-200">{label}</strong>
      <div className="text-[13px] leading-5 text-slate-400">{children}</div>
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ className, label, ...props }: FieldProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-xs font-medium text-slate-200">
      <span>{label}</span>
      <input
        className={cn(
          'h-12 w-full rounded-xl border border-[#334155] bg-[#1e293b] px-3 text-[13px] text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/25',
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
    <label className="flex w-full flex-col gap-2 text-xs font-medium text-slate-200">
      <span>{label}</span>
      <textarea
        className={cn(
          'h-24 w-full resize-none rounded-xl border border-[#334155] bg-[#1e293b] p-3 text-[13px] leading-5 text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/25',
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit rounded-xl bg-[#0f172a] px-2.5 py-2 text-xs font-medium text-amber-400">
      ● {children}
    </span>
  );
}

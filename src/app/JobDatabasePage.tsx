import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  CircleAlert,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Filter,
  Mail,
  MapPin,
  Mic,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';

import {
  databaseSummary,
  employmentTypeLabels,
  hiringStageLabels,
} from '@/data/jobPostings';
import type {
  EmploymentType,
  HiringStage,
  JobPosting,
  ProjectCategory,
  WorkType,
} from '@/data/jobPostings';
import {
  normalizeOccupationCategory,
  occupationCategoryLabels,
  occupationCategoryOptions,
  OTHER_OCCUPATION_PREFERENCE,
} from '@/data/occupationCategories';
import { useAuth } from '@/lib/authContext';
import {
  beginApplicationInterview,
  cancelApplicationInterview,
  consumeApplicationDraft,
  consumeApplicationResume,
  evaluateExperienceCardMatch,
  getExperienceCardCategoryLabel,
  getPendingApplicationInterview,
  preserveApplicationDraft,
  readStoredExperienceCard,
  type StoredExperienceCard,
} from '@/lib/applicationFlow';
import { getFitScoreTone } from '@/lib/fitScoreTone';
import { cn } from '@/lib/utils';
import { sendApplicationEmailToManager } from '@/services/emailService';
import { getLatestUserExperienceCard } from '@/services/interviewService';
import {
  searchFullJobDatabase,
  type FullJobSearchResult,
  type JobOccupationFilter,
} from '@/services/jobSearchService';
import {
  calculatePersonalizedMatch,
  doesPostingMatchDesiredOccupationText,
  getExperienceCardRecommendationText,
  getPostingOccupationCategory,
  getProfilePreferredCategories,
  getProfilePreferredPreferences,
  getProfilePrimaryCategory,
  getProfilePrimaryPreference,
} from '@/services/recommendationEngine';
import { createProject, fetchProjects } from '@/services/projectService';
import { createProposalFromPosting } from '@/services/proposalService';
import { resolveSeniorProfile, type SeniorProfileData } from '@/services/profileService';
import {
  clearWorknetFeedCache,
  fetchWorknetSeniorProjectFeed,
  getDefaultSeniorJobPostings,
  type WorknetProjectFeed,
  type WorknetProjectFeedStatus,
} from '@/services/worknetService';

import type {
  OccupationCategory,
  OccupationPreference,
} from '@/data/occupationCategories';

import { Chip, MobilePage, type Role, useViewportMode } from '@/app/wireframe/Ui';

const all = 'all';
const allDatabase = 'all_db';
const customOccupationMatch = 'custom-match';
const unclassifiedOccupation = 'unclassified';
type CategoryFilter =
  | ProjectCategory
  | OccupationCategory
  | typeof all
  | typeof allDatabase
  | typeof customOccupationMatch
  | typeof unclassifiedOccupation;
type WorkTypeFilter = WorkType | typeof all;
type EmploymentTypeFilter = EmploymentType | typeof all;
type HiringStageFilter = HiringStage | typeof all;
type SortOption = 'fit-desc' | 'deadline-asc' | 'latest-desc';

type FilterOption = {
  badge?: string;
  id: CategoryFilter;
  label: string;
};

const MAX_APPLICATION_FILES = 2;
const MAX_APPLICATION_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_APPLICATION_FILE_EXTENSIONS = ['pdf', 'doc', 'docx'];

const categoryFilters: FilterOption[] = [
  { id: all, label: '전체' },
  ...databaseSummary.categories.map(({ id, label }) => ({ id, label })),
];

const employmentTypeFilters: { id: EmploymentTypeFilter; label: string }[] = [
  { id: all, label: '전체 고용 형태' },
  { id: 'part-time', label: '시간제·파트타임 (오전/오후)' },
  { id: 'contract', label: '계약직·기간제' },
  { id: 'full-time', label: '정규직' },
  { id: 'project', label: '프로젝트·자문' },
];

function getPostingOccupationLabel(posting: JobPosting) {
  if (posting.occupationClassificationStatus === 'ambiguous') {
    return '기타·직무 확인 필요';
  }
  return occupationCategoryLabels[getPostingOccupationCategory(posting)];
}

const workTypeFilters: { id: WorkTypeFilter; label: string }[] = [
  { id: all, label: '전체 근무' },
  { id: 'remote', label: '원격' },
  { id: 'hybrid', label: '하이브리드' },
  { id: 'onsite', label: '오피스' },
];

const companyHiringStageFilters: { id: HiringStageFilter; label: string }[] = [
  { id: all, label: '전체 단계' },
  { id: 'open', label: '모집 중' },
  { id: 'screening', label: '지원서 검토 중' },
  { id: 'interviewing', label: '담당자 인터뷰 중' },
  { id: 'closing', label: '마감 임박' },
];

const worknetPostingStatusFilters: { id: HiringStageFilter; label: string }[] = [
  { id: all, label: '전체 공고' },
  { id: 'open', label: '모집 중' },
  { id: 'closing', label: '마감 임박' },
];

const sortOptions: { id: SortOption; label: string }[] = [
  { id: 'fit-desc', label: '적합도 높은순' },
  { id: 'deadline-asc', label: '마감 빠른순' },
  { id: 'latest-desc', label: '최신 등록순' },
];

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
};

const getDeadlineText = (posting: JobPosting) =>
  formatDate(posting.deadline) || posting.deadlineLabel || '마감일 미제공';

const formatFileSize = (size: number) => `${(size / 1024 / 1024).toFixed(1)}MB`;

function getInterviewSummary(card: StoredExperienceCard) {
  return `직종: ${getExperienceCardCategoryLabel(card)} · 문제: ${card.problem} · 역할: ${card.role} · 실행: ${card.action} · 결과: ${card.result}`;
}

function DatabaseMetric({
  label,
  value,
  caption,
}: {
  caption: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
      <p className="text-[12px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-[26px] font-extrabold tracking-tight text-[#173F3A]">{value}</p>
      <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">{caption}</p>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  mobile = false,
  onChange,
  options,
  value,
}: {
  label: string;
  mobile?: boolean;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  value: T;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-[12px] font-extrabold text-[#17212B]">
      <span>{label}</span>
      <select
        className={cn(
          'w-full rounded-xl border border-[#E0D9C8] px-3 font-bold text-[#17212B] outline-none focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/10',
          mobile ? 'h-12 bg-[#FAF7F2] text-[14px]' : 'h-11 bg-white text-[13px]',
        )}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TagList({ items }: { items?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(items ?? []).map((item) => (
        <span
          className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#173F3A]"
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function MobileDetailRow({
  children,
  label,
  tone = 'neutral',
}: {
  children: ReactNode;
  label: string;
  tone?: 'coral' | 'mint' | 'neutral';
}) {
  const toneStyles = {
    coral: {
      content: 'bg-[#FFF9F7]',
      label: 'bg-[#FDF0ED] text-[#F06B4F]',
    },
    mint: {
      content: 'bg-[#F8FCFB]',
      label: 'bg-[#DDEBE7] text-[#173F3A]',
    },
    neutral: {
      content: 'bg-white',
      label: 'bg-[#FAF7F2] text-[#173F3A]',
    },
  }[tone];

  return (
    <section className="grid grid-cols-[92px_minmax(0,1fr)] border-b border-[#E0D9C8] last:border-b-0">
      <h3
        className={cn(
          'border-r border-[#E0D9C8] px-3 py-3.5 text-[12px] font-extrabold leading-[1.45]',
          toneStyles.label,
        )}
      >
        {label}
      </h3>
      <div
        className={cn(
          'min-w-0 px-3.5 py-3.5 text-[13px] font-medium leading-[1.7] text-[#17212B]/80',
          toneStyles.content,
        )}
      >
        {children}
      </div>
    </section>
  );
}

function DetailBulletList({ items, tone = 'mint' }: { items?: string[]; tone?: 'coral' | 'mint' }) {
  return (
    <ul className="flex flex-col gap-2">
      {(items ?? []).map((item) => (
        <li className="flex items-start gap-2" key={item}>
          <span
            aria-hidden="true"
            className={cn(
              'mt-[9px] size-1.5 shrink-0 rounded-full',
              tone === 'coral' ? 'bg-[#F06B4F]' : 'bg-[#173F3A]',
            )}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function shouldShowScoreBadge(
  posting: JobPosting,
  profile?: SeniorProfileData | null,
  activePrimaryCategory?: string | null,
): boolean {
  if (!profile) return false;
  const preferredPreferences = getProfilePreferredPreferences(profile);
  const preferredCategories = getProfilePreferredCategories(profile);
  const isDirectOccupationMatch =
    preferredPreferences.includes(OTHER_OCCUPATION_PREFERENCE) &&
    doesPostingMatchDesiredOccupationText(posting, profile.desiredOccupationText);
  if (posting.occupationClassificationStatus === 'ambiguous' && !isDirectOccupationMatch) {
    return false;
  }
  if (preferredPreferences.length === 0) return false;

  const postingCategory = getPostingOccupationCategory(posting);
  const isPostingPreferred =
    preferredCategories.includes(postingCategory) || isDirectOccupationMatch;

  const isNonPreferredFilterActive =
    activePrimaryCategory &&
    activePrimaryCategory !== all &&
    activePrimaryCategory !== customOccupationMatch &&
    !preferredCategories.includes(activePrimaryCategory as unknown as OccupationCategory);

  if (isNonPreferredFilterActive) {
    return false;
  }

  return isPostingPreferred;
}

function PostingCard({
  activePrimaryCategory,
  experienceCard,
  onApply,
  onSelect,
  posting,
  profile,
  role = 'company',
  selected,
}: {
  activePrimaryCategory?: string;
  experienceCard?: StoredExperienceCard | null;
  onApply?: (posting: JobPosting) => void;
  onSelect: () => void;
  posting: JobPosting;
  profile?: SeniorProfileData | null;
  role?: Role;
  selected: boolean;
}) {
  const matchResult = calculatePersonalizedMatch(
    posting,
    profile,
    activePrimaryCategory,
    experienceCard,
  );
  const hasUserProfile = Boolean(profile && profile.field?.trim() && profile.period?.trim());
  const displayScore = hasUserProfile && matchResult.personalizedScore > 0 ? matchResult.personalizedScore : (posting.seniorFitScore || 75);
  const displayReasons = hasUserProfile && matchResult.matchReasons.length > 0
    ? matchResult.matchReasons
    : (posting.recommendationReasons?.length ? posting.recommendationReasons : ['시니어 우대 공고']);
  const fitTone = getFitScoreTone(displayScore);
  const showScore = role === 'senior' && shouldShowScoreBadge(posting, profile, activePrimaryCategory);
  const isUnclassifiedFilter = activePrimaryCategory === unclassifiedOccupation;

  // Clean problem statement text to avoid repeating company name and title
  let cleanProblemStatement = posting.problemStatement || '';
  if (cleanProblemStatement.includes(`${posting.companyName}의`) && cleanProblemStatement.includes('과제 해결')) {
    const safeCompany = posting.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanProblemStatement = cleanProblemStatement
      .replace(/^\[[^\]]+\]\s*/g, '')
      .replace(new RegExp(`^${safeCompany}의\\s*.*과제\\s*해결입니다\\.?`, 'i'), '')
      .trim();
  }
  if (!cleanProblemStatement || cleanProblemStatement.length < 8) {
    cleanProblemStatement = `${getPostingOccupationLabel(posting)} 분야 주요 업무 프로세스를 분석·개선하고 시니어 인재의 실무 노하우를 발휘하는 핵심 프로젝트입니다.`;
  }

  // Pick max 3 essential badges so top never clutters into multiple rows
  const essentialBadges: { isMint?: boolean; label: string }[] = [];
  if (posting.workType === 'remote' || posting.title.includes('재택')) {
    essentialBadges.push({ isMint: true, label: '💻 재택·원격' });
  } else if (posting.workType === 'hybrid' || posting.title.includes('하이브리드')) {
    essentialBadges.push({ isMint: true, label: '🏢 하이브리드' });
  }

  if (posting.employmentType === 'contract' || posting.title.includes('계약직')) {
    essentialBadges.push({ label: '계약직' });
  } else if (posting.employmentType === 'part-time' || posting.title.includes('시간제')) {
    essentialBadges.push({ label: '시간제' });
  }

  const categoryLabel = getPostingOccupationLabel(posting);
  if (categoryLabel && essentialBadges.length < 3) {
    essentialBadges.push({ isMint: true, label: categoryLabel });
  }
  if (essentialBadges.length === 0) {
    essentialBadges.push({ label: hiringStageLabels[posting.hiringStage] || '모집 중' });
  }

  return (
    <article
      className={cn(
        'w-full max-w-full overflow-hidden cursor-pointer rounded-2xl border bg-white p-4 text-left shadow-xs transition hover:shadow-md min-w-0',
        selected ? 'border-[#173F3A] ring-2 ring-[#173F3A]/10' : 'border-[#E0D9C8]',
      )}
      onClick={onSelect}
    >
      {/* Card Header: Row 1 (Company Badge + Fit Score), Row 2 (Industry Tag) */}
      <div className="flex flex-col gap-1.5 min-w-0 w-full overflow-hidden">
        {/* Row 1: Company Name Badge + Fit Score Badge */}
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF7F2] px-2.5 py-1 text-[12.5px] font-extrabold text-[#173F3A] border border-[#E0D9C8] shrink min-w-0 max-w-[72%]">
            <Building2 className="size-3.5 shrink-0 text-[#173F3A]" />
            <span className="truncate">{posting.companyName}</span>
          </span>

          <div className="shrink-0 ml-auto">
            {showScore ? (
              <span className={cn('inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-extrabold border', fitTone.containerClassName)}>
                <span className={fitTone.labelClassName}>{fitTone.label}</span>
                <span className={cn('font-black text-[13px]', fitTone.scoreClassName)}>{displayScore}점</span>
              </span>
            ) : (
              <span className="rounded-lg border border-[#BBD5CE] bg-[#F8FCFB] px-2.5 py-1 text-[11.5px] font-extrabold text-[#173F3A]">
                직종 탐색
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Industry / Category Tag */}
        <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 min-w-0 overflow-hidden">
          <span className="text-slate-400">·</span>
          <span className="truncate font-bold text-slate-600">{posting.industry}</span>
        </div>
      </div>

      {/* Position Title */}
      <h3 className="mt-2.5 text-[16.5px] font-extrabold leading-snug text-[#17212B] min-w-0 break-keep overflow-hidden">
        <button
          className="text-left hover:text-[#173F3A] transition-colors line-clamp-2"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          type="button"
        >
          {posting.title}
        </button>
      </h3>

      {/* Streamlined Essential Badges Row (Max 3 Badges, Single Line) */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 min-w-0 max-w-full overflow-hidden">
        {essentialBadges.map((badge, idx) => (
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border truncate max-w-full',
              badge.isMint
                ? 'border-[#BBD5CE] bg-[#DDEBE7] text-[#173F3A]'
                : 'border-[#E0D9C8] bg-[#FAF7F2] text-slate-700',
            )}
            key={`${badge.label}-${idx}`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      {/* Match Highlight Callout */}
      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-[#BBD5CE]/80 bg-[#F4F9F8] px-2.5 py-1.5 text-[11.5px] font-extrabold text-[#173F3A] min-w-0 overflow-hidden">
        <Sparkles className="size-3.5 shrink-0 text-[#173F3A]" />
        <span className="truncate min-w-0 flex-1">
          {showScore
            ? displayReasons[0]
            : isUnclassifiedFilter
              ? '자동 분류 확신이 낮아 직무 확인이 필요한 공고입니다.'
              : `선택 직종 (${getPostingOccupationLabel(posting)}) 채용 공고입니다.`}
        </span>
      </div>

      {/* Clean AI Problem Statement */}
      <p className="mt-2 text-[13px] font-medium leading-relaxed text-slate-600 line-clamp-2 break-keep min-w-0">
        {cleanProblemStatement}
      </p>

      {/* Location, Experience & Deadline Footer */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-slate-500 min-w-0 overflow-hidden break-keep">
        <span className="inline-flex items-center gap-1 min-w-0 max-w-[65%] sm:max-w-none truncate">
          <MapPin className="size-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{posting.location}</span>
        </span>
        <span className="shrink-0">·</span>
        <span className="shrink-0">{posting.source === 'worknet' ? posting.experienceYears : posting.projectDuration}</span>
        <span className="shrink-0">·</span>
        <span className="shrink-0">마감 {getDeadlineText(posting)}</span>
      </div>

      {/* Bottom Bar: Salary + Apply Button */}
      <div className="mt-3 flex items-center justify-between border-t border-[#E0D9C8]/60 pt-2.5 min-w-0 w-full">
        <span className="text-[13px] font-extrabold text-[#F06B4F] truncate min-w-0 pr-2">{posting.salaryRange}</span>
        <button
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-xl px-4 py-1.5 text-[13px] font-extrabold text-white transition-all duration-200 cursor-pointer shadow-2xs',
            role === 'senior'
              ? 'border border-[#173F3A] bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] active:scale-[0.98]'
              : 'border border-[#D85A3F] bg-gradient-to-b from-[#F57B61] via-[#F06B4F] to-[#D85A3F] hover:from-[#F78B73] hover:via-[#F2755B] hover:to-[#E06146] active:scale-[0.98]',
          )}
          onClick={(e) => {
            e.stopPropagation();
            onApply?.(posting);
          }}
          type="button"
        >
          {role === 'senior' ? '지원하기' : '제안하기'}
        </button>
      </div>
    </article>
  );
}

function DetailPanel({
  activePrimaryCategory,
  experienceCard,
  onApply,
  posting,
  profile,
  role,
}: {
  activePrimaryCategory?: string;
  experienceCard?: StoredExperienceCard | null;
  onApply?: () => void;
  posting: JobPosting;
  profile?: SeniorProfileData | null;
  role?: Role;
}) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const matchResult = calculatePersonalizedMatch(
    posting,
    profile,
    activePrimaryCategory,
    experienceCard,
  );
  const hasUserProfile = Boolean(profile && profile.field?.trim() && profile.period?.trim());
  const displayScore = hasUserProfile && matchResult.personalizedScore > 0 ? matchResult.personalizedScore : (posting.seniorFitScore || 75);
  const displayReasons = hasUserProfile && matchResult.matchReasons.length > 0
    ? matchResult.matchReasons
    : (posting.recommendationReasons?.length ? posting.recommendationReasons : ['시니어 우대 공고']);
  const fitTone = getFitScoreTone(displayScore);
  const showScore = shouldShowScoreBadge(posting, profile, activePrimaryCategory);
  const isUnclassifiedFilter = activePrimaryCategory === unclassifiedOccupation;

  return (
    <article
      className={cn(
        'rounded-2xl border border-[#E0D9C8] bg-white shadow-xs',
        isMobile ? 'p-3.5' : 'p-4',
      )}
    >
      {isMobile ? (
        <header className="border-b border-[#E0D9C8] pb-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-extrabold text-[#F06B4F]">
              {hiringStageLabels[posting.hiringStage]} ·{' '}
              {getPostingOccupationLabel(posting) || posting.industry}
            </p>
            {showScore ? (
              <div
                aria-label={`적합도 ${displayScore}점, ${fitTone.label}`}
                className={cn(
                  'inline-flex shrink-0 items-baseline gap-1 rounded-full border px-2.5 py-1',
                  fitTone.containerClassName,
                )}
              >
                <span className={cn('text-[11px] font-extrabold', fitTone.labelClassName)}>
                  {fitTone.label}
                </span>
                <strong className={cn('text-[16px] font-extrabold', fitTone.scoreClassName)}>
                  {displayScore}점
                </strong>
              </div>
            ) : (
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#BBD5CE] bg-[#F8FCFB] px-3 py-1 text-[11px] font-extrabold text-[#173F3A]">
                직종 탐색
              </span>
            )}
          </div>
          <h2 className="mt-2.5 text-[20px] font-extrabold leading-[1.4] tracking-[-0.02em] text-[#17212B]">
            {posting.title}
          </h2>
          <p className="mt-1.5 text-[13px] font-bold leading-5 text-[#173F3A]">
            {posting.companyName} · {posting.companySize}
            {posting.source === 'worknet'
              ? posting.workSchedule
                ? ` · ${posting.workSchedule}`
                : ''
              : ` · ${employmentTypeLabels[posting.employmentType]}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[12px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4 text-[#173F3A]" />
              마감 {getDeadlineText(posting)}
            </span>
            <span>
              {posting.source === 'worknet' ? posting.experienceYears : posting.projectDuration} ·{' '}
              {posting.salaryRange}
            </span>
          </div>
        </header>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-extrabold text-[#F06B4F]">
              {hiringStageLabels[posting.hiringStage]} ·{' '}
              {getPostingOccupationLabel(posting) || posting.industry}
            </p>
            <h2 className="mt-1 text-[22px] font-extrabold leading-tight text-[#17212B]">
              {posting.title}
            </h2>
            <p className="mt-1 text-[13px] font-bold text-[#173F3A]">
              {posting.companyName} · {posting.companySize}
              {posting.source === 'worknet'
                ? posting.workSchedule
                  ? ` · ${posting.workSchedule}`
                  : ''
                : ` · ${employmentTypeLabels[posting.employmentType]}`}
            </p>
          </div>
          {showScore ? (
            <div
              aria-label={`시니어 적합도 ${displayScore}점, ${fitTone.label}`}
              className={cn('rounded-xl border px-3 py-2 text-center', fitTone.containerClassName)}
            >
              <p className={cn('text-[12px] font-bold', fitTone.labelClassName)}>{fitTone.label}</p>
              <p className={cn('text-[24px] font-extrabold', fitTone.scoreClassName)}>
                {displayScore}점
              </p>
            </div>
          ) : (
            <span className="shrink-0 whitespace-nowrap rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] px-3 py-1.5 text-[12px] font-extrabold text-[#173F3A] shadow-none cursor-default select-none">
              직종 탐색
            </span>
          )}
        </div>
      )}

      {!isMobile ? (
        <div className="mt-4 grid gap-2 text-[13px] font-semibold text-slate-600 sm:grid-cols-2">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4 text-[#173F3A]" />
            마감 {getDeadlineText(posting)}
          </span>
          <span>
            {posting.source === 'worknet' ? posting.experienceYears : posting.projectDuration} ·{' '}
            {posting.salaryRange}
          </span>
        </div>
      ) : null}

      {/* Personalized Profile Match Analysis */}
      {role === 'senior' ? (
        <div className="mt-4 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/60 p-3.5 flex flex-col gap-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#173F3A]">
            <Sparkles className="size-4 text-[#173F3A]" />
            {showScore
              ? '내 정보 기반 적합도 분석'
              : isUnclassifiedFilter
                ? '직무 분류 확인 안내'
                : '선택 직종 탐색 안내'}
          </div>
          <div className="flex flex-col gap-1 text-xs">
            {showScore ? (
              displayReasons.map((reason, idx) => (
                <p key={idx} className="font-semibold text-[#17212B] flex items-center gap-1">
                  <span>•</span>
                  <span>{reason}</span>
                </p>
              ))
            ) : (
              <p className="font-semibold text-[#17212B] flex items-center gap-1">
                <span>•</span>
                <span>
                  {isUnclassifiedFilter
                    ? '자동 분류 확신이 낮아 기타·직무 확인 필요 목록에 표시된 공고입니다.'
                    : `선택하신 ${getPostingOccupationLabel(posting)} 직종의 채용 공고를 탐색 중입니다.`}
                </span>
              </p>
            )}
          </div>
        </div>
      ) : null}

      {posting.source === 'worknet' ? (
        <div className="mt-4 flex flex-col gap-3">
          {/* Gemini AI Detailed Problem Analysis */}
          <div className="rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#173F3A]">
              <Sparkles className="size-4 text-[#173F3A]" />
              <span>AI 해결 프로젝트 분석</span>
            </div>
            <div className="mt-3">
              <section className="rounded-xl border border-[#E0D9C8]/80 bg-white p-3.5 shadow-3xs">
                <p className="text-[12px] font-extrabold text-[#173F3A]">
                  해결해야 할 핵심 프로젝트 진단
                </p>
                <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#17212B]">
                  {posting.problemStatement}
                </p>
              </section>
            </div>
          </div>

          <div className="grid overflow-hidden rounded-xl border border-[#E0D9C8] sm:grid-cols-2">
            {[
              ['직무 분야', posting.industry],
              ['경력 조건', posting.experienceYears],
              ['근무 지역', posting.location],
              ['근무 일정', posting.workSchedule || '근무 일정 미제공'],
              ['임금 정보', posting.salaryRange],
              ['공고 마감', getDeadlineText(posting)],
              ['등록일', posting.registeredLabel || '등록일 미제공'],
              ['제공 기관', '이어잡 공식 검증'],
            ].map(([label, value]) => (
              <div
                className="border-b border-[#E0D9C8] px-4 py-3 last:border-b-0 sm:border-r sm:last:border-r-0"
                key={label}
              >
                <p className="text-[12px] font-extrabold text-slate-500">{label}</p>
                <p className="mt-1 text-[14px] font-bold leading-6 text-[#17212B]">{value}</p>
              </div>
            ))}
          </div>
          <p className="rounded-xl bg-[#FAF7F2] px-4 py-3 text-[13px] font-medium leading-6 text-slate-600">
            회사명·직무·지역·임금·경력·일정은 검증된 채용 데이터를 사용합니다. 직무 분야와 추천
            점수는 이어잡이 별도로 계산하며, 상세 지원 조건은 원문 공고에서 확인해 주세요.
          </p>
          {posting.sourceUrl ? (
            <a
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#173F3A] bg-white text-[14px] font-extrabold text-[#173F3A] transition hover:bg-[#F8FCFB]"
              href={posting.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              채용 상세 공고 보기
              <ExternalLink className="size-4" />
            </a>
          ) : null}
          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173F3A] text-sm font-extrabold text-white shadow-md transition hover:bg-[#12332F] active:scale-[0.99]"
            onClick={() => onApply?.()}
            type="button"
          >
            이 공고에 지원하기
          </button>
        </div>
      ) : isMobile ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-[#E0D9C8]">
          <MobileDetailRow label="AI 해결 프로젝트 분석" tone="mint">
            <div className="flex flex-col gap-2">
              <p className="font-bold text-[#17212B] leading-relaxed">
                <span className="font-extrabold text-[#173F3A]">핵심 프로젝트:</span>{' '}
                {posting.problemStatement}
              </p>
              <p className="font-bold text-[#17212B] leading-relaxed">
                <span className="font-extrabold text-[#173F3A]">목표 지표:</span>{' '}
                {posting.projectGoal}
              </p>
            </div>
          </MobileDetailRow>
          <MobileDetailRow label="핵심 업무">
            <DetailBulletList items={posting.coreResponsibilities} />
          </MobileDetailRow>
          <MobileDetailRow label="자격 요건">
            <DetailBulletList items={posting.qualifications} />
          </MobileDetailRow>
          <MobileDetailRow label="복지·조건">
            <DetailBulletList items={posting.benefits} />
          </MobileDetailRow>
          <MobileDetailRow label="추천 인재" tone="mint">
            <p className="font-bold leading-[1.7] text-[#17212B]">
              {posting.recommendedTalentType}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(posting.requiredSkills ?? []).map((item) => (
                <span
                  className="rounded-full bg-[#DDEBE7] px-2.5 py-1 text-[11px] font-extrabold text-[#173F3A]"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </MobileDetailRow>
          <MobileDetailRow label="인터뷰 포인트" tone="coral">
            <DetailBulletList items={posting.interviewFocus} tone="coral" />
          </MobileDetailRow>
          <MobileDetailRow label="매칭 기준">
            <div className="flex flex-wrap gap-1.5">
              {(posting.matchingScoreCriteria ?? []).map((item) => (
                <span
                  className="rounded-full bg-[#FAF7F2] px-2.5 py-1 text-[11px] font-bold text-[#17212B]/80"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </MobileDetailRow>
        </div>
      ) : (
        <>
          {/* Gemini AI Detailed Problem Analysis */}
          <div className="mt-5 rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#173F3A]">
              <Sparkles className="size-4 text-[#173F3A]" />
              <span>🤖 AI 해결 프로젝트 분석</span>
            </div>
            <div className="mt-3">
              <section className="rounded-xl border border-[#E0D9C8]/80 bg-white p-3.5 shadow-3xs">
                <p className="text-[12px] font-extrabold text-[#173F3A]">
                  🎯 해결해야 할 핵심 프로젝트 진단
                </p>
                <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#17212B]">
                  {posting.problemStatement}
                </p>
              </section>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
            <section className="rounded-xl border border-[#E0D9C8] bg-white p-4 shadow-3xs">
              <p className="text-xs font-extrabold text-[#173F3A] flex items-center gap-1.5">
                <BriefcaseBusiness className="size-4 text-[#173F3A]" />
                <span>핵심 업무</span>
              </p>
              <ul className="mt-2.5 space-y-2 text-[13.5px] font-bold text-[#17212B] leading-relaxed">
                {(posting.coreResponsibilities ?? []).map((item) => (
                  <li className="flex items-start gap-2" key={item}>
                    <span className="shrink-0 text-[#173F3A]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-[#E0D9C8] bg-white p-4 shadow-3xs">
              <p className="text-xs font-extrabold text-[#173F3A] flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[#173F3A]" />
                <span>자격 요건</span>
              </p>
              <ul className="mt-2.5 space-y-2 text-[13.5px] font-bold text-[#17212B] leading-relaxed">
                {(posting.qualifications ?? []).map((item) => (
                  <li className="flex items-start gap-2" key={item}>
                    <span className="shrink-0 text-[#173F3A]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-[#E0D9C8] bg-white p-4 shadow-3xs">
              <p className="text-xs font-extrabold text-[#173F3A] flex items-center gap-1.5">
                <CalendarClock className="size-4 text-[#173F3A]" />
                <span>복지 / 근무 조건</span>
              </p>
              <ul className="mt-2.5 space-y-2 text-[13.5px] font-bold text-[#17212B] leading-relaxed">
                {(posting.benefits ?? []).map((item) => (
                  <li className="flex items-start gap-2" key={item}>
                    <span className="shrink-0 text-[#173F3A]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <section className="rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/80 p-3.5">
              <p className="text-[12px] font-extrabold text-[#173F3A]">추천 인재 유형</p>
              <p className="mt-1 text-[13px] font-bold leading-6 text-[#17212B]">
                {posting.recommendedTalentType}
              </p>
              <div className="mt-3">
                <TagList items={posting.requiredSkills} />
              </div>
            </section>
            <section className="rounded-xl border border-[#F06B4F]/30 bg-[#FDF0ED] p-3.5">
              <p className="text-[12px] font-extrabold text-[#F06B4F]">AI 인터뷰 확인 포인트</p>
              <ul className="mt-2 space-y-1.5 text-[13px] font-medium text-[#17212B]">
                {(posting.interviewFocus ?? []).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-4 rounded-xl border border-[#E0D9C8] p-3.5">
            <p className="text-[12px] font-extrabold text-[#17212B]">매칭 점수 산정 기준</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(posting.matchingScoreCriteria ?? []).map((item) => (
                <span
                  className="rounded-full bg-[#FAF7F2] px-3 py-1.5 text-[12px] font-bold text-[#17212B]/80"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </section>

          {/* Action Button Bar */}
          <div className="mt-5 flex flex-col gap-2.5 border-t border-[#E0D9C8] pt-4">
            {role === 'senior' ? (
              <button
                type="button"
                onClick={() => onApply?.()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-sm font-extrabold text-white border border-[#173F3A] shadow-[0_4px_12px_rgba(23,63,58,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(23,63,58,0.4)] active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer"
              >
                프로젝트 지원하기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onApply?.()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#F57B61] via-[#F06B4F] to-[#D85A3F] text-sm font-extrabold text-white border border-[#D85A3F] shadow-[0_4px_12px_rgba(240,107,79,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#F78B73] hover:via-[#F2755B] hover:to-[#E06146] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(240,107,79,0.4)] active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer"
              >
                시니어 인재에게 제안하기
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

export function JobDatabasePage({ role = 'company', title }: { role?: Role; title?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [postings, setPostings] = useState<JobPosting[]>(() => {
    if (typeof window === 'undefined') return [];
    if (role === 'senior') return [];
    try {
      const key = 'eojob_feed_swr_v5_authKey=sample&callTp=L&returnType=XML&startPage=1&display=100&sortOrderBy=DESC';
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { feed?: WorknetProjectFeed };
        const cached = parsed?.feed?.projects || [];
        if (cached.length >= 25) return cached;
      }
    } catch {
      // Ignore
    }
    return getDefaultSeniorJobPostings();
  });

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(all);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkTypeFilter>(all);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<EmploymentTypeFilter>(all);
  const [selectedHiringStage, setSelectedHiringStage] = useState<HiringStageFilter>(all);
  const [sortBy, setSortBy] = useState<SortOption>('fit-desc');
  const [selectedId, setSelectedId] = useState('');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [isLoadingPostings, setIsLoadingPostings] = useState<boolean>(() => postings.length === 0);
  const [worknetFeedMessage, setWorknetFeedMessage] = useState('');
  const [worknetFeedStatus, setWorknetFeedStatus] = useState<WorknetProjectFeedStatus>('success');
  const [worknetReloadKey, setWorknetReloadKey] = useState(0);
  const [seniorProfile, setSeniorProfile] = useState<SeniorProfileData | null>(null);
  const [isSeniorProfileResolved, setIsSeniorProfileResolved] = useState(role !== 'senior');
  const [serverSearchMeta, setServerSearchMeta] = useState<
    Pick<
      FullJobSearchResult,
      | 'catalogTotal'
      | 'closingSoonTotal'
      | 'page'
      | 'partTimeTotal'
      | 'preferredTotal'
      | 'total'
      | 'totalPages'
    > | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const preferredProfileCategories = useMemo(
    () => getProfilePreferredCategories(seniorProfile),
    [seniorProfile],
  );
  const preferredProfilePreferences = useMemo(
    () => getProfilePreferredPreferences(seniorProfile),
    [seniorProfile],
  );
  const primaryProfileCategory = useMemo(
    () => getProfilePrimaryCategory(seniorProfile),
    [seniorProfile],
  );
  const primaryProfilePreference = useMemo(
    () => getProfilePrimaryPreference(seniorProfile),
    [seniorProfile],
  );
  const effectivePrimaryProfileFilter =
    primaryProfilePreference === OTHER_OCCUPATION_PREFERENCE
      ? customOccupationMatch
      : primaryProfileCategory;

  useEffect(() => {
    if (detailContainerRef.current && typeof detailContainerRef.current.scrollTo === 'function') {
      detailContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (detailContainerRef.current) {
      detailContainerRef.current.scrollTop = 0;
    }
  }, [selectedId]);

  // Interactive Application Modal State
  const [applyingPosting, setApplyingPosting] = useState<JobPosting | null>(null);
  const [completedApplication, setCompletedApplication] = useState<{
    posting: JobPosting;
    interviewSummary: string;
    attachedFileNames: string;
    coverNote: string;
    emailMessage: string;
    recipientEmail: string;
    mailtoLink: string;
    isPublicJob: boolean;
    sourceUrl?: string;
  } | null>(null);
  const [copiedSummaryToast, setCopiedSummaryToast] = useState(false);
  const [isMobileCategoryExpanded, setIsMobileCategoryExpanded] = useState(false);
  const [applicationFiles, setApplicationFiles] = useState<File[]>([]);
  const [applicantNote, setApplicantNote] = useState('');
  const [applicationError, setApplicationError] = useState('');
  const [interviewCard, setInterviewCard] = useState<StoredExperienceCard | null>(() =>
    readStoredExperienceCard(user?.uid),
  );
  const [isApplying, setIsApplying] = useState(false);
  const interviewMatch = useMemo(
    () =>
      applyingPosting && interviewCard
        ? evaluateExperienceCardMatch(interviewCard, applyingPosting)
        : null,
    [applyingPosting, interviewCard],
  );
  const isInterviewReady = interviewMatch?.status === 'matched';
  const applyingPostingFitScore = applyingPosting
    ? applyingPosting.seniorFitScore ||
      calculatePersonalizedMatch(
        applyingPosting,
        seniorProfile,
        effectivePrimaryProfileFilter,
        interviewCard,
      ).personalizedScore
    : 0;
  const applyingPostingFitTone = getFitScoreTone(applyingPostingFitScore);

  const hasInitialPostingsRef = useRef(postings.length > 0);

  useEffect(() => {
    async function loadDatabaseProjects() {
      if (!hasInitialPostingsRef.current) {
        setIsLoadingPostings(true);
      }
      const profilePromise =
        role === 'senior'
          ? resolveSeniorProfile(user?.uid)
          : Promise.resolve<SeniorProfileData | null>(null);
      const worknetFeedPromise =
        role === 'senior'
          ? Promise.resolve<WorknetProjectFeed>({ projects: [], status: 'success' })
          : Promise.resolve<WorknetProjectFeed>({ projects: [], status: 'success' });
      const interviewCardPromise =
        role === 'senior'
          ? getLatestUserExperienceCard(user?.uid)
          : Promise.resolve<StoredExperienceCard | null>(null);
      const [userProjects, resolvedProfile, worknetFeed, resolvedInterviewCard] = await Promise.all([
        role === 'company' ? fetchProjects() : Promise.resolve([]),
        profilePromise,
        worknetFeedPromise,
        interviewCardPromise,
      ]);
      if (role === 'senior') {
        setInterviewCard(resolvedInterviewCard);
      }
      setSeniorProfile(resolvedProfile);
      setIsSeniorProfileResolved(true);
      setWorknetFeedStatus(worknetFeed.status);
      const visibleUserProjects =
        role === 'company' && user?.uid
          ? userProjects.filter((project) => !project.ownerId || project.ownerId === user.uid)
          : userProjects;
      const sourceProjects = role === 'senior' ? worknetFeed.projects : visibleUserProjects;
      setWorknetFeedMessage(
        role === 'senior' && worknetFeed.status === 'success' && sourceProjects.length === 0
          ? '내 정보의 희망 직종과 일치하는 고용24 공고를 찾지 못했습니다.'
          : (worknetFeed.message ?? ''),
      );
      setPostings(sourceProjects);
      setSelectedId((current) =>
        sourceProjects.some((posting) => posting.id === current)
          ? current
          : (sourceProjects[0]?.id ?? ''),
      );

      const resumeState = consumeApplicationResume() ?? getPendingApplicationInterview();
      if (resumeState) {
        const resumedPosting = sourceProjects.find(
          (posting) => posting.id === resumeState.projectId,
        );
        if (resumedPosting) {
          const draft = consumeApplicationDraft(resumedPosting.id);
          setApplyingPosting(resumedPosting);
          setSelectedId(resumedPosting.id);
          setApplicationFiles(draft?.files ?? []);
          setApplicantNote(draft?.note ?? '');
          setApplicationError('');
          setInterviewCard(readStoredExperienceCard(user?.uid));
        }
      }
    }

    let isSubscribed = true;
    const safetyTimer = setTimeout(() => {
      if (isSubscribed) {
        setIsLoadingPostings(false);
      }
    }, role === 'senior' ? 12_000 : 2500);

    const runDatabaseLoad = () => {
      void loadDatabaseProjects()
        .catch((error: unknown) => {
          console.warn('Failed to load project database:', error);
          setIsSeniorProfileResolved(true);
          setPostings([]);
          setSelectedId('');
          setWorknetFeedStatus('unavailable');
          setWorknetFeedMessage(
            '프로젝트 목록을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          );
        })
        .finally(() => {
          clearTimeout(safetyTimer);
          if (isSubscribed && role !== 'senior') {
            setIsLoadingPostings(false);
          }
        });
    };

    runDatabaseLoad();

    const handleProfileUpdate = () => {
      clearWorknetFeedCache();
      setWorknetReloadKey((prev) => prev + 1);
    };

    window.addEventListener('eojob_senior_profile_updated', handleProfileUpdate);
    window.addEventListener('eojob_experience_card_updated', handleProfileUpdate);
    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimer);
      window.removeEventListener('eojob_senior_profile_updated', handleProfileUpdate);
      window.removeEventListener('eojob_experience_card_updated', handleProfileUpdate);
    };
  }, [role, user?.uid, worknetReloadKey]);

  useEffect(() => {
    if (role !== 'senior' || !isSeniorProfileResolved) return undefined;

    const hasUsablePrimaryPreference = Boolean(
      primaryProfilePreference &&
        (primaryProfilePreference !== OTHER_OCCUPATION_PREFERENCE ||
          (seniorProfile?.desiredOccupationText?.trim().length ?? 0) >= 2),
    );
    if (selectedCategory === all && !hasUsablePrimaryPreference) {
      const profileRequiredTimer = window.setTimeout(() => {
        setIsLoadingPostings(false);
        setPostings([]);
        setSelectedId('');
        setServerSearchMeta(null);
        setWorknetFeedStatus('profile-required');
        setWorknetFeedMessage(
          '내 정보에서 1순위 희망 직종을 선택하면 해당 직종의 맞춤 공고만 표시됩니다.',
        );
      }, 0);
      return () => window.clearTimeout(profileRequiredTimer);
    }

    const abortController = new AbortController();
    let active = true;
    const delay = query.trim() ? 300 : 0;
    const timer = window.setTimeout(() => {
      const selectedOccupationCategory = normalizeOccupationCategory(selectedCategory);
      const isDefaultCustomMatch =
        selectedCategory === all &&
        primaryProfilePreference === OTHER_OCCUPATION_PREFERENCE;
      const isCustomMatchSelected =
        selectedCategory === customOccupationMatch || isDefaultCustomMatch;
      const isAllDatabaseSelected = selectedCategory === allDatabase;
      let categories: JobOccupationFilter[] = [];
      if (!isAllDatabaseSelected && !isCustomMatchSelected) {
        if (selectedCategory === unclassifiedOccupation) {
          categories = [unclassifiedOccupation];
        } else if (selectedCategory === all && primaryProfileCategory) {
          categories = [primaryProfileCategory];
        } else if (selectedOccupationCategory) {
          categories = [selectedOccupationCategory];
        }
      }
      let desiredCategories: OccupationPreference[] = [];
      if (isAllDatabaseSelected) {
        desiredCategories = preferredProfilePreferences;
      } else if (!isCustomMatchSelected && selectedOccupationCategory) {
        desiredCategories = [selectedOccupationCategory];
      } else if (!isCustomMatchSelected && selectedCategory === all && primaryProfileCategory) {
        desiredCategories = [primaryProfileCategory];
      }
      const otherOccupationRank =
        preferredProfilePreferences.indexOf(OTHER_OCCUPATION_PREFERENCE) + 1;
      const shouldUseOtherOccupation =
        otherOccupationRank > 0 && (isCustomMatchSelected || isAllDatabaseSelected);
      const profileText = [
        shouldUseOtherOccupation ? seniorProfile?.desiredOccupationText : '',
        seniorProfile?.field,
        seniorProfile?.experience,
        seniorProfile?.solvedExperiences,
        seniorProfile?.keySkills,
      ]
        .filter(Boolean)
        .join(' ');

      setIsLoadingPostings(true);
      void searchFullJobDatabase({
        categories,
        desiredCategories,
        desiredLocation: seniorProfile?.desiredLocation,
        desiredOccupationRank: shouldUseOtherOccupation
          ? isCustomMatchSelected
            ? 1
            : otherOccupationRank
          : undefined,
        desiredOccupationText: shouldUseOtherOccupation
          ? seniorProfile?.desiredOccupationText
          : undefined,
        employmentType: selectedEmploymentType,
        experienceCardCategory: interviewCard?.category,
        experienceCardText: getExperienceCardRecommendationText(interviewCard),
        experienceYears: Number.parseInt(seniorProfile?.period ?? '', 10) || 0,
        hiringStage: selectedHiringStage,
        page: currentPage,
        pageSize: itemsPerPage,
        profileText,
        query,
        requireDesiredOccupationMatch: isCustomMatchSelected,
        signal: abortController.signal,
        sortBy,
        workType: selectedWorkType,
      })
        .then((result) => {
          if (!active) return;
          setServerSearchMeta({
            catalogTotal: result.catalogTotal,
            closingSoonTotal: result.closingSoonTotal,
            page: result.page,
            partTimeTotal: result.partTimeTotal,
            preferredTotal: result.preferredTotal,
            total: result.total,
            totalPages: result.totalPages,
          });
          setPostings(result.items);
          setCurrentPage(result.page);
          setSelectedId((current) =>
            result.items.some((posting) => posting.id === current)
              ? current
              : (result.items[0]?.id ?? ''),
          );
          setWorknetFeedStatus('success');
          setWorknetFeedMessage(
            result.total === 0 ? '전체 데이터베이스에서 조건에 맞는 채용공고를 찾지 못했습니다.' : '',
          );
        })
        .catch(async (error: unknown) => {
          if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
          console.warn('Full job database search failed:', error);
          try {
            const fallback = await fetchWorknetSeniorProjectFeed({
              forceRefresh: true,
              includeAnyCareer: true,
            });
            if (!active) return;
            setServerSearchMeta(null);
            setPostings(fallback.projects);
            setSelectedId(fallback.projects[0]?.id ?? '');
          } catch {
            if (!active) return;
            setPostings([]);
            setSelectedId('');
          }
          setWorknetFeedStatus('unavailable');
          setWorknetFeedMessage(
            '전체 데이터베이스 검색 연결이 원활하지 않아 임시 목록을 표시합니다. 잠시 후 다시 시도해 주세요.',
          );
        })
        .finally(() => {
          if (active) setIsLoadingPostings(false);
        });
    }, delay);

    return () => {
      active = false;
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [
    currentPage,
    isSeniorProfileResolved,
    interviewCard,
    primaryProfileCategory,
    primaryProfilePreference,
    preferredProfilePreferences,
    query,
    role,
    selectedCategory,
    selectedEmploymentType,
    selectedHiringStage,
    selectedWorkType,
    seniorProfile,
    sortBy,
    worknetReloadKey,
  ]);

  function handleApply(posting: JobPosting) {
    if (role === 'senior') {
      setApplyingPosting(posting);
      setApplicationFiles([]);
      setApplicantNote('');
      setApplicationError('');
      setInterviewCard(readStoredExperienceCard(user?.uid));
      void getLatestUserExperienceCard(user?.uid).then(setInterviewCard);
    } else {
      const text = `✓ [${posting.companyName}] 시니어 인재에게 프로젝트 제안이 성공적으로 전달되었습니다.`;
      setActionNotice(text);
      setTimeout(() => setActionNotice(''), 4000);
    }
  }

  function handleApplicationFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    const validFiles = selectedFiles.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      return (
        ALLOWED_APPLICATION_FILE_EXTENSIONS.includes(extension) &&
        file.size <= MAX_APPLICATION_FILE_SIZE
      );
    });

    if (validFiles.length !== selectedFiles.length) {
      setApplicationError('PDF, DOC, DOCX 형식의 10MB 이하 파일만 첨부할 수 있습니다.');
    } else {
      setApplicationError('');
    }

    const mergedFiles = [...applicationFiles];
    for (const file of validFiles) {
      const isDuplicate = mergedFiles.some(
        (currentFile) => currentFile.name === file.name && currentFile.size === file.size,
      );
      if (!isDuplicate) mergedFiles.push(file);
    }

    if (mergedFiles.length > MAX_APPLICATION_FILES) {
      setApplicationError('첨부파일은 최대 2개까지 등록할 수 있습니다.');
    }
    setApplicationFiles(mergedFiles.slice(0, MAX_APPLICATION_FILES));
  }

  function handleRemoveApplicationFile(index: number) {
    setApplicationFiles((files) => files.filter((_, fileIndex) => fileIndex !== index));
    setApplicationError('');
  }

  function handleStartApplicationInterview() {
    if (!applyingPosting) return;
    preserveApplicationDraft(applyingPosting.id, applicationFiles, applicantNote);
    beginApplicationInterview(applyingPosting.id, window.location.pathname, {
      targetCategory: applyingPosting.category,
      targetTitle: applyingPosting.title,
    });
    void navigate('/senior/experience/interview');
  }

  function handleCloseApplication() {
    cancelApplicationInterview();
    setApplyingPosting(null);
    setApplicationError('');
  }

  async function handleConfirmSubmitApplication() {
    if (!applyingPosting || !interviewCard || !isInterviewReady || applicationFiles.length === 0) {
      setApplicationError(
        !interviewCard || !isInterviewReady
          ? '지원 직종에 맞는 AI 인터뷰를 완료한 뒤 제출해 주세요.'
          : '1개 이상의 첨부파일을 확인해 주세요.',
      );
      return;
    }
    const attachedFileNames = applicationFiles.map((file) => file.name).join(', ');
    const interviewSummary = getInterviewSummary(interviewCard);
    setIsApplying(true);
    try {
      await createProposalFromPosting(
        applyingPosting,
        attachedFileNames,
        interviewSummary,
        applicantNote,
        user?.uid,
        { email: user?.email, name: user?.name },
      );
      const emailResult = sendApplicationEmailToManager(applyingPosting, {
        applicantName:
          user?.name && user.name !== '김인재'
            ? user.name
            : user?.email === 'sehddnr2@gmail.com'
              ? '이동욱'
              : user?.name || '이동욱',
        applicantEmail: user?.email || 'sehddnr2@gmail.com',
        attachedResumeName: attachedFileNames,
        interviewSummary,
        coverNote: applicantNote,
      });

      const isPublicJob =
        !applyingPosting.contactEmail?.trim() ||
        applyingPosting.source === 'worknet' ||
        applyingPosting.source === 'seoul' ||
        applyingPosting.source === 'public';

      setCompletedApplication({
        posting: applyingPosting,
        interviewSummary,
        attachedFileNames,
        coverNote: applicantNote,
        emailMessage: emailResult.message,
        recipientEmail: emailResult.recipientEmail,
        mailtoLink: emailResult.mailtoLink,
        isPublicJob,
        sourceUrl: applyingPosting.sourceUrl,
      });

      const text = `✓ [${applyingPosting.companyName}] 지원서 제출 및 이어잡 기록 저장 완료!`;
      setActionNotice(text);
      setApplyingPosting(null);
      setApplicationFiles([]);
      setApplicationError('');
      setTimeout(() => setActionNotice(''), 7000);
    } catch (err) {
      console.error('Failed to submit proposal:', err);
    } finally {
      setIsApplying(false);
    }
  }

  async function handleRegisterProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = (formData.get('title') as string) || '';
    const companyName = (formData.get('companyName') as string) || '';
    const problemStatement = (formData.get('problemStatement') as string) || '';
    const projectGoal = (formData.get('projectGoal') as string) || '';
    const category = (formData.get('category') as ProjectCategory) || 'operations';

    if (!title.trim() || !companyName.trim() || !problemStatement.trim()) return;

    setIsSubmitting(true);
    try {
      const { project: created, savedToFirestore } = await createProject({
        ownerId: user?.uid,
        companyName,
        industry: 'IT / SW',
        companySize: '50-100명',
        title,
        category,
        seniority: 'lead',
        employmentType: 'project',
        hiringStage: 'open',
        workType: 'hybrid',
        location: '서울 강남',
        experienceYears: '10년 이상',
        salaryRange: '월 600만-900만',
        deadline:
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ??
          '2026-09-30',
        projectDuration: '3개월',
        collaborationTargets: ['C-Level', '개발팀', '운영팀'],
        coreResponsibilities: [problemStatement, projectGoal || title],
        qualifications: ['관련 영역 10년 이상 경력', '프로젝트 주도 경험'],
        benefits: ['재택/하이브리드 근무', '자율 근태'],
        problemStatement,
        projectGoal: projectGoal || title,
        successMetrics: ['목표 KPI 100% 달성'],
        requiredSkills: ['전략 수립', '프로세스 개선'],
        preferredSkills: ['동종 산업 리딩 경험'],
        matchingSignals: ['유사 문제 해결 경험'],
        recommendedTalentType: '해당 영역 10년+ 총괄 경험을 가진 시니어 리드',
        matchingScoreCriteria: ['직무 연관성', '문제 해결 경험', '협업 적합도'],
        interviewFocus: ['프로젝트 목표 및 성공 경험', '핵심 문제 해결 접근 방식'],
        seniorFitScore: 95,
      });

      setPostings((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setIsRegisterOpen(false);
      setActionNotice(
        savedToFirestore
          ? '프로젝트가 데이터베이스에 등록되었습니다.'
          : '프로젝트를 기기에 저장했습니다. 서버 연결 후 다시 동기화해 주세요.',
      );
      setTimeout(() => setActionNotice(''), 7000);
    } catch (err) {
      console.error('Failed to create project in Firestore:', err);
      setActionNotice(
        '프로젝트를 기기에 임시 저장했지만 서버 등록을 확인하지 못했습니다. 다시 시도해 주세요.',
      );
      setTimeout(() => setActionNotice(''), 7000);
    } finally {
      setIsSubmitting(false);
    }
  }

  const seniorCategoryFilters = useMemo<FilterOption[]>(() => {
    const options: FilterOption[] = [
      { id: allDatabase, label: '전체 공고' },
    ];
    const addedIds = new Set<string>([allDatabase]);

    preferredProfilePreferences.forEach((preference, index) => {
      const filterId =
        preference === OTHER_OCCUPATION_PREFERENCE
          ? customOccupationMatch
          : preference;
      addedIds.add(filterId);
      options.push({
        id: filterId,
        label:
          preference === OTHER_OCCUPATION_PREFERENCE
            ? `기타 · ${seniorProfile?.desiredOccupationText?.trim() || '직접 입력'}`
            : occupationCategoryLabels[preference] || preference,
        badge: `${index + 1}순위`,
      });
    });

    occupationCategoryOptions.forEach((opt) => {
      if (!addedIds.has(opt.id)) {
        addedIds.add(opt.id);
        options.push({
          id: opt.id,
          label: opt.label,
        });
      }
    });

    options.push({
      id: unclassifiedOccupation,
      label: '기타·직무 확인 필요',
    });

    return options;
  }, [preferredProfilePreferences, seniorProfile?.desiredOccupationText]);

  const activeCategoryFilters = role === 'senior' ? seniorCategoryFilters : categoryFilters;
  const effectiveSelectedCategory =
    role === 'senior' && selectedCategory === all && effectivePrimaryProfileFilter
      ? effectivePrimaryProfileFilter
      : selectedCategory;
  const isServerSearchActive = role === 'senior' && serverSearchMeta !== null;

  const filteredPostings = useMemo(() => {
    if (isServerSearchActive) return postings;

    const normalizedQuery = query.trim().toLowerCase();

    return postings
      .filter((posting) => {
        const postingOccupationCategory = getPostingOccupationCategory(posting);
        const hasConfidentOccupation =
          posting.occupationClassificationStatus !== 'ambiguous';
        const selectedOccupationCategory = normalizeOccupationCategory(selectedCategory);
        const isDirectOccupationMatch = doesPostingMatchDesiredOccupationText(
          posting,
          seniorProfile?.desiredOccupationText,
        );
        const matchesCategory =
          selectedCategory === allDatabase ||
          (selectedCategory === unclassifiedOccupation && !hasConfidentOccupation) ||
          (selectedCategory === customOccupationMatch && isDirectOccupationMatch) ||
          (selectedCategory === all
            ? primaryProfilePreference === OTHER_OCCUPATION_PREFERENCE
              ? isDirectOccupationMatch
              : !primaryProfileCategory ||
                (hasConfidentOccupation && postingOccupationCategory === primaryProfileCategory)
            : selectedOccupationCategory
              ? hasConfidentOccupation && postingOccupationCategory === selectedOccupationCategory
              : (posting.category as string) === (selectedCategory as string));
        const matchesWorkType = selectedWorkType === all || posting.workType === selectedWorkType;
        const matchesEmploymentType =
          selectedEmploymentType === all ||
          (selectedEmploymentType === 'part-time'
            ? posting.employmentType === 'part-time' ||
              posting.title.includes('시간제') ||
              posting.title.includes('파트타임') ||
              posting.title.includes('오전') ||
              posting.title.includes('오후') ||
              posting.workSchedule?.includes('시간제') ||
              posting.workSchedule?.includes('오전') ||
              posting.workSchedule?.includes('오후') ||
              posting.experienceYears?.includes('시간제')
            : selectedEmploymentType === 'contract'
              ? posting.employmentType === 'contract' ||
                posting.title.includes('계약직') ||
                posting.title.includes('기간제') ||
                posting.experienceYears?.includes('계약직')
              : posting.employmentType === selectedEmploymentType);
        const matchesHiringStage =
          selectedHiringStage === all || posting.hiringStage === selectedHiringStage;
        const searchableText = [
          posting.companyName,
          posting.title,
          posting.industry,
          posting.location,
          posting.problemStatement,
          posting.projectGoal,
          posting.recommendedTalentType,
          ...(posting.requiredSkills || []),
          ...(posting.preferredSkills || []),
          ...(posting.matchingSignals || []),
          ...(posting.interviewFocus || []),
        ]
          .join(' ')
          .toLowerCase();

        const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
        const matchesQuery =
          queryTokens.length === 0 ||
          queryTokens.every((token) => searchableText.includes(token));

        return (
          matchesCategory &&
          matchesWorkType &&
          matchesEmploymentType &&
          matchesHiringStage &&
          matchesQuery
        );
      })
      .sort((first, second) => {
        if (sortBy === 'deadline-asc') {
          return new Date(first.deadline).getTime() - new Date(second.deadline).getTime();
        }
        if (sortBy === 'latest-desc') {
          return new Date(second.postedAt).getTime() - new Date(first.postedAt).getTime();
        }
        const scoreFirst =
          role === 'senior'
            ? calculatePersonalizedMatch(
                first,
                seniorProfile,
                effectiveSelectedCategory,
                interviewCard,
              ).personalizedScore
            : first.seniorFitScore;
        const scoreSecond =
          role === 'senior'
            ? calculatePersonalizedMatch(
                second,
                seniorProfile,
                effectiveSelectedCategory,
                interviewCard,
              ).personalizedScore
            : second.seniorFitScore;
        return scoreSecond - scoreFirst;
      });
  }, [
    postings,
    query,
    role,
    selectedCategory,
    selectedEmploymentType,
    selectedHiringStage,
    selectedWorkType,
    seniorProfile,
    sortBy,
    isServerSearchActive,
    interviewCard,
    effectiveSelectedCategory,
    primaryProfileCategory,
    primaryProfilePreference,
  ]);

  const displayedResultCount = isServerSearchActive
    ? (serverSearchMeta?.total ?? 0)
    : filteredPostings.length;
  const totalPages = isServerSearchActive
    ? Math.max(1, serverSearchMeta?.totalPages ?? 1)
    : Math.max(1, Math.ceil(filteredPostings.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPostings = useMemo(() => {
    if (isServerSearchActive) return filteredPostings;

    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredPostings.slice(start, start + itemsPerPage);
  }, [filteredPostings, isServerSearchActive, safeCurrentPage, itemsPerPage]);

  const selectedPosting =
    filteredPostings.find((posting) => posting.id === selectedId) ?? filteredPostings[0];
  const activeFilterCount =
    Number(selectedCategory !== all && selectedCategory !== allDatabase) +
    Number(selectedWorkType !== all) +
    Number(selectedEmploymentType !== all) +
    Number(selectedHiringStage !== all) +
    Number(sortBy !== 'fit-desc');
  const hasActiveFilters = activeFilterCount > 0 || Boolean(query);
  const selectedCategoryLabel =
    activeCategoryFilters.find((category) => category.id === effectiveSelectedCategory)?.label ??
    '전체';
  const activeHiringStageFilters =
    role === 'senior' ? worknetPostingStatusFilters : companyHiringStageFilters;

  const preferredPostingsForScore = useMemo(() => {
    if (!seniorProfile || preferredProfilePreferences.length === 0) return [];
    return postings.filter(
      (posting) => {
        const actualCategoryMatch =
          posting.occupationClassificationStatus !== 'ambiguous' &&
          preferredProfileCategories.includes(getPostingOccupationCategory(posting));
        const directOccupationMatch =
          preferredProfilePreferences.includes(OTHER_OCCUPATION_PREFERENCE) &&
          doesPostingMatchDesiredOccupationText(posting, seniorProfile.desiredOccupationText);
        return actualCategoryMatch || directOccupationMatch;
      },
    );
  }, [postings, preferredProfileCategories, preferredProfilePreferences, seniorProfile]);

  const preferredPostingsCount = isServerSearchActive
    ? (serverSearchMeta?.preferredTotal ?? 0)
    : preferredPostingsForScore.length;

  const locallyCalculatedPartTimePostingsCount = useMemo(() => {
    return postings.filter(
      (posting) =>
        posting.employmentType === 'part-time' ||
        posting.title.includes('시간제') ||
        posting.title.includes('파트타임') ||
        posting.title.includes('오전') ||
        posting.title.includes('오후') ||
        posting.workSchedule?.includes('시간제') ||
        posting.workSchedule?.includes('오전') ||
        posting.workSchedule?.includes('오후') ||
        posting.experienceYears?.includes('시간제'),
    ).length;
  }, [postings]);
  const partTimePostingsCount = isServerSearchActive
    ? (serverSearchMeta?.partTimeTotal ?? 0)
    : locallyCalculatedPartTimePostingsCount;
  const closingSoonPostingsCount = isServerSearchActive
    ? (serverSearchMeta?.closingSoonTotal ?? 0)
    : postings.filter((posting) => posting.hiringStage === 'closing').length;

  function changeQuery(value: string) {
    setQuery(value);
    setCurrentPage(1);
  }

  function changeCategory(value: CategoryFilter) {
    setSelectedCategory(value);
    setCurrentPage(1);
  }

  function changeWorkType(value: WorkTypeFilter) {
    setSelectedWorkType(value);
    setCurrentPage(1);
  }

  function changeEmploymentType(value: EmploymentTypeFilter) {
    setSelectedEmploymentType(value);
    setCurrentPage(1);
  }

  function changeHiringStage(value: HiringStageFilter) {
    setSelectedHiringStage(value);
    setCurrentPage(1);
  }

  function changeSort(value: SortOption) {
    setSortBy(value);
    setCurrentPage(1);
  }

  function resetFilters() {
    setQuery('');
    setSelectedCategory(all);
    setSelectedWorkType(all);
    setSelectedEmploymentType(all);
    setSelectedHiringStage(all);
    setSortBy('fit-desc');
    setCurrentPage(1);
  }

  return (
    <MobilePage
      activeNav="database"
      contentClassName={cn(
        'project-ui-readable flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4' : 'px-6 pb-6 pt-7 md:px-10 md:py-8',
      )}
      role={role}
      showBack={false}
      title={title ?? (role === 'company' ? '프로젝트 관리' : '프로젝트 목록')}
    >
      <section className="rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-3 py-1 text-[12px] font-extrabold text-[#173F3A]">
              <Sparkles className="size-3.5" />
              {role === 'senior' ? '시니어 맞춤 채용 공고' : '회사 등록 프로젝트'}
            </p>
          </div>
          {role === 'company' && (
            <button
              onClick={() => setIsRegisterOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] px-3.5 py-2 text-xs font-extrabold text-white border border-[#173F3A] shadow-[0_3px_8px_rgba(23,63,58,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_5px_14px_rgba(23,63,58,0.35)] active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>새 프로젝트 등록</span>
            </button>
          )}
        </div>
        <h1 className="mt-2 text-base sm:text-lg md:text-xl font-extrabold leading-snug text-[#17212B]">
          {role === 'senior'
            ? '경력과 전문성을 살릴 수 있는 맞춤 채용 공고'
            : '등록한 프로젝트와 채용 진행 상태를 관리하세요'}
        </h1>
        <p className="mt-1.5 text-[12px] sm:text-[13px] font-medium leading-relaxed text-slate-600">
          {role === 'senior'
            ? '내 정보의 1순위 희망 직종을 먼저 적용하고, 경력·핵심 역량과 AI 경험 인터뷰 결과로 추천 순서를 계산합니다.'
            : '회사가 직접 등록한 프로젝트의 내용과 지원서 검토·담당자 인터뷰 단계를 한눈에 확인하세요.'}
        </p>
      </section>

      {role === 'senior' ? (
        <section className="rounded-2xl border border-[#BBD5CE] bg-[#F8FCFB] p-3.5 sm:p-4 shadow-xs">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] font-extrabold text-[#173F3A]">내 정보 기반 추천 조건</p>
            <button
              className="inline-flex min-h-11 items-center justify-center self-start rounded-xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] px-3.5 py-2 text-[12px] font-extrabold text-white border border-[#173F3A] shadow-[0_3px_8px_rgba(23,63,58,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_5px_14px_rgba(23,63,58,0.35)] active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer sm:self-auto"
              onClick={() => void navigate('/basic-profile')}
              type="button"
            >
              내 정보 확인·수정 →
            </button>
          </div>
          {preferredProfileCategories.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {preferredProfileCategories.map((category, index) => (
                <span
                  className="inline-flex items-center rounded-lg border border-[#BBD5CE]/70 bg-white/95 px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-[#173F3A] shadow-none cursor-default select-none"
                  key={category}
                >
                  {index + 1}순위 · {occupationCategoryLabels[category]}
                </span>
              ))}
              {seniorProfile?.period ? (
                <span className="inline-flex items-center rounded-lg border border-[#E0D9C8] bg-[#FAF7F2] px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-slate-600 shadow-none cursor-default select-none">
                  경력 {seniorProfile.period}
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-lg border border-[#BBD5CE]/70 bg-white/95 px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-[#173F3A] shadow-none cursor-default select-none">
                📍 희망지역: {seniorProfile?.desiredLocation || '전국'}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] sm:text-[12px] font-extrabold shadow-none cursor-default select-none',
                  interviewCard
                    ? 'border-[#F06B4F]/30 bg-[#FDF0ED] text-[#D85A3F]'
                    : 'border-[#E0D9C8] bg-white text-slate-500',
                )}
              >
                {interviewCard
                  ? '✨ AI 경험 인터뷰의 역할·행동·성과 반영됨'
                  : 'AI 경험 인터뷰 미등록 · 내 정보만 반영 중'}
              </span>
            </div>
          ) : (
            <p className="mt-1.5 text-[12px] font-medium text-slate-600">
              희망 직종과 경력 정보를 입력하면 해당 조건의 공고만 표시됩니다.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-[#BBD5CE] bg-[#F8FCFB] p-3.5 sm:p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <p className="text-[13px] sm:text-[14px] font-extrabold text-[#173F3A]">
              📊 기업 채용 & 프로젝트 관리 현황
            </p>
            <button
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] px-3.5 text-[11px] sm:text-[12px] font-extrabold text-white border border-[#173F3A] shadow-[0_3px_8px_rgba(23,63,58,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_5px_14px_rgba(23,63,58,0.35)] active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              onClick={() => void navigate('/company-info')}
              type="button"
            >
              기업 정보 확인·수정 →
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-lg border border-[#BBD5CE]/80 bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-extrabold text-[#173F3A]">
              등록 프로젝트 {postings.length}개
            </span>
            <span className="inline-flex items-center rounded-lg border border-[#E0D9C8] bg-[#FAF7F2] px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-slate-700">
              🟢 모집 진행 중 {postings.filter((p) => p.hiringStage === 'open').length}개
            </span>
            <span className="inline-flex items-center rounded-lg border border-[#BBD5CE]/80 bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-extrabold text-[#173F3A]">
              📋 시니어 지원서 실시간 검토 가능
            </span>
          </div>
        </section>
      )}

      {/* New Project Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#E0D9C8] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-3">
              <h3 className="text-lg font-extrabold text-[#17212B]">신규 프로젝트 등록</h3>
              <button
                onClick={() => setIsRegisterOpen(false)}
                type="button"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterProject} className="mt-4 flex flex-col gap-3.5">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                <span>회사명 *</span>
                <input
                  name="companyName"
                  required
                  defaultValue="(주) 기업명"
                  className="h-10 rounded-xl border border-[#E0D9C8] px-3 text-xs outline-none focus:border-[#173F3A]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                <span>프로젝트 제목 *</span>
                <input
                  name="title"
                  required
                  placeholder="예: 서비스 프로세스 자동화 구축"
                  className="h-10 rounded-xl border border-[#E0D9C8] px-3 text-xs outline-none focus:border-[#173F3A]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                <span>프로젝트 카테고리</span>
                <select
                  name="category"
                  className="h-10 rounded-xl border border-[#E0D9C8] px-3 text-xs outline-none focus:border-[#173F3A]"
                >
                  <option value="dev-engineering">개발/엔지니어링</option>
                  <option value="design-brand">디자인/브랜딩</option>
                  <option value="marketing-sales">마케팅/영업</option>
                  <option value="hr-strategy">인사/경영전략</option>
                  <option value="r-and-d-manufacturing">제조/R&D</option>
                  <option value="operations">운영 효율화</option>
                  <option value="growth">성장/그로스</option>
                  <option value="legacy-modernization">레거시 개선</option>
                  <option value="data-platform">데이터 플랫폼</option>
                  <option value="ai-automation">AI 자동화</option>
                  <option value="security">보안/리스크</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                <span>해결해야 할 문제 (Problem Statement) *</span>
                <textarea
                  name="problemStatement"
                  required
                  rows={3}
                  placeholder="기업이 겪고 있는 핵심 문제와 요구사항을 입력해 주세요."
                  className="rounded-xl border border-[#E0D9C8] p-3 text-xs outline-none focus:border-[#173F3A]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                <span>프로젝트 목표 (Project Goal)</span>
                <input
                  name="projectGoal"
                  placeholder="예: 작업 시간 40% 절감 및 표준 가이드 작성"
                  className="h-10 rounded-xl border border-[#E0D9C8] px-3 text-xs outline-none focus:border-[#173F3A]"
                />
              </label>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="h-10 rounded-xl border border-[#E0D9C8] px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-[#173F3A] px-5 text-xs font-extrabold text-white shadow-xs hover:bg-[#21544E]"
                >
                  {isSubmitting ? '등록 중...' : 'Firestore DB에 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Application Modal with Resume/Portfolio & AI Interview Verification */}
      {applyingPosting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 backdrop-blur-xs md:p-4">
          <div
            aria-labelledby="application-modal-title"
            aria-modal="true"
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-2xl md:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E0D9C8]/70 pb-4">
              <div className="min-w-0">
                <span className="inline-flex rounded-md border border-[#E0D9C8] bg-[#FAF7F2] px-2.5 py-1 text-[13px] font-bold text-[#173F3A]">
                  {applyingPosting.companyName}
                </span>
                <h3
                  className="mt-2 text-[20px] font-extrabold leading-[1.35] text-[#17212B] md:text-[22px]"
                  id="application-modal-title"
                >
                  프로젝트 지원 준비
                </h3>
                <p className="mt-1 text-[14px] font-medium leading-6 text-slate-600">
                  AI 인터뷰 결과와 첨부파일을 확인한 뒤 지원서를 제출하세요.
                </p>
              </div>
              <button
                aria-label="지원 창 닫기"
                type="button"
                onClick={handleCloseApplication}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              {/* Target Project Details */}
              <div className="flex items-start justify-between gap-3 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/45 p-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-[#173F3A]">지원 대상 프로젝트</p>
                  <p className="mt-1 text-[16px] font-extrabold leading-6 text-[#17212B]">
                    {applyingPosting.title}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-slate-600">
                    {getPostingOccupationLabel(applyingPosting)} · {applyingPosting.location} ·{' '}
                    {applyingPosting.salaryRange}
                  </p>
                </div>
                <span
                  aria-label={`적합도 ${applyingPostingFitScore}점, ${applyingPostingFitTone.label}`}
                  className={cn(
                    'shrink-0 rounded-xl border px-3 py-2 text-center text-[13px] font-black',
                    applyingPostingFitTone.containerClassName,
                  )}
                >
                  적합도 {applyingPostingFitScore}점 · {applyingPostingFitTone.label}
                </span>
              </div>

              {/* Step 1: AI Experience Interview */}
              <section
                className={cn(
                  'rounded-xl border p-4',
                  interviewCard && isInterviewReady
                    ? 'border-[#BBD5CE] bg-[#F4FAF8]'
                    : 'border-[#F06B4F]/35 bg-[#FFF8F6]',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full',
                        interviewCard && isInterviewReady
                          ? 'bg-[#DDEBE7] text-[#173F3A]'
                          : 'bg-[#FDF0ED] text-[#F06B4F]',
                      )}
                    >
                      {interviewCard && isInterviewReady ? (
                        <CheckCircle2 className="size-[18px]" />
                      ) : interviewCard ? (
                        <CircleAlert className="size-[18px]" />
                      ) : (
                        <Mic className="size-[18px]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[16px] font-extrabold text-[#17212B]">
                        1. AI 경험 인터뷰
                      </h4>
                      <p className="mt-1 text-[14px] font-medium leading-6 text-slate-600">
                        {!interviewCard
                          ? '아직 완료된 인터뷰가 없습니다. 약 5분 인터뷰 후 결과 카드까지 확인할 수 있습니다.'
                          : interviewMatch?.message}
                      </p>
                    </div>
                  </div>
                  {interviewMatch ? (
                    <span
                      className={cn(
                        'shrink-0 rounded-full border bg-white px-2.5 py-1 text-[12px] font-extrabold',
                        isInterviewReady
                          ? 'border-[#BBD5CE] text-[#059669]'
                          : 'border-[#F06B4F]/35 text-[#D85A3F]',
                      )}
                    >
                      {isInterviewReady
                        ? '직종 적합'
                        : interviewMatch.status === 'mismatch'
                          ? '직종 불일치'
                          : '확인 필요'}
                    </span>
                  ) : null}
                </div>

                {interviewCard ? (
                  <>
                    <div
                      className={cn(
                        'mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-bold',
                        isInterviewReady
                          ? 'border-[#BBD5CE] bg-[#DDEBE7]/50 text-[#173F3A]'
                          : 'border-[#F06B4F]/25 bg-white text-[#D85A3F]',
                      )}
                    >
                      <span>저장 카드: {interviewMatch?.cardCategoryLabel}</span>
                      <ArrowRight className="size-3.5" />
                      <span>지원 직종: {getPostingOccupationLabel(applyingPosting)}</span>
                    </div>
                    <div
                      className={cn(
                        'mt-3 grid overflow-hidden rounded-xl border border-[#BBD5CE] bg-white',
                        isMobile ? 'grid-cols-1' : 'grid-cols-2',
                      )}
                    >
                      {[
                        ['문제', interviewCard.problem],
                        ['역할', interviewCard.role],
                        ['실행', interviewCard.action],
                        ['결과', interviewCard.result],
                      ].map(([label, value]) => (
                        <div
                          className="border-b border-[#E0D9C8] p-3.5 last:border-b-0 even:border-l"
                          key={label}
                        >
                          <p className="text-[12px] font-extrabold text-[#173F3A]">{label}</p>
                          <p className="mt-1 text-[14px] font-semibold leading-6 text-[#17212B]">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button
                      className={cn(
                        'mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-[14px] font-extrabold transition',
                        isInterviewReady
                          ? 'border-[#BBD5CE] text-[#173F3A] hover:bg-[#DDEBE7]/50'
                          : 'border-[#F06B4F]/35 text-[#D85A3F] hover:bg-[#FFF1ED]',
                      )}
                      onClick={handleStartApplicationInterview}
                      type="button"
                    >
                      <Mic className="size-4" />{' '}
                      {isInterviewReady
                        ? '이 지원 직종으로 인터뷰 다시 진행하기'
                        : '지원 직종 맞춤 인터뷰 진행하기'}
                    </button>
                  </>
                ) : (
                  <button
                    className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F06B4F] px-4 text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#D85A3F]"
                    onClick={handleStartApplicationInterview}
                    type="button"
                  >
                    <Mic className="size-[18px]" /> AI 인터뷰 시작하고 결과 확인하기
                    <ArrowRight className="size-4" />
                  </button>
                )}
              </section>

              {/* Step 2: Resume & Portfolio Attachments */}
              <section className="rounded-xl border border-[#E0D9C8] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[16px] font-extrabold text-[#17212B]">
                      2. 이력서·포트폴리오 첨부
                    </h4>
                    <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
                      PDF, DOC, DOCX · 파일당 10MB 이하 · 최대 2개
                    </p>
                  </div>
                  <label
                    className={cn(
                      'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[14px] font-extrabold transition',
                      applicationFiles.length >= MAX_APPLICATION_FILES
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : 'cursor-pointer border-[#BBD5CE] bg-[#DDEBE7]/55 text-[#173F3A] hover:bg-[#DDEBE7]',
                    )}
                  >
                    <Upload className="size-4" />
                    파일 추가 ({applicationFiles.length}/{MAX_APPLICATION_FILES})
                    <input
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      disabled={applicationFiles.length >= MAX_APPLICATION_FILES}
                      multiple
                      onChange={handleApplicationFilesChange}
                      type="file"
                    />
                  </label>
                </div>

                {applicationFiles.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {applicationFiles.map((file, index) => (
                      <div
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-3.5 py-2.5"
                        key={`${file.name}-${file.size}`}
                      >
                        <FileText className="size-[18px] shrink-0 text-[#173F3A]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-extrabold text-[#17212B]">
                            {file.name}
                          </p>
                          <p className="text-[12px] font-medium text-slate-500">
                            {formatFileSize(file.size)} · 첨부 완료
                          </p>
                        </div>
                        <button
                          aria-label={`${file.name} 삭제`}
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-[#F06B4F]"
                          onClick={() => handleRemoveApplicationFile(index)}
                          type="button"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex min-h-20 items-center justify-center rounded-xl border border-dashed border-[#CFC6B3] bg-[#FAF7F2]/70 px-4 text-center text-[14px] font-semibold text-slate-500">
                    제출할 이력서 또는 포트폴리오를 1개 이상 추가해 주세요.
                  </div>
                )}

                {applicationError ? (
                  <p
                    aria-live="polite"
                    className="mt-2 flex items-start gap-1.5 text-[13px] font-bold leading-5 text-[#D85A3F]"
                  >
                    <CircleAlert className="mt-0.5 size-4 shrink-0" /> {applicationError}
                  </p>
                ) : null}
              </section>

              {/* Manager Email System Notice */}
              <div className="flex items-start gap-2.5 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/60 p-3.5 text-[14px] font-bold leading-6 text-[#173F3A]">
                <Mail className="mt-0.5 size-[18px] shrink-0 text-[#173F3A]" />
                <div className="flex flex-col gap-0.5">
                  <span>
                    지원 완료 시 기업 채용 담당자 이메일로 실시간 지원서 알림이 자동 전송됩니다.
                  </span>
                  <span className="text-[13px] font-medium text-slate-600">
                    첨부파일, 이어잡 추천 점수, AI 경험 결과가 함께 전달됩니다.
                  </span>
                </div>
              </div>

              {/* Step 3: Optional Cover Message */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-[15px] font-extrabold text-[#17212B]"
                  htmlFor="application-note"
                >
                  3. 기업 담당자 전달 메시지 (선택)
                </label>
                <textarea
                  id="application-note"
                  rows={2}
                  value={applicantNote}
                  onChange={(e) => setApplicantNote(e.target.value)}
                  placeholder="예: 12년간의 유사 프로젝트 수립 노하우로 빠른 기간 내 성과를 내겠습니다."
                  className="min-h-24 rounded-xl border border-[#E0D9C8] p-3.5 text-[15px] leading-6 outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/10"
                />
              </div>

              {/* Action Buttons */}
              <div
                className={cn(
                  'gap-2.5 border-t border-[#E0D9C8]/70 pt-4',
                  isMobile ? 'flex flex-col-reverse' : 'flex items-center justify-end',
                )}
              >
                <button
                  type="button"
                  onClick={handleCloseApplication}
                  className={cn(
                    'h-12 rounded-xl border border-[#E0D9C8] px-5 text-[15px] font-bold text-slate-600 transition hover:bg-slate-50',
                    isMobile && 'w-full',
                  )}
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={isApplying || !isInterviewReady || applicationFiles.length === 0}
                  onClick={() => void handleConfirmSubmitApplication()}
                  className={cn(
                    'h-12 rounded-xl bg-[#173F3A] px-6 text-[15px] font-extrabold text-white shadow-md transition hover:bg-[#12332F] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none',
                    isMobile && 'w-full',
                  )}
                >
                  {isApplying ? '지원서 제출 중...' : '🚀 최종 지원서 제출하기'}
                </button>
              </div>
              {!isInterviewReady || applicationFiles.length === 0 ? (
                <p className="text-right text-[13px] font-semibold text-slate-500">
                  {!interviewCard
                    ? 'AI 인터뷰 완료와 첨부파일 1개 이상이 필요합니다.'
                    : !isInterviewReady
                      ? `${getPostingOccupationLabel(applyingPosting)} 직종에 맞는 인터뷰가 필요합니다.`
                      : '첨부파일을 1개 이상 등록해 주세요.'}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {completedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-[#E0D9C8] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8F5E9] text-[#2E7D32]">
                  <CheckCircle className="size-7" />
                </div>
                <div>
                  <span className="inline-block rounded-full bg-[#173F3A]/10 px-3 py-1 text-[12px] font-extrabold text-[#173F3A]">
                    제출 완료
                  </span>
                  <h3 className="mt-1 text-[20px] font-extrabold text-[#17212B]">
                    프로젝트 지원이 접수되었습니다!
                  </h3>
                </div>
              </div>
              <button
                aria-label="닫기"
                className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-[#F7F3EA] hover:text-[#17212B]"
                onClick={() => setCompletedApplication(null)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2] p-4">
              <p className="text-[12px] font-extrabold text-slate-500">지원 대상 기업 / 공고</p>
              <h4 className="mt-1 text-[16px] font-extrabold text-[#17212B]">
                {completedApplication.posting.title}
              </h4>
              <p className="mt-1 text-[14px] font-bold text-[#173F3A]">
                {completedApplication.posting.companyName}
              </p>
            </div>

            {completedApplication.isPublicJob ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[#BBD5CE] bg-[#F4F9F8] p-4">
                  <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#173F3A]">
                    <span>🏛️</span>
                    <span>공식 채용 포털 지원 연동</span>
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-600">
                    이어잡 DB에 지원 기록 저장이 완료되었습니다. 채용 담당자에게 접수하기 위해 **AI 경험 요약을 복사**한 후 **공식 원문 접수처로 이동**하세요.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#173F3A] py-3.5 px-4 text-[15px] font-extrabold text-white shadow-md transition hover:bg-[#21544E] active:scale-[0.99]"
                    onClick={() => {
                      const textToCopy = `[이음잡 40+ AI 경험 인터뷰 검증 요약]\n지원 공고: ${completedApplication.posting.title} (${completedApplication.posting.companyName})\n\n■ AI 검증 역량 분석:\n${completedApplication.interviewSummary}\n\n■ 한 줄 지원 소신:\n"${completedApplication.coverNote || '10년 이상 실무 노하우를 발휘하겠습니다.'}"`;
                      void navigator.clipboard.writeText(textToCopy);
                      setCopiedSummaryToast(true);
                      setTimeout(() => setCopiedSummaryToast(false), 4000);
                    }}
                    type="button"
                  >
                    <Copy className="size-4 shrink-0" />
                    <span>📋 AI 경험 검증 요약 원클릭 복사하기</span>
                  </button>

                  {copiedSummaryToast && (
                    <p className="text-center text-[13px] font-extrabold text-[#2E7D32] animate-in fade-in">
                      ✓ 클립보드에 복사되었습니다! (원문 접수처 자소서/지원동기 칸에 붙여넣으세요)
                    </p>
                  )}

                  {completedApplication.sourceUrl ? (
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#173F3A] bg-white py-3.5 px-4 text-[15px] font-extrabold text-[#173F3A] transition hover:bg-[#F4F9F8] active:scale-[0.99]"
                      onClick={() => {
                        window.open(completedApplication.sourceUrl, '_blank');
                      }}
                      type="button"
                    >
                      <ExternalLink className="size-4 shrink-0" />
                      <span>👉 공식 채용 원문 접수처로 이동</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[#BBD5CE] bg-[#F4F9F8] p-4">
                  <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#173F3A]">
                    <span>✉️</span>
                    <span>기업 담당자 직통 전달 완료</span>
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-600">
                    기업 채용 담당자({completedApplication.recipientEmail})의 메일함 및 기업 전용 지원서 관리 대시보드로 성공적으로 지원서가 전송되었습니다.
                  </p>
                </div>

                <a
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#173F3A] py-3.5 px-4 text-[15px] font-extrabold text-white shadow-md transition hover:bg-[#21544E] active:scale-[0.99]"
                  href={completedApplication.mailtoLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Mail className="size-4 shrink-0" />
                  <span>✉️ 담당자 지원 이메일 작성 창 실행</span>
                </a>
              </div>
            )}

            <div className="mt-6 border-t border-[#E0D9C8] pt-4">
              <button
                className="w-full rounded-2xl bg-[#F7F3EA] py-3.5 text-[15px] font-extrabold text-[#17212B] transition hover:bg-[#EFE9DC]"
                onClick={() => setCompletedApplication(null)}
                type="button"
              >
                확인 (이어잡 지원 이력 보기)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
        <DatabaseMetric
          caption={role === 'senior' ? '실시간 기준' : '회사 직접 등록 기준'}
          label={role === 'senior' ? '조회 공고' : '등록 프로젝트'}
          value={`${role === 'senior' ? (serverSearchMeta?.catalogTotal ?? postings.length) : postings.length}건`}
        />
        <DatabaseMetric
          caption={
            role === 'senior' && seniorProfile && preferredProfileCategories.length > 0
              ? '1순위 희망 직종 기준'
              : '맞춤 희망 조건 부합 기준'
          }
          label="추천 건수"
          value={
            role === 'senior' ? `${preferredPostingsCount}건` : `${postings.length}건`
          }
        />
        <DatabaseMetric
          caption={role === 'senior' ? '시간제·파트타임·유연근무 기준' : '현재 지원 접수 가능'}
          label="시간제 채용"
          value={`${partTimePostingsCount}건`}
        />
        <DatabaseMetric
          caption={role === 'senior' ? '마감일까지 7일 이내' : '등록 마감일 기준'}
          label="마감 임박"
          value={`${closingSoonPostingsCount}건`}
        />
      </div>

      {isMobile ? (
        <section className="rounded-[20px] border border-[#E0D9C8] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[15px] font-extrabold text-[#17212B]">
              <Filter className="size-[18px] text-[#173F3A]" />
              프로젝트 찾기
            </div>
            <button
              className="min-h-10 rounded-full px-2 text-[12px] font-extrabold text-[#F06B4F] disabled:opacity-35"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
              type="button"
            >
              전체 초기화
            </button>
          </div>

          <div className="mt-3">
            <label
              className="block text-[12px] font-extrabold text-[#17212B]"
              htmlFor="mobile-project-search"
            >
              프로젝트 검색
            </label>
            <div className="mt-2 flex h-14 min-h-14 items-center gap-3 rounded-2xl border border-[#BBD5CE] bg-[#FAF7F2] px-4 transition focus-within:border-[#173F3A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#173F3A]/10">
              <Search aria-hidden="true" className="size-5 shrink-0 text-[#173F3A]" />
              <input
                className="h-full min-w-0 flex-1 appearance-none bg-transparent text-[16px] font-semibold text-[#17212B] outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
                id="mobile-project-search"
                onChange={(event) => changeQuery(event.target.value)}
                placeholder={
                  role === 'senior'
                    ? '회사명, 직무 또는 지역 검색'
                    : '회사명, 기술 또는 프로젝트 검색'
                }
                type="search"
                value={query}
              />
              {query ? (
                <button
                  aria-label="검색어 지우기"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-[#F7F3EA] hover:text-[#17212B]"
                  onClick={() => changeQuery('')}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 border-t border-[#E0D9C8] pt-4">
            <div className="flex items-center justify-between gap-3 pb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-[13px] font-extrabold text-[#17212B] truncate">
                  {role === 'senior' ? '🎯 직무 분야 필터' : '프로젝트 유형'}
                </p>
                {selectedCategory !== all && role === 'senior' && (
                  <span className="rounded-full bg-[#173F3A]/10 px-2 py-0.5 text-[10px] font-extrabold text-[#173F3A] truncate">
                    {selectedCategoryLabel}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCategoryExpanded((prev) => !prev)}
                className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-extrabold text-[#173F3A] hover:underline cursor-pointer"
              >
                <span>{isMobileCategoryExpanded ? '접기 ∧' : '전체 직무 보기 ∨'}</span>
              </button>
            </div>

            {!isMobileCategoryExpanded ? (
              /* Default Horizontal Scroll Chip Stream (Compact 44px Height) */
              <div
                aria-label={role === 'senior' ? '직무 분야 가로 스크롤' : '프로젝트 유형'}
                className="mt-2.5 flex w-full overflow-x-auto pb-1.5 pt-0.5 scrollbar-none gap-2"
                role="group"
              >
                {activeCategoryFilters.map((category) => {
                  const selected = effectiveSelectedCategory === category.id;
                  const badge = 'badge' in category ? category.badge : undefined;
                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex h-[38px] min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 text-[13px] font-extrabold transition whitespace-nowrap shadow-2xs',
                        selected
                          ? 'border-[#173F3A] bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-white shadow-xs'
                          : 'border-[#E0D9C8] bg-white text-[#17212B] hover:border-[#173F3A]/40 hover:bg-[#FAF7F2]',
                      )}
                      key={category.id}
                      onClick={() => changeCategory(category.id)}
                      type="button"
                    >
                      {badge ? (
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-extrabold',
                            selected ? 'bg-white/25 text-white' : 'bg-[#173F3A]/12 text-[#173F3A]',
                          )}
                        >
                          {badge}
                        </span>
                      ) : null}
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Expanded Flex-Wrap Tag Cloud (100% Full Text, No Truncation) */
              <div
                aria-label={role === 'senior' ? '직무 분야 전체 보기' : '프로젝트 유형'}
                className="mt-2.5 flex flex-wrap gap-2 rounded-2xl border border-[#E0D9C8]/80 bg-[#FAF7F2] p-3 animate-in fade-in duration-200"
                role="group"
              >
                {activeCategoryFilters.map((category) => {
                  const selected = effectiveSelectedCategory === category.id;
                  const badge = 'badge' in category ? category.badge : undefined;
                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex h-[38px] items-center justify-center gap-1.5 rounded-full border px-3.5 text-[13px] font-extrabold transition whitespace-nowrap shadow-2xs',
                        selected
                          ? 'border-[#173F3A] bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-white shadow-xs'
                          : 'border-[#E0D9C8] bg-white text-[#17212B] hover:border-[#173F3A]/40 hover:bg-white',
                      )}
                      key={category.id}
                      onClick={() => changeCategory(category.id)}
                      type="button"
                    >
                      {badge ? (
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-extrabold',
                            selected ? 'bg-white/25 text-white' : 'bg-[#173F3A]/12 text-[#173F3A]',
                          )}
                        >
                          {badge}
                        </span>
                      ) : null}
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-[#E0D9C8] pt-4">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#17212B]">
              <SlidersHorizontal className="size-4 text-[#173F3A]" />
              상세 조건
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <SelectField
                label="고용 형태"
                mobile
                onChange={changeEmploymentType}
                options={employmentTypeFilters}
                value={selectedEmploymentType}
              />
              <SelectField
                label="근무 방식"
                mobile
                onChange={changeWorkType}
                options={workTypeFilters}
                value={selectedWorkType}
              />
              <SelectField
                label={role === 'senior' ? '공고 상태' : '진행 단계'}
                mobile
                onChange={changeHiringStage}
                options={activeHiringStageFilters}
                value={selectedHiringStage}
              />
              <SelectField
                label="정렬 기준"
                mobile
                onChange={changeSort}
                options={sortOptions}
                value={sortBy}
              />
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 text-[13px] font-extrabold text-[#17212B]">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-[#173F3A]" />
                {role === 'senior' ? '직무 분야 필터 (기본값: 내 정보 1순위)' : '프로젝트 유형 필터'}
              </div>
              {selectedCategory !== all && role === 'senior' && (
                <span className="rounded-full bg-[#173F3A]/10 px-2.5 py-0.5 text-[11px] font-extrabold text-[#173F3A]">
                  {selectedCategory === unclassifiedOccupation
                    ? `분류 확인 공고 탐색 중: ${selectedCategoryLabel}`
                    : `✨ 선택 직종 1순위 탐색 중: ${selectedCategoryLabel}`}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeCategoryFilters.map((category) => {
                const badge = 'badge' in category ? category.badge : undefined;
                const isSelected = effectiveSelectedCategory === category.id;
                return (
                  <Chip
                    key={category.id}
                    onClick={() => changeCategory(category.id)}
                    selected={isSelected}
                  >
                    {badge ? (
                      <span
                        className={cn(
                          'mr-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold',
                          isSelected
                            ? 'bg-white/25 text-white'
                            : 'bg-[#173F3A]/12 text-[#173F3A]',
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                    {category.label}
                  </Chip>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs md:grid-cols-4">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#17212B] md:col-span-4">
              <SlidersHorizontal className="size-4 text-[#173F3A]" />
              {role === 'senior' ? '채용 공고 상세 조건' : '프로젝트 상세 조건'}
            </div>
            <SelectField
              label="고용 형태"
              onChange={changeEmploymentType}
              options={employmentTypeFilters}
              value={selectedEmploymentType}
            />
            <SelectField
              label="근무 방식"
              onChange={changeWorkType}
              options={workTypeFilters}
              value={selectedWorkType}
            />
            <SelectField
              label={role === 'senior' ? '공고 상태' : '진행 단계'}
              onChange={changeHiringStage}
              options={activeHiringStageFilters}
              value={selectedHiringStage}
            />
            <SelectField label="정렬" onChange={changeSort} options={sortOptions} value={sortBy} />
          </section>

          <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#E0D9C8] bg-white px-4 shadow-xs focus-within:border-[#173F3A]">
            <Search className="size-5 text-slate-400" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#17212B] outline-none placeholder:text-slate-400"
              onChange={(event) => changeQuery(event.target.value)}
              placeholder={
                role === 'senior'
                  ? '회사명, 직무, 업종 또는 지역 검색'
                  : '회사명, 기술스택, 해결 프로젝트 검색'
              }
              type="search"
              value={query}
            />
          </label>
        </>
      )}

      {actionNotice ? (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-[#10B981] bg-[#ECFDF5] px-6 py-3.5 text-xs md:text-sm font-extrabold text-[#059669] shadow-xl">
          <span>{actionNotice}</span>
          {role === 'senior' && (
            <button
              type="button"
              onClick={() => void navigate('/senior/proposals')}
              className="shrink-0 rounded-xl bg-[#059669] px-3 py-1 text-xs text-white hover:bg-[#047857] transition shadow-xs"
            >
              내 제안 보러가기 →
            </button>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between text-[13px] font-bold text-slate-500">
        <span>
          검색 결과 <strong className="text-[#173F3A]">{displayedResultCount}</strong>건
        </span>
        {isMobile ? (
          <span>{activeFilterCount ? `필터 ${activeFilterCount}개 적용` : '추천순으로 정렬'}</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Database className="size-4" />
            {role === 'senior' ? '시니어 맞춤 채용 공고' : '회사 등록 프로젝트'}
          </span>
        )}
      </div>

      <div
        className={cn(
          'grid gap-4',
          isMobile || filteredPostings.length === 0
            ? 'grid-cols-1'
            : 'lg:grid-cols-[0.9fr_1.1fr]',
        )}
      >
        {isLoadingPostings ? (
          <div className="col-span-full rounded-2xl border border-[#E0D9C8] bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-xs">
            {role === 'senior'
              ? '맞춤 채용 공고를 불러오는 중입니다...'
              : '프로젝트를 불러오는 중입니다...'}
          </div>
        ) : filteredPostings.length === 0 ? (
          <div
            aria-live="polite"
            className="col-span-full w-full rounded-2xl border border-[#E0D9C8] bg-white px-6 py-10 text-center shadow-xs flex flex-col items-center justify-center gap-3"
          >
            <CircleAlert className="size-8 text-[#F06B4F]" />
            <p className="text-base font-extrabold text-[#17212B]">
              {role === 'senior' && worknetFeedMessage
                ? worknetFeedMessage
                : '조건에 맞는 프로젝트가 없습니다.'}
            </p>
            {role === 'senior' && worknetFeedStatus === 'profile-required' ? (
              <button
                className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-[#173F3A] px-6 text-sm font-extrabold text-white shadow-xs hover:bg-[#12332F] active:scale-[0.99] transition-all"
                onClick={() => void navigate('/basic-profile')}
                type="button"
              >
                내 정보 입력하기
              </button>
            ) : role === 'senior' && worknetFeedStatus !== 'success' ? (
              <button
                className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#173F3A] px-6 text-sm font-extrabold text-[#173F3A] shadow-2xs hover:bg-[#FAF7F2] active:scale-[0.99] transition-all"
                onClick={() => setWorknetReloadKey((value) => value + 1)}
                type="button"
              >
                <RefreshCw className="size-4" />
                다시 불러오기
              </button>
            ) : hasActiveFilters ? (
              <button
                className="mt-1 inline-flex h-11 items-center justify-center rounded-xl border border-[#173F3A] px-6 text-sm font-extrabold text-[#173F3A] shadow-2xs hover:bg-[#FAF7F2] active:scale-[0.99] transition-all"
                onClick={resetFilters}
                type="button"
              >
                필터 초기화
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <section className="grid gap-3 self-start">
              {paginatedPostings.map((posting) => (
                <PostingCard
                  activePrimaryCategory={effectiveSelectedCategory}
                  experienceCard={interviewCard}
                  key={posting.id}
                  onApply={() => handleApply(posting)}
                  onSelect={() => {
                    setSelectedId(posting.id);
                    if (isMobile) {
                      setIsMobileDetailOpen(true);
                    }
                  }}
                  posting={posting}
                  profile={seniorProfile}
                  role={role}
                  selected={selectedPosting?.id === posting.id}
                />
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs">
                  <div className="text-xs font-bold text-slate-600">
                    전체 <span className="font-extrabold text-[#173F3A]">{displayedResultCount}</span>건 중{' '}
                    <span className="font-extrabold text-[#17212B]">
                      {(safeCurrentPage - 1) * itemsPerPage + 1}~{Math.min(safeCurrentPage * itemsPerPage, displayedResultCount)}
                    </span>건 표시
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={safeCurrentPage === 1}
                      type="button"
                      className="px-3 py-1.5 text-xs font-extrabold rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] text-[#17212B] hover:bg-[#EFE9DC] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                    >
                      이전
                    </button>

                    {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
                      let pageNum = idx + 1;
                      if (totalPages > 7) {
                        if (safeCurrentPage > 4 && safeCurrentPage < totalPages - 3) {
                          pageNum = safeCurrentPage - 3 + idx;
                        } else if (safeCurrentPage >= totalPages - 3) {
                          pageNum = totalPages - 6 + idx;
                        }
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          type="button"
                          className={`min-w-[32px] h-8 px-2 text-xs font-extrabold rounded-xl transition-all ${
                            safeCurrentPage === pageNum
                              ? 'bg-[#173F3A] text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-[#FAF7F2] border border-[#E0D9C8]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={safeCurrentPage === totalPages}
                      type="button"
                      className="px-3 py-1.5 text-xs font-extrabold rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] text-[#17212B] hover:bg-[#EFE9DC] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </section>

            {!isMobile && selectedPosting ? (
              <div
                ref={detailContainerRef}
                className="sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 transition-all rounded-2xl"
              >
                <DetailPanel
                  activePrimaryCategory={effectiveSelectedCategory}
                  experienceCard={interviewCard}
                  onApply={() => handleApply(selectedPosting)}
                  posting={selectedPosting}
                  profile={seniorProfile}
                  role={role}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Mobile Detail Popup Modal */}
      {isMobile && isMobileDetailOpen && selectedPosting ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsMobileDetailOpen(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E0D9C8] bg-[#F8FCFB] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#DDEBE7] px-2.5 py-0.5 text-xs font-extrabold text-[#173F3A]">
                  프로젝트 상세 정보
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDetailOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                aria-label="닫기"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-4">
              <DetailPanel
                activePrimaryCategory={effectiveSelectedCategory}
                experienceCard={interviewCard}
                onApply={() => {
                  setIsMobileDetailOpen(false);
                  handleApply(selectedPosting);
                }}
                posting={selectedPosting}
                profile={seniorProfile}
                role={role}
              />
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-[#F06B4F]/30 bg-[#FDF0ED] p-4 shadow-xs">
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#F06B4F]">
          <Target className="size-4" />
          다음 연결 지점
        </div>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[#17212B]/80">
          {role === 'senior'
            ? '검증된 채용 공고와 등록한 경험 카드를 비교해 추천 순서를 계산합니다. 지원 전에는 반드시 상세 공고 조건을 확인하세요.'
            : '회사가 직접 등록한 프로젝트를 지원자 추천, 지원서 검토, 담당자 인터뷰 단계와 연결해 관리할 수 있습니다.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(role === 'senior'
            ? ['채용 조건 확인', '경험 기반 추천', 'AI 인터뷰', '지원서 제출']
            : ['프로젝트 등록', '인재 추천', '지원서 검토', '담당자 인터뷰']
          ).map((item) => (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#F06B4F]"
              key={item}
            >
              <BriefcaseBusiness className="size-3.5" />
              {item}
            </span>
          ))}
        </div>
      </section>
    </MobilePage>
  );
}

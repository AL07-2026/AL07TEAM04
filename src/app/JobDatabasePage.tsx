import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
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
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import {
  categoryLabels,
  databaseSummary,
  employmentTypeLabels,
  hiringStageLabels,
} from '@/data/jobPostings';
import {
  getCompanyOwnedProjects,
  getPublishedCompanyProjects,
  matchesPublishedCompanyProject,
  mergeSeniorPostings,
  resolveSeniorCategoryFilter,
} from '@/app/jobDatabaseProjectVisibility';
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
import { getPostingWorkSummary, type PostingWorkSummary } from '@/services/postingWorkSummary';
import {
  getQuickProjectFilterChoices,
  getRemainingProjectFilterChoices,
  searchProjectFilterChoices,
} from '@/services/projectFilterPresentation';
import {
  shouldMergePublicProjectsForDiscovery,
} from '@/services/homeMetricNavigation';
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

import { MobilePage, type Role, useViewportMode } from '@/app/wireframe/Ui';

const all = 'all';
const allDatabase = 'all_db';
const customOccupationMatch = 'custom-match';
const unclassifiedOccupation = 'unclassified';
export type CategoryFilter =
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

type RecommendedTalent = {
  availability: string;
  career: string;
  email: string;
  evidence: string[];
  headline: string;
  id: string;
  location: string;
  matchScore: number;
  name: string;
  projectId: string;
  projectTitle: string;
  skills: string[];
  workType: string;
};

export type FilterOption = {
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

function getRequiredFormValue(formData: FormData, key: string) {
  return ((formData.get(key) as string) || '').trim();
}

function getOptionalFormValue(formData: FormData, key: string, fallback: string) {
  return getRequiredFormValue(formData, key) || fallback;
}

function getListFormValue(formData: FormData, key: string, fallback: string[]) {
  const value = getRequiredFormValue(formData, key);
  if (!value) return fallback;

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getInterviewSummary(card: StoredExperienceCard) {
  return `직종: ${getExperienceCardCategoryLabel(card)} · 문제: ${card.problem} · 역할: ${card.role} · 실행: ${card.action} · 결과: ${card.result}`;
}

function getApplicationInterviewSummary({
  card,
  isInterviewReady,
  posting,
}: {
  card: StoredExperienceCard | null;
  isInterviewReady: boolean;
  posting: JobPosting;
}) {
  if (!card) {
    return `지원 직무(${getPostingOccupationLabel(posting)})에 맞춘 AI 경험 인터뷰 없이 제출했습니다.`;
  }

  const baseSummary = getInterviewSummary(card);
  if (isInterviewReady) return baseSummary;

  return `${baseSummary} · 참고: 지원 직무(${getPostingOccupationLabel(posting)})에 맞춘 AI 경험 인터뷰 없이 제출했습니다.`;
}

function getRecommendedTalentsForPosting(posting: JobPosting): RecommendedTalent[] {
  const occupationLabel = getPostingOccupationLabel(posting);
  const primarySkills = [
    ...(posting.requiredSkills ?? []),
    ...(posting.preferredSkills ?? []),
    occupationLabel,
  ]
    .filter(Boolean)
    .slice(0, 4);
  const responsibilities = posting.coreResponsibilities?.length
    ? posting.coreResponsibilities
    : [posting.problemStatement || posting.projectGoal || '프로젝트 핵심 과제 해결'];
  const baseScore = Math.max(82, Math.min(98, posting.seniorFitScore || 91));
  const names = ['김도현', '박서연', '이준호'];

  return names.map((name, index) => ({
    availability: index === 0 ? '즉시 협의 가능' : index === 1 ? '2주 내 시작 가능' : '단기 자문 가능',
    career: index === 0 ? '18년 경력' : index === 1 ? '15년 경력' : '21년 경력',
    email: `senior${index + 1}@eojob.example`,
    evidence: [
      responsibilities[index % responsibilities.length] ?? '유사 프로젝트 수행 경험',
      posting.matchingSignals?.[index % Math.max(1, posting.matchingSignals.length)] ??
        `${occupationLabel} 프로젝트 리딩 경험`,
    ].filter(Boolean),
    headline:
      index === 0
        ? `${occupationLabel} 프로젝트를 주도한 시니어`
        : index === 1
          ? `${posting.industry} 실무 개선 경험 보유`
          : `${posting.projectDuration} 단기 과제 해결에 강점`,
    id: `${posting.id}-talent-${index + 1}`,
    location: posting.workType === 'remote' ? '전국 · 원격 가능' : posting.location,
    matchScore: Math.max(78, baseScore - index * 4),
    name,
    projectId: posting.id,
    projectTitle: posting.title,
    skills: primarySkills.length > 0 ? primarySkills.slice(0, 3) : ['문제 해결', '협업 리딩', '성과 관리'],
    workType: posting.workType === 'remote' ? '원격 선호' : posting.workType === 'hybrid' ? '하이브리드 선호' : '현장 협업 선호',
  }));
}

function DatabaseMetric({
  label,
  value,
  caption,
  onClick,
}: {
  caption: string;
  label: string;
  onClick?: () => void;
  value: string;
}) {
  const className = cn(
    'rounded-2xl border border-[#E0D9C8] bg-white p-4 text-left shadow-xs transition',
    onClick &&
      'cursor-pointer hover:border-[#BBD5CE] hover:bg-[#F8FCFB] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]',
  );
  const content = (
    <>
      <p className="text-[12px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-[26px] font-extrabold tracking-tight text-[#173F3A]">{value}</p>
      <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">{caption}</p>
    </>
  );

  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
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

function CategoryFilterButton({
  badge,
  label,
  onClick,
  selected,
}: {
  badge?: string;
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3.5 text-[13px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2',
        selected
          ? 'border-[#173F3A] bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-white shadow-xs'
          : 'border-[#E0D9C8] bg-white text-[#17212B] shadow-2xs hover:border-[#173F3A]/40 hover:bg-[#FAF7F2]',
      )}
      onClick={onClick}
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
      <span>{label}</span>
      {selected ? <span aria-hidden="true" className="text-[12px]">✓</span> : null}
    </button>
  );
}

export function CategoryPickerDialog({
  choices,
  onClose,
  onSelect,
  selectedCategory,
  title,
}: {
  choices: FilterOption[];
  onClose: () => void;
  onSelect: (category: CategoryFilter, source: 'click' | 'enter') => void;
  selectedCategory: CategoryFilter;
  title: string;
}) {
  const [query, setQuery] = useState('');
  const visibleChoices = searchProjectFilterChoices(choices, query);

  function selectChoice(choice: FilterOption, source: 'click' | 'enter' = 'click') {
    onSelect(choice.id, source);
    setQuery('');
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    if (visibleChoices.length === 1) selectChoice(visibleChoices[0]!, 'enter');
  }

  return (
    <div
      aria-labelledby="project-category-picker-title"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end bg-[#17212B]/35 p-3 sm:items-center sm:justify-center"
      id="project-category-picker"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      role="dialog"
    >
      <section className="max-h-[min(680px,calc(100dvh-24px))] w-full max-w-xl overflow-auto rounded-3xl border border-[#E0D9C8] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-extrabold text-[#4B756E]">프로젝트 탐색</p>
            <h2 className="mt-1 text-[20px] font-extrabold text-[#17212B]" id="project-category-picker-title">
              {title}
            </h2>
          </div>
          <button
            aria-label="직무 선택 닫기"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-[#FAF7F2] hover:text-[#17212B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <label className="mt-4 flex h-12 items-center gap-3 rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] px-4 focus-within:border-[#173F3A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#173F3A]/10">
          <Search aria-hidden="true" className="size-5 text-[#173F3A]" />
          <input
            autoFocus
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#17212B] outline-none placeholder:text-slate-400"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="직무명으로 찾기"
            type="search"
            value={query}
          />
        </label>
        <div className="mt-4">
          {query.trim() ? null : (
            <div aria-label="전체 직무" className="mb-4" role="group">
              {visibleChoices.filter((choice) => choice.id === allDatabase || choice.id === all).map((choice) => (
                <CategoryFilterButton badge={choice.badge} key={choice.id} label="전체" onClick={() => selectChoice(choice)} selected={selectedCategory === choice.id} />
              ))}
            </div>
          )}
          {query.trim() ? null : (
            <p className="mb-2 text-[12px] font-extrabold text-[#4B756E]">내 희망 직무</p>
          )}
          {query.trim() ? null : (
            <div className="mb-4 flex flex-wrap gap-2" role="group">
              {visibleChoices.filter((choice) => Boolean(choice.badge)).map((choice) => (
                <CategoryFilterButton badge={choice.badge} key={choice.id} label={choice.label} onClick={() => selectChoice(choice)} selected={selectedCategory === choice.id} />
              ))}
            </div>
          )}
          {!query.trim() ? <p className="mb-2 text-[12px] font-extrabold text-[#4B756E]">다른 직무</p> : null}
          <div aria-live="polite" className="grid gap-2 sm:grid-cols-2" role="group">
          {visibleChoices.filter((choice) => query.trim() || (!choice.badge && choice.id !== allDatabase && choice.id !== all)).map((choice) => (
            <CategoryFilterButton
              badge={choice.badge}
              key={choice.id}
              label={choice.label}
              onClick={() => selectChoice(choice)}
              selected={selectedCategory === choice.id}
            />
          ))}
          {visibleChoices.length === 0 ? (
            <p className="w-full rounded-xl bg-[#FAF7F2] px-4 py-5 text-center text-[14px] font-semibold text-slate-600">
              일치하는 직무가 없습니다. 다른 검색어로 찾아보세요.
            </p>
          ) : null}
          </div>
        </div>
      </section>
    </div>
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

export function TaskStack({ items }: { items?: string[] }) {
  return (
    <ul
      aria-label="실제로 하는 일"
      className="list-none overflow-hidden rounded-lg border border-[#E0D9C8]/80 bg-[#F8FCFB]"
      data-testid="posting-task-stack"
    >
      {(items ?? []).map((item) => (
        <li
          className="grid grid-cols-[4px_minmax(0,1fr)] items-stretch gap-3 border-b border-[#E0D9C8]/80 px-3 py-2.5 last:border-b-0"
          data-testid="posting-task-row"
          key={item}
        >
          <span aria-hidden="true" className="my-0.5 rounded-sm bg-[#173F3A]" />
          <span className="min-w-0 break-words text-[13px] font-semibold leading-6 text-[#17212B]">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PostingWorkSummaryContent({ summary }: { summary: PostingWorkSummary }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] font-extrabold leading-6 text-[#17212B]">{summary.summary}</p>
      {summary.hasSourceBackedWork ? (
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-[#4B756E]">실제로 하는 일</p>
          <div className="mt-2"><TaskStack items={summary.duties} /></div>
        </div>
      ) : null}
      {!summary.hasSourceBackedWork ? (
        <p className="rounded-lg bg-[#F8FCFB] px-3 py-2 text-[12px] font-semibold leading-5 text-[#4B5768]">
          상세 업무는 공고에 충분히 적혀 있지 않습니다. 아래 조건을 확인해 지원 여부를 판단해 주세요.
        </p>
      ) : null}
      {!summary.hasSourceBackedWork ? (
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {summary.facts.map((fact) => (
            <div className="flex min-w-0 gap-2" key={fact.label}>
              <dt className="shrink-0 font-extrabold text-[#173F3A]">{fact.label}</dt>
              <dd className="min-w-0 font-medium text-[#17212B]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
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

export function PostingCard({
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
    cleanProblemStatement = '공고의 상세 업무는 원문 공고에서 확인해 주세요.';
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
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'w-full max-w-full overflow-hidden cursor-pointer rounded-2xl border bg-white p-4 text-left shadow-xs transition hover:shadow-md min-w-0',
        selected
          ? 'border-[#BBD5CE] bg-[#F4F9F8] shadow-[inset_3px_0_0_#173F3A,0_1px_2px_rgba(23,63,58,0.08)]'
          : 'border-[#E0D9C8]',
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
          className="line-clamp-2 rounded-sm text-left transition-colors hover:text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
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

      {showScore ? (
        <div className="mt-2.5 flex min-w-0 items-center gap-1.5 overflow-hidden rounded-lg border border-[#BBD5CE]/80 bg-[#F4F9F8] px-2.5 py-1.5 text-[11.5px] font-extrabold text-[#173F3A]">
          <Sparkles className="size-3.5 shrink-0 text-[#173F3A]" />
          <span className="min-w-0 flex-1 truncate">{displayReasons[0]}</span>
        </div>
      ) : isUnclassifiedFilter ? (
        <p className="mt-2.5 text-[11.5px] font-semibold leading-5 text-[#4B756E]">
          자동 분류 확신이 낮아 직무 확인이 필요한 공고입니다.
        </p>
      ) : null}

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

function RecommendedTalentCard({
  onPropose,
  onSelect,
  selected,
  talent,
}: {
  onPropose: () => void;
  onSelect: () => void;
  selected: boolean;
  talent: RecommendedTalent;
}) {
  const fitTone = getFitScoreTone(talent.matchScore);

  return (
    <article
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'w-full max-w-full cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-xs transition hover:shadow-md',
        selected
          ? 'border-[#BBD5CE] bg-[#F4F9F8] shadow-[inset_3px_0_0_#173F3A,0_1px_2px_rgba(23,63,58,0.08)]'
          : 'border-[#E0D9C8]',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#BBD5CE] bg-[#DDEBE7] text-[#173F3A]">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-extrabold text-[#17212B]">{talent.name}</h3>
            <p className="mt-0.5 truncate text-[12px] font-bold text-slate-500">
              {talent.career} · {talent.location}
            </p>
          </div>
        </div>
        <span
          aria-label={`추천 적합도 ${talent.matchScore}점, ${fitTone.label}`}
          className={cn(
            'shrink-0 rounded-xl border px-2.5 py-1 text-center text-[11px] font-extrabold',
            fitTone.containerClassName,
          )}
        >
          <span className={fitTone.labelClassName}>{fitTone.label}</span>
          <span className={cn('ml-1 text-[13px] font-black', fitTone.scoreClassName)}>
            {talent.matchScore}점
          </span>
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-[14px] font-extrabold leading-6 text-[#17212B]">
        {talent.headline}
      </p>
      <p className="mt-1.5 line-clamp-1 text-[12px] font-bold text-[#173F3A]">
        매칭 프로젝트 · {talent.projectTitle}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {talent.skills.map((skill) => (
          <span
            className="rounded-full border border-[#BBD5CE] bg-[#F8FCFB] px-2.5 py-1 text-[11px] font-extrabold text-[#173F3A]"
            key={skill}
          >
            {skill}
          </span>
        ))}
      </div>

      <ul className="mt-3 space-y-1.5 text-[12px] font-semibold leading-5 text-slate-600">
        {talent.evidence.slice(0, 2).map((item) => (
          <li className="flex items-start gap-1.5" key={item}>
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#173F3A]" />
            <span className="line-clamp-1">{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-[#E0D9C8]/60 pt-3">
        <span className="min-w-0 truncate text-[12px] font-extrabold text-slate-500">
          {talent.workType} · {talent.availability}
        </span>
        <button
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#D85A3F] bg-gradient-to-b from-[#F57B61] via-[#F06B4F] to-[#D85A3F] px-4 py-1.5 text-[13px] font-extrabold text-white shadow-2xs transition-all duration-200 hover:from-[#F78B73] hover:via-[#F2755B] hover:to-[#E06146] active:scale-[0.98]"
          onClick={(event) => {
            event.stopPropagation();
            onPropose();
          }}
          type="button"
        >
          제안하기
        </button>
      </div>
    </article>
  );
}

export function DetailPanel({
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
  const workSummary = getPostingWorkSummary(posting);

  return (
    <article
      className={cn(
        'rounded-2xl border border-[#E0D9C8] bg-white shadow-xs',
        isMobile ? 'p-3.5' : 'p-4 md:contents',
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
        <>
        <header className="pb-3">
          <p className="text-[12px] font-extrabold text-[#F06B4F]">
            {hiringStageLabels[posting.hiringStage]} ·{' '}
            {getPostingOccupationLabel(posting) || posting.industry}
          </p>
        </header>
          <div className="sticky top-0 z-10 -mx-4 mt-1 flex items-start justify-between gap-3 border-b border-[#E0D9C8] bg-white px-4 py-2">
            <h2 className="min-w-0 line-clamp-2 text-[22px] font-extrabold leading-tight text-[#17212B]">
              {posting.title}
            </h2>
            {showScore ? (
              <div
                aria-label={`시니어 적합도 ${displayScore}점, ${fitTone.label}`}
                className={cn('shrink-0 rounded-xl border px-3 py-2 text-center', fitTone.containerClassName)}
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
          <p className="mt-2 text-[13px] font-bold text-[#173F3A]">
            {posting.companyName} · {posting.companySize}
            {posting.source === 'worknet'
              ? posting.workSchedule
                ? ` · ${posting.workSchedule}`
                : ''
              : ` · ${employmentTypeLabels[posting.employmentType]}`}
          </p>
        </>
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
      {role === 'senior' && showScore ? (
        <div className="mt-4 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/60 p-3.5 flex flex-col gap-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#173F3A]">
            <Sparkles className="size-4 text-[#173F3A]" />
            내 정보 기반 적합도 분석
          </div>
          <div className="flex flex-col gap-1 text-xs">
            {displayReasons.map((reason, idx) => (
              <p key={idx} className="flex items-center gap-1 font-semibold text-[#17212B]">
                <span>•</span>
                <span>{reason}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {role === 'senior' && !showScore && isUnclassifiedFilter ? (
        <p className="mt-4 border-l-2 border-[#7AA99E] pl-2.5 text-[12px] font-semibold leading-5 text-[#4B756E]">
          자동 분류 확신이 낮아 기타·직무 확인 필요 목록에 표시된 공고입니다.
        </p>
      ) : null}

      {posting.source === 'worknet' ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#173F3A]">
              <Sparkles className="size-4 text-[#173F3A]" />
              <span>이 일에서 맡게 될 역할</span>
            </div>
            <div className="mt-3">
              <section className="rounded-xl border border-[#E0D9C8]/80 bg-white p-3.5 shadow-3xs">
                <PostingWorkSummaryContent summary={workSummary} />
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
          <MobileDetailRow label="이 일에서 맡게 될 역할" tone="mint">
            <PostingWorkSummaryContent summary={workSummary} />
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
          <div className="mt-5 rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#173F3A]">
              <Sparkles className="size-4 text-[#173F3A]" />
              <span>이 일에서 맡게 될 역할</span>
            </div>
            <div className="mt-3">
              <section className="rounded-xl border border-[#E0D9C8]/80 bg-white p-3.5 shadow-3xs">
                <PostingWorkSummaryContent summary={workSummary} />
              </section>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
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

function useDocumentScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined' || typeof window === 'undefined') return;

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: documentElement.style.overflow,
    };

    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      documentElement.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      body.style.paddingRight = previous.bodyPaddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

export function JobDatabasePage({ role = 'company', title }: { role?: Role; title?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const homeRecommendationCategory = normalizeOccupationCategory(searchParams.get('recommendedCategory'));
  const isHomeRecommendationContext = role === 'senior' && Boolean(homeRecommendationCategory);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(
    () => homeRecommendationCategory ?? all,
  );
  const [selectedWorkType, setSelectedWorkType] = useState<WorkTypeFilter>(all);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<EmploymentTypeFilter>(all);
  const [selectedHiringStage, setSelectedHiringStage] = useState<HiringStageFilter>(all);
  const [sortBy, setSortBy] = useState<SortOption>('fit-desc');
  const [selectedId, setSelectedId] = useState('');
  const [selectedTalentId, setSelectedTalentId] = useState('');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(() =>
    Boolean(searchParams.get('focusProject')),
  );
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCompanyProjectModalOpen, setIsCompanyProjectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [isLoadingPostings, setIsLoadingPostings] = useState<boolean>(() => postings.length === 0);
  const [worknetFeedMessage, setWorknetFeedMessage] = useState('');
  const [worknetFeedStatus, setWorknetFeedStatus] = useState<WorknetProjectFeedStatus>('success');
  const [worknetReloadKey, setWorknetReloadKey] = useState(0);
  const resultGenerationRef = useRef(1);
  const [resultGeneration, setResultGeneration] = useState(1);
  const [pendingResultGeneration, setPendingResultGeneration] = useState<number | null>(null);
  const [publishedCompanyProjects, setPublishedCompanyProjects] = useState<JobPosting[]>([]);
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
  const [stableOverviewMetrics, setStableOverviewMetrics] = useState<{
    catalogTotal: number;
    preferredTotal: number;
    partTimeTotal: number;
    closingSoonTotal: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const focusedViewportIdRef = useRef<string | null>(null);
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
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isDetailFiltersExpanded, setIsDetailFiltersExpanded] = useState(false);
  const categoryPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const suppressPickerEnterKeyUpRef = useRef(false);
  const [applicationFiles, setApplicationFiles] = useState<File[]>([]);
  const [applicantNote, setApplicantNote] = useState('');
  const [applicationError, setApplicationError] = useState('');
  const [interviewCard, setInterviewCard] = useState<StoredExperienceCard | null>(() =>
    readStoredExperienceCard(user?.uid),
  );
  const [isApplying, setIsApplying] = useState(false);
  const [isInterviewBypassConfirmOpen, setIsInterviewBypassConfirmOpen] = useState(false);
  const isModalOpen =
    isRegisterOpen ||
    isCompanyProjectModalOpen ||
    Boolean(applyingPosting) ||
    Boolean(completedApplication) ||
    isInterviewBypassConfirmOpen ||
    (isMobile && isMobileDetailOpen);

  useDocumentScrollLock(isModalOpen);

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
      const [registeredProjects, resolvedProfile, worknetFeed, resolvedInterviewCard] = await Promise.all([
        fetchProjects(),
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
        role === 'company'
          ? getCompanyOwnedProjects(registeredProjects, user?.uid)
          : registeredProjects;
      const publicProjects = getPublishedCompanyProjects(registeredProjects);
      if (role === 'senior') setPublishedCompanyProjects(publicProjects);
      const sourceProjects = role === 'senior' ? publicProjects : visibleUserProjects;
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
    const containFollowUpPickerEnter = (event: globalThis.KeyboardEvent) => {
      if (!suppressPickerEnterKeyUpRef.current || event.key !== 'Enter') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === 'keyup') suppressPickerEnterKeyUpRef.current = false;
    };
    document.addEventListener('keypress', containFollowUpPickerEnter, true);
    document.addEventListener('keyup', containFollowUpPickerEnter, true);
    return () => {
      document.removeEventListener('keypress', containFollowUpPickerEnter, true);
      document.removeEventListener('keyup', containFollowUpPickerEnter, true);
    };
  }, []);

  useEffect(() => {
    if (role !== 'senior' || !isSeniorProfileResolved) return undefined;

    const hasUsablePrimaryPreference = Boolean(
      primaryProfilePreference &&
        (primaryProfilePreference !== OTHER_OCCUPATION_PREFERENCE ||
          (seniorProfile?.desiredOccupationText?.trim().length ?? 0) >= 2),
    );
    if (selectedCategory === all && !hasUsablePrimaryPreference) {
      const profileRequiredTimer = window.setTimeout(() => {
        const visibleCompanyProjects = publishedCompanyProjects.filter((project) =>
          matchesPublishedCompanyProject(project, {
            employmentType: selectedEmploymentType,
            hiringStage: selectedHiringStage,
            query,
            selectedCategory,
            workType: selectedWorkType,
          }),
        );
        setIsLoadingPostings(false);
        setPostings(visibleCompanyProjects);
        setSelectedId(visibleCompanyProjects[0]?.id ?? '');
        setServerSearchMeta(null);
        setPendingResultGeneration(null);
        setWorknetFeedStatus('profile-required');
        setWorknetFeedMessage(
          visibleCompanyProjects.length > 0
            ? '기업이 공개한 프로젝트를 먼저 보여드립니다. 내 정보에서 1순위 희망 직종을 선택하면 맞춤 공고도 함께 볼 수 있습니다.'
            : '내 정보에서 1순위 희망 직종을 선택하면 해당 직종의 맞춤 공고를 볼 수 있습니다.',
        );
      }, 0);
      return () => window.clearTimeout(profileRequiredTimer);
    }

    const abortController = new AbortController();
    let active = true;
    const generation = resultGeneration;
    resultGenerationRef.current = generation;
    const delay = query.trim() ? 300 : 0;
    const timer = window.setTimeout(() => {
      const selectedOccupationCategory = normalizeOccupationCategory(selectedCategory);
      const isDefaultCustomMatch =
        selectedCategory === all &&
        primaryProfilePreference === OTHER_OCCUPATION_PREFERENCE;
      const isCustomMatchSelected =
        selectedCategory === customOccupationMatch || isDefaultCustomMatch;
      const isAllDatabaseSelected = selectedCategory === allDatabase;
      const customFallbackCategories = isCustomMatchSelected
        ? preferredProfileCategories
        : [];
      let categories: JobOccupationFilter[] = [];
      if (!query.trim() && isCustomMatchSelected && customFallbackCategories.length > 0) {
        categories = customFallbackCategories;
      } else if (!query.trim() && !isAllDatabaseSelected && !isCustomMatchSelected) {
        if (selectedCategory === unclassifiedOccupation) {
          categories = [unclassifiedOccupation];
        } else if (selectedCategory === all && primaryProfileCategory) {
          categories = [primaryProfileCategory];
        } else if (selectedOccupationCategory) {
          categories = [selectedOccupationCategory];
        }
      }
      let desiredCategories: OccupationPreference[] = [];
      if (query.trim()) {
        desiredCategories = [];
      } else if (isCustomMatchSelected && customFallbackCategories.length > 0) {
        desiredCategories = customFallbackCategories;
      } else if (isAllDatabaseSelected) {
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
      const companyProjectCategoryFilter = resolveSeniorCategoryFilter(
        selectedCategory,
        effectivePrimaryProfileFilter,
      );
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
        requireDesiredOccupationMatch:
          isCustomMatchSelected && customFallbackCategories.length === 0,
        signal: abortController.signal,
        sortBy,
        workType: selectedWorkType,
      })
        .then((result) => {
          if (!active || generation !== resultGenerationRef.current) return;
          const matchingCompanyProjects = shouldMergePublicProjectsForDiscovery(isHomeRecommendationContext) ? publishedCompanyProjects.filter((project) =>
            matchesPublishedCompanyProject(project, {
              desiredOccupationText: isCustomMatchSelected
                ? seniorProfile?.desiredOccupationText
                : undefined,
              employmentType: selectedEmploymentType,
              fallbackOccupationCategories: customFallbackCategories,
              hiringStage: selectedHiringStage,
              query,
              selectedCategory: companyProjectCategoryFilter,
              workType: selectedWorkType,
            }),
          ) : [];
          const matchingCatalogProjects = isCustomMatchSelected
            ? result.items.filter((project) =>
                doesPostingMatchDesiredOccupationText(
                  project,
                  seniorProfile?.desiredOccupationText,
                ) ||
                customFallbackCategories.includes(getPostingOccupationCategory(project)),
              )
            : result.items;
          const mergedProjects = mergeSeniorPostings(matchingCompanyProjects, matchingCatalogProjects);
          const catalogProjectIds = new Set(matchingCatalogProjects.map((project) => project.id));
          const additionalCompanyProjectCount = matchingCompanyProjects.filter(
            (project) => !catalogProjectIds.has(project.id),
          ).length;
          setServerSearchMeta({
            catalogTotal: result.catalogTotal,
            closingSoonTotal: result.closingSoonTotal,
            page: result.page,
            partTimeTotal: result.partTimeTotal,
            preferredTotal: result.preferredTotal,
            total: result.total + additionalCompanyProjectCount,
            totalPages: result.totalPages,
          });
          const isFirstPreferenceOverviewContext =
            selectedCategory === all ||
            (primaryProfileCategory &&
              normalizeOccupationCategory(selectedCategory) === primaryProfileCategory);
          if (!query.trim() && isFirstPreferenceOverviewContext) {
            setStableOverviewMetrics({
              catalogTotal: result.catalogTotal,
              preferredTotal: result.preferredTotal,
              partTimeTotal: result.partTimeTotal,
              closingSoonTotal: result.closingSoonTotal,
            });
          }
          setPostings(mergedProjects);
          setCurrentPage(result.page);
          setSelectedId((current) =>
            mergedProjects.some((posting) => posting.id === current)
              ? current
              : (mergedProjects[0]?.id ?? ''),
          );
          setWorknetFeedStatus('success');
          setWorknetFeedMessage(
            mergedProjects.length === 0
              ? '전체 데이터베이스에서 조건에 맞는 채용공고를 찾지 못했습니다.'
              : '',
          );
          setPendingResultGeneration(null);
        })
        .catch(async (error: unknown) => {
          if (
            !active ||
            generation !== resultGenerationRef.current ||
            (error instanceof DOMException && error.name === 'AbortError')
          ) return;
          console.warn('Full job database search failed:', error);
          try {
            const fallback = await fetchWorknetSeniorProjectFeed({
              forceRefresh: true,
              includeAnyCareer: true,
            });
            if (!active || generation !== resultGenerationRef.current) return;
            setServerSearchMeta(null);
            const matchingCompanyProjects = shouldMergePublicProjectsForDiscovery(isHomeRecommendationContext) ? publishedCompanyProjects.filter((project) =>
              matchesPublishedCompanyProject(project, {
                desiredOccupationText: isCustomMatchSelected
                  ? seniorProfile?.desiredOccupationText
                  : undefined,
                employmentType: selectedEmploymentType,
                fallbackOccupationCategories: customFallbackCategories,
                hiringStage: selectedHiringStage,
                query,
                selectedCategory: companyProjectCategoryFilter,
                workType: selectedWorkType,
              }),
            ) : [];
            const matchingFallbackProjects = isCustomMatchSelected
              ? fallback.projects.filter((project) =>
                  doesPostingMatchDesiredOccupationText(
                    project,
                    seniorProfile?.desiredOccupationText,
                  ) ||
                  customFallbackCategories.includes(getPostingOccupationCategory(project)),
                )
              : fallback.projects;
            const mergedProjects = mergeSeniorPostings(
              matchingCompanyProjects,
              matchingFallbackProjects,
            );
            setPostings(mergedProjects);
            setSelectedId(mergedProjects[0]?.id ?? '');
          } catch {
            if (!active || generation !== resultGenerationRef.current) return;
            setPostings([]);
            setSelectedId('');
          }
          setWorknetFeedStatus('unavailable');
          setWorknetFeedMessage(
            '전체 데이터베이스 검색 연결이 원활하지 않아 임시 목록을 표시합니다. 잠시 후 다시 시도해 주세요.',
          );
          setPendingResultGeneration(null);
        })
        .finally(() => {
          if (active && generation === resultGenerationRef.current) setIsLoadingPostings(false);
        });
    }, delay);

    return () => {
      active = false;
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [
    currentPage,
    effectivePrimaryProfileFilter,
    isSeniorProfileResolved,
    interviewCard,
    primaryProfileCategory,
    primaryProfilePreference,
    preferredProfileCategories,
    preferredProfilePreferences,
    query,
    role,
    selectedCategory,
    selectedEmploymentType,
    selectedHiringStage,
    selectedWorkType,
    seniorProfile,
    sortBy,
    publishedCompanyProjects,
    resultGeneration,
    worknetReloadKey,
    isHomeRecommendationContext,
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
    setIsInterviewBypassConfirmOpen(false);
    preserveApplicationDraft(applyingPosting.id, applicationFiles, applicantNote);
    beginApplicationInterview(applyingPosting.id, window.location.pathname, {
      targetCategory: applyingPosting.category,
      targetTitle: applyingPosting.title,
    });
    void navigate('/senior/experience/interview');
  }

  function handleCloseApplication() {
    cancelApplicationInterview();
    setIsInterviewBypassConfirmOpen(false);
    setApplyingPosting(null);
    setApplicationError('');
  }

  async function handleConfirmSubmitApplication({
    allowInterviewMismatch = false,
  }: { allowInterviewMismatch?: boolean } = {}) {
    if (!applyingPosting) return;

    if (applicationFiles.length === 0) {
      setApplicationError('1개 이상의 첨부파일을 확인해 주세요.');
      return;
    }

    if (!allowInterviewMismatch && !isInterviewReady) {
      setApplicationError('');
      setIsInterviewBypassConfirmOpen(true);
      return;
    }

    const attachedFileNames = applicationFiles.map((file) => file.name).join(', ');
    const interviewSummary = getApplicationInterviewSummary({
      card: interviewCard,
      isInterviewReady,
      posting: applyingPosting,
    });
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
      setIsInterviewBypassConfirmOpen(false);
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
    if (!user?.uid) {
      setActionNotice('기업 로그인 후에만 프로젝트를 등록할 수 있습니다.');
      setTimeout(() => setActionNotice(''), 7000);
      return;
    }
    const formData = new FormData(event.currentTarget);
    const title = getRequiredFormValue(formData, 'title');
    const companyName = getRequiredFormValue(formData, 'companyName');
    const problemStatement = getRequiredFormValue(formData, 'problemStatement');
    const projectGoal = getOptionalFormValue(formData, 'projectGoal', title);
    const category = (formData.get('category') as ProjectCategory) || 'operations';
    const industry = getOptionalFormValue(formData, 'industry', 'IT / SW');
    const companySize = getOptionalFormValue(formData, 'companySize', '50-100명');
    const location = getOptionalFormValue(formData, 'location', '서울 강남');
    const projectDuration = getOptionalFormValue(formData, 'projectDuration', '3개월');
    const salaryRange = getOptionalFormValue(formData, 'salaryRange', '월 600만-900만');
    const deadline =
      getRequiredFormValue(formData, 'deadline') ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ||
      '2026-09-30';
    const employmentType = (formData.get('employmentType') as EmploymentType) || 'project';
    const workType = (formData.get('workType') as WorkType) || 'hybrid';
    const experienceYears = getOptionalFormValue(formData, 'experienceYears', '10년 이상');
    const coreResponsibilities = getListFormValue(formData, 'coreResponsibilities', [
      problemStatement,
      projectGoal,
    ]);
    const qualifications = getListFormValue(formData, 'qualifications', [
      `관련 영역 ${experienceYears} 경력`,
      '프로젝트 주도 경험',
    ]);
    const benefits = getListFormValue(formData, 'benefits', ['재택/하이브리드 근무', '자율 근태']);
    const requiredSkills = getListFormValue(formData, 'requiredSkills', [
      '전략 수립',
      '프로세스 개선',
    ]);
    const preferredSkills = getListFormValue(formData, 'preferredSkills', ['동종 산업 리딩 경험']);
    const matchingSignals = getListFormValue(formData, 'matchingSignals', ['유사 문제 해결 경험']);
    const recommendedTalentType = getOptionalFormValue(
      formData,
      'recommendedTalentType',
      `${categoryLabels[category]} ${experienceYears} 경험을 가진 시니어`,
    );
    const matchingScoreCriteria = getListFormValue(formData, 'matchingScoreCriteria', [
      '직무 연관성',
      '문제 해결 경험',
      '협업 적합도',
    ]);
    const interviewFocus = getListFormValue(formData, 'interviewFocus', [
      '프로젝트 목표 및 성공 경험',
      '핵심 문제 해결 접근 방식',
    ]);
    const successMetrics = getListFormValue(formData, 'successMetrics', ['목표 KPI 100% 달성']);
    const collaborationTargets = getListFormValue(formData, 'collaborationTargets', [
      '기업 담당자',
      '프로젝트 실무팀',
    ]);

    if (!title || !companyName || !problemStatement) return;

    setIsSubmitting(true);
    try {
      const { project: created, savedToFirestore } = await createProject({
        ownerId: user?.uid,
        companyName,
        industry,
        companySize,
        title,
        category,
        seniority: 'lead',
        employmentType,
        hiringStage: 'open',
        workType,
        location,
        experienceYears,
        salaryRange,
        deadline,
        projectDuration,
        collaborationTargets,
        coreResponsibilities,
        qualifications,
        benefits,
        problemStatement,
        projectGoal,
        successMetrics,
        requiredSkills,
        preferredSkills,
        matchingSignals,
        recommendedTalentType,
        matchingScoreCriteria,
        interviewFocus,
        sourceDetailProvenance: {
          coreResponsibilities: 'source',
          problemStatement: 'source',
          projectGoal: getRequiredFormValue(formData, 'projectGoal') ? 'source' : 'synthetic',
          requiredSkills: getRequiredFormValue(formData, 'requiredSkills') ? 'source' : 'synthetic',
        },
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
      label: '기타 직무',
    });

    return options;
  }, [preferredProfilePreferences, seniorProfile?.desiredOccupationText]);

  const activeCategoryFilters = role === 'senior' ? seniorCategoryFilters : categoryFilters;
  const effectiveSelectedCategory =
    query.trim()
      ? role === 'senior'
        ? allDatabase
        : all
      : role === 'senior' && selectedCategory === all && effectivePrimaryProfileFilter
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
        const effectiveFilterCategory = query.trim() ? allDatabase : selectedCategory;
        const selectedOccupationCategory = normalizeOccupationCategory(effectiveFilterCategory);
        const isDirectOccupationMatch = doesPostingMatchDesiredOccupationText(
          posting,
          seniorProfile?.desiredOccupationText,
        );
        const matchesCategory =
          effectiveFilterCategory === allDatabase ||
          (effectiveFilterCategory === unclassifiedOccupation && !hasConfidentOccupation) ||
          (effectiveFilterCategory === customOccupationMatch && isDirectOccupationMatch) ||
          (effectiveFilterCategory === all
            ? primaryProfilePreference === OTHER_OCCUPATION_PREFERENCE
              ? isDirectOccupationMatch
              : !primaryProfileCategory ||
                (hasConfidentOccupation && postingOccupationCategory === primaryProfileCategory)
            : selectedOccupationCategory
              ? hasConfidentOccupation && postingOccupationCategory === selectedOccupationCategory
              : (posting.category as string) === (effectiveFilterCategory as string));
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

  const companyRecommendedTalents = useMemo(
    () =>
      role === 'company'
        ? filteredPostings.flatMap((posting) => getRecommendedTalentsForPosting(posting))
        : [],
    [filteredPostings, role],
  );
  const displayedResultCount =
    role === 'company'
      ? companyRecommendedTalents.length
      : isServerSearchActive
        ? (serverSearchMeta?.total ?? 0)
        : filteredPostings.length;
  const isFilterTransition = pendingResultGeneration !== null;
  const totalPages =
    role === 'company'
      ? Math.max(1, Math.ceil(companyRecommendedTalents.length / itemsPerPage))
      : isServerSearchActive
        ? Math.max(1, serverSearchMeta?.totalPages ?? 1)
        : Math.max(1, Math.ceil(filteredPostings.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPostings = useMemo(() => {
    if (isServerSearchActive) return filteredPostings;

    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredPostings.slice(start, start + itemsPerPage);
  }, [filteredPostings, isServerSearchActive, safeCurrentPage, itemsPerPage]);
  const paginatedRecommendedTalents = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return companyRecommendedTalents.slice(start, start + itemsPerPage);
  }, [companyRecommendedTalents, safeCurrentPage, itemsPerPage]);

  const focusProjectId = searchParams.get('focusProject');
  const focusedPosting = focusProjectId
    ? filteredPostings.find((posting) => posting.id === focusProjectId)
    : undefined;
  const effectiveSelectedTalentId = companyRecommendedTalents.some(
    (talent) => talent.id === selectedTalentId,
  )
    ? selectedTalentId
    : (companyRecommendedTalents[0]?.id ?? '');
  const selectedTalent = companyRecommendedTalents.find(
    (talent) => talent.id === effectiveSelectedTalentId,
  );
  const selectedPosting =
    focusedPosting ??
    filteredPostings.find((posting) => posting.id === selectedTalent?.projectId) ??
    filteredPostings.find((posting) => posting.id === selectedId) ??
    filteredPostings[0];
  const selectedCompanyProject =
    postings.find((posting) => posting.id === selectedId) ?? postings[0];

  useEffect(() => {
    if (!focusProjectId || !focusedPosting || focusedViewportIdRef.current === focusProjectId) return;
    focusedViewportIdRef.current = focusProjectId;
    const frame = window.requestAnimationFrame(() => {
      if (detailContainerRef.current) {
        detailContainerRef.current.scrollTop = 0;
        detailContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusProjectId, focusedPosting]);
  const activeFilterCount =
    Number(selectedCategory !== all && selectedCategory !== allDatabase) +
    Number(selectedWorkType !== all) +
    Number(selectedEmploymentType !== all) +
    Number(selectedHiringStage !== all) +
    Number(sortBy !== 'fit-desc');
  const hasActiveFilters = activeFilterCount > 0 || Boolean(query);
  const activeHiringStageFilters =
    role === 'senior' ? worknetPostingStatusFilters : companyHiringStageFilters;
  const allCategoryFilterId = role === 'senior' ? allDatabase : all;
  const quickCategoryFilters = useMemo(
    () =>
      getQuickProjectFilterChoices(
        activeCategoryFilters,
        allCategoryFilterId,
        effectiveSelectedCategory,
      ),
    [activeCategoryFilters, allCategoryFilterId, effectiveSelectedCategory],
  );
  const remainingCategoryFilters = useMemo(
    () => getRemainingProjectFilterChoices(activeCategoryFilters, quickCategoryFilters),
    [activeCategoryFilters, quickCategoryFilters],
  );
  const hasRankedCategory = activeCategoryFilters.some((choice) => Boolean(choice.badge));
  const isCustomCategorySelection =
    selectedCategory !== all &&
    selectedCategory !== allDatabase &&
    !activeCategoryFilters.find((choice) => choice.id === selectedCategory)?.badge;
  const categoryPickerTriggerLabel = isCustomCategorySelection
    ? '직무 바꾸기'
    : hasRankedCategory
      ? '다른 직무 선택'
      : '직무 선택';
  const activeDetailFilters = [
    selectedEmploymentType !== all
      ? {
          label:
            employmentTypeFilters.find((option) => option.id === selectedEmploymentType)?.label ??
            selectedEmploymentType,
          onClear: () => changeEmploymentType(all),
        }
      : null,
    selectedWorkType !== all
      ? {
          label: workTypeFilters.find((option) => option.id === selectedWorkType)?.label ?? selectedWorkType,
          onClear: () => changeWorkType(all),
        }
      : null,
    selectedHiringStage !== all
      ? {
          label:
            activeHiringStageFilters.find((option) => option.id === selectedHiringStage)?.label ??
            selectedHiringStage,
          onClear: () => changeHiringStage(all),
        }
      : null,
  ].filter((filter): filter is { label: string; onClear: () => void } => Boolean(filter));
  const activeDetailFilterCount = activeDetailFilters.length;

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
  const overviewCatalogTotal = stableOverviewMetrics?.catalogTotal ?? (serverSearchMeta?.catalogTotal ?? postings.length);
  const overviewPreferredTotal = stableOverviewMetrics?.preferredTotal ?? preferredPostingsCount;
  const overviewPartTimeTotal = stableOverviewMetrics?.partTimeTotal ?? partTimePostingsCount;
  const overviewClosingSoonTotal = stableOverviewMetrics?.closingSoonTotal ?? closingSoonPostingsCount;

  function changeQuery(value: string) {
    beginResultTransition();
    setQuery(value);
    setCurrentPage(1);
  }

  function changeCategory(value: CategoryFilter) {
    beginResultTransition();
    if (query.trim() && value !== all && value !== allDatabase) setQuery('');
    setSelectedCategory(value);
    setCurrentPage(1);
  }

  function beginResultTransition() {
    if (role !== 'senior') return;
    const generation = resultGeneration + 1;
    setResultGeneration(generation);
    setPendingResultGeneration(generation);
    setServerSearchMeta(null);
    setPostings([]);
    setSelectedId('');
    setIsLoadingPostings(true);
  }

  function openCategoryPicker() {
    setIsCategoryPickerOpen(true);
  }

  function closeCategoryPicker() {
    setIsCategoryPickerOpen(false);
    window.setTimeout(() => categoryPickerTriggerRef.current?.focus(), 0);
  }

  function selectCategoryFromPicker(value: CategoryFilter, source: 'click' | 'enter') {
    if (source === 'enter') {
      suppressPickerEnterKeyUpRef.current = true;
      window.setTimeout(() => {
        suppressPickerEnterKeyUpRef.current = false;
      }, 500);
    }
    changeCategory(value);
    closeCategoryPicker();
  }

  function changeWorkType(value: WorkTypeFilter) {
    beginResultTransition();
    setSelectedWorkType(value);
    setCurrentPage(1);
  }

  function changeEmploymentType(value: EmploymentTypeFilter) {
    beginResultTransition();
    setSelectedEmploymentType(value);
    setCurrentPage(1);
  }

  function changeHiringStage(value: HiringStageFilter) {
    beginResultTransition();
    setSelectedHiringStage(value);
    setCurrentPage(1);
  }

  function changeSort(value: SortOption) {
    beginResultTransition();
    setSortBy(value);
    setCurrentPage(1);
  }

  function resetFilters() {
    beginResultTransition();
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
            : '등록한 프로젝트에 맞는 추천 인재를 검토하세요'}
        </h1>
        <p className="mt-1.5 text-[12px] sm:text-[13px] font-medium leading-relaxed text-slate-600">
          {role === 'senior'
            ? '내 정보의 1순위 희망 직종을 먼저 적용하고, 경력·핵심 역량과 AI 경험 인터뷰 결과로 추천 순서를 계산합니다.'
            : '프로젝트 요구조건과 직무 유형을 바탕으로 바로 제안할 수 있는 시니어 인재를 카드로 보여드립니다.'}
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
              추천 인재 매칭 현황
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
              등록 프로젝트 {filteredPostings.length}개
            </span>
            <span className="inline-flex items-center rounded-lg border border-[#E0D9C8] bg-[#FAF7F2] px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-slate-700">
              추천 인재 {companyRecommendedTalents.length}명
            </span>
            <span className="inline-flex items-center rounded-lg border border-[#BBD5CE]/80 bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-extrabold text-[#173F3A]">
              제안 전 프로젝트 요구조건 확인 가능
            </span>
          </div>
        </section>
      )}

      {/* New Project Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-[#E0D9C8] bg-white p-6 shadow-xl">
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
              <section className="grid gap-3.5 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>회사명 *</span>
                  <input
                    name="companyName"
                    required
                    placeholder="회사명을 입력하세요"
                    className="h-10 rounded-xl border border-[#E0D9C8] px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>회사 규모</span>
                  <input
                    name="companySize"
                    placeholder="예: 50-100명"
                    className="h-10 rounded-xl border border-[#E0D9C8] px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B] md:col-span-2">
                  <span>프로젝트 제목 *</span>
                  <input
                    name="title"
                    required
                    placeholder="예: 서비스 프로세스 자동화 구축"
                    className="h-10 rounded-xl border border-[#E0D9C8] px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>산업/직무 분야</span>
                  <input
                    name="industry"
                    placeholder="예: IT / SW"
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
              </section>

              <section className="grid gap-3.5 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2]/55 p-3.5 md:grid-cols-2">
                <p className="text-xs font-extrabold text-[#173F3A] md:col-span-2">근무 조건</p>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>근무 지역</span>
                  <input
                    name="location"
                    placeholder="예: 서울 강남"
                    className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>근무 방식</span>
                  <select
                    name="workType"
                    className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs outline-none focus:border-[#173F3A]"
                  >
                    <option value="hybrid">하이브리드</option>
                    <option value="remote">원격</option>
                    <option value="onsite">오피스</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>고용 형태</span>
                  <select
                    name="employmentType"
                    className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs outline-none focus:border-[#173F3A]"
                  >
                    <option value="project">프로젝트</option>
                    <option value="advisory">자문</option>
                    <option value="contract">계약직</option>
                    <option value="part-time">시간제</option>
                    <option value="full-time">정규직</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>필요 경력</span>
                  <input
                    name="experienceYears"
                    placeholder="예: 10년 이상"
                    className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>프로젝트 기간</span>
                  <input
                    name="projectDuration"
                    placeholder="예: 3개월"
                    className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>보수/예산</span>
                  <input
                    name="salaryRange"
                    placeholder="예: 월 600만-900만"
                    className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>마감일</span>
                  <input
                    name="deadline"
                    type="date"
                    className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>협업 대상</span>
                  <input
                    name="collaborationTargets"
                    placeholder="예: 개발팀, 운영팀, 담당 임원"
                    className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
              </section>

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
              <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                <span>실제로 하는 일</span>
                <textarea
                  name="coreResponsibilities"
                  rows={3}
                  placeholder={'예: 업무 자동화 요구사항 정리\n기존 프로세스 진단\n운영 매뉴얼 작성'}
                  className="rounded-xl border border-[#E0D9C8] p-3 text-xs outline-none focus:border-[#173F3A]"
                />
              </label>

              <section className="grid gap-3.5 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>자격 요건</span>
                  <textarea
                    name="qualifications"
                    rows={3}
                    placeholder={'예: 관련 영역 10년 이상 경력\n프로젝트 주도 경험'}
                    className="rounded-xl border border-[#E0D9C8] p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>복지 / 근무 조건</span>
                  <textarea
                    name="benefits"
                    rows={3}
                    placeholder={'예: 재택/하이브리드 근무\n자율 근태'}
                    className="rounded-xl border border-[#E0D9C8] p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>필수 역량</span>
                  <textarea
                    name="requiredSkills"
                    rows={3}
                    placeholder={'예: 전략 수립\n프로세스 개선'}
                    className="rounded-xl border border-[#E0D9C8] p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>우대 역량</span>
                  <textarea
                    name="preferredSkills"
                    rows={3}
                    placeholder={'예: 동종 산업 리딩 경험\nAI 자동화 도입 경험'}
                    className="rounded-xl border border-[#E0D9C8] p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
              </section>

              <section className="grid gap-3.5 rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] p-3.5 md:grid-cols-2">
                <p className="text-xs font-extrabold text-[#173F3A] md:col-span-2">추천 인재 기준</p>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B] md:col-span-2">
                  <span>추천 인재 유형</span>
                  <textarea
                    name="recommendedTalentType"
                    rows={2}
                    placeholder="예: 해당 영역 10년+ 총괄 경험을 가진 시니어 리드"
                    className="rounded-xl border border-[#E0D9C8] bg-white p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>매칭 근거</span>
                  <textarea
                    name="matchingSignals"
                    rows={3}
                    placeholder={'예: 유사 문제 해결 경험\n운영 자동화 프로젝트 경험'}
                    className="rounded-xl border border-[#E0D9C8] bg-white p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B]">
                  <span>매칭 점수 산정 기준</span>
                  <textarea
                    name="matchingScoreCriteria"
                    rows={3}
                    placeholder={'예: 직무 연관성\n문제 해결 경험\n협업 적합도'}
                    className="rounded-xl border border-[#E0D9C8] bg-white p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B] md:col-span-2">
                  <span>AI 인터뷰 확인 포인트</span>
                  <textarea
                    name="interviewFocus"
                    rows={3}
                    placeholder={'예: 프로젝트 목표 및 성공 경험\n핵심 문제 해결 접근 방식'}
                    className="rounded-xl border border-[#E0D9C8] bg-white p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B] md:col-span-2">
                  <span>성과 목표</span>
                  <textarea
                    name="successMetrics"
                    rows={2}
                    placeholder="예: 목표 KPI 100% 달성, 업무 처리 시간 40% 단축"
                    className="rounded-xl border border-[#E0D9C8] bg-white p-3 text-xs outline-none focus:border-[#173F3A]"
                  />
                </label>
              </section>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-2.5 backdrop-blur-xs md:p-4">
          <div
            aria-labelledby="application-modal-title"
            aria-modal="true"
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-2xl md:p-6"
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
                  disabled={isApplying}
                  onClick={() => void handleConfirmSubmitApplication()}
                  className={cn(
                    'h-12 rounded-xl bg-[#173F3A] px-6 text-[15px] font-extrabold text-white shadow-md transition hover:bg-[#12332F] active:scale-[0.99] disabled:cursor-wait disabled:bg-slate-400 disabled:shadow-none',
                    isMobile && 'w-full',
                  )}
                >
                  {isApplying ? '지원서 제출 중...' : '🚀 최종 지원서 제출하기'}
                </button>
              </div>
              {!isInterviewReady || applicationFiles.length === 0 ? (
                <p className="text-right text-[13px] font-semibold text-[#D85A3F]">
                  {!interviewCard
                    ? 'AI 인터뷰 없이 제출하면 기업 담당자에게 관련 경험 검증이 부족하게 보일 수 있습니다.'
                    : !isInterviewReady
                      ? `${getPostingOccupationLabel(applyingPosting)} 직무 인터뷰 없이도 제출할 수 있지만, 제출 전 확인이 필요합니다.`
                      : '첨부파일을 1개 이상 등록해 주세요.'}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {applyingPosting && isInterviewBypassConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden overscroll-none bg-black/45 p-4 backdrop-blur-xs">
          <div
            aria-labelledby="interview-bypass-confirm-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-[#E0D9C8] bg-white p-5 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FDF0ED] text-[#F06B4F]">
                <CircleAlert className="size-5" />
              </div>
              <div className="min-w-0">
                <h3
                  className="text-[18px] font-extrabold leading-7 text-[#17212B]"
                  id="interview-bypass-confirm-title"
                >
                  해당 직무에 관련된 인터뷰 없이도 지원하시겠습니까?
                </h3>
                <p className="mt-2 text-[14px] font-medium leading-6 text-slate-600">
                  현재 저장된 AI 경험 인터뷰가{' '}
                  <strong className="font-extrabold text-[#17212B]">
                    {getPostingOccupationLabel(applyingPosting)}
                  </strong>{' '}
                  직무와 충분히 맞지 않습니다. 그대로 지원하면 기업 담당자가 경험 카드와 지원
                  직무의 관련성을 낮게 볼 수 있어요.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#BBD5CE] bg-[#F4FAF8] p-3.5">
              <p className="text-[13px] font-extrabold text-[#173F3A]">
                추천: 지원 직무 맞춤 AI 인터뷰를 먼저 진행해 보세요.
              </p>
              <p className="mt-1 text-[13px] font-medium leading-5 text-slate-600">
                인터뷰를 완료하면 이 공고에 맞는 문제 해결 경험이 지원서와 함께 전달됩니다.
              </p>
            </div>

            <div className="mt-5 grid gap-2.5">
              <button
                className="min-h-11 w-full rounded-xl bg-[#173F3A] px-4 py-2.5 text-[14px] font-extrabold leading-5 text-white shadow-sm transition hover:bg-[#12332F]"
                onClick={handleStartApplicationInterview}
                type="button"
              >
                AI 인터뷰 진행하러 가기
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  className="min-h-11 rounded-xl border border-[#E0D9C8] px-3 py-2.5 text-[13px] font-bold leading-5 text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setIsInterviewBypassConfirmOpen(false)}
                  type="button"
                >
                  계속 작성
                </button>
                <button
                  className="min-h-11 rounded-xl border border-[#F06B4F]/35 bg-white px-3 py-2.5 text-[13px] font-extrabold leading-5 text-[#D85A3F] transition hover:bg-[#FFF1ED]"
                  onClick={() =>
                    void handleConfirmSubmitApplication({ allowInterviewMismatch: true })
                  }
                  type="button"
                >
                  인터뷰 없이 지원하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {completedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-[#E0D9C8] bg-white p-6 shadow-2xl md:p-8">
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

      {isCompanyProjectModalOpen ? (
        <div
          aria-labelledby="company-project-modal-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setIsCompanyProjectModalOpen(false)}
          role="dialog"
        >
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E0D9C8] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E0D9C8] px-5 py-4">
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold text-[#173F3A]">회사 직접 등록 기준</p>
                <h3
                  className="mt-1 text-lg font-extrabold leading-snug text-[#17212B]"
                  id="company-project-modal-title"
                >
                  등록 프로젝트 {postings.length}건
                </h3>
              </div>
              <button
                aria-label="등록 프로젝트 팝업 닫기"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                onClick={() => setIsCompanyProjectModalOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            {postings.length > 0 ? (
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[0.85fr_1.15fr]">
                <section className="grid content-start gap-3">
                  {postings.map((posting) => (
                    <PostingCard
                      activePrimaryCategory={effectiveSelectedCategory}
                      experienceCard={interviewCard}
                      key={posting.id}
                      onApply={() => handleApply(posting)}
                      onSelect={() => setSelectedId(posting.id)}
                      posting={posting}
                      profile={seniorProfile}
                      role={role}
                      selected={selectedCompanyProject?.id === posting.id}
                    />
                  ))}
                </section>

                {selectedCompanyProject ? (
                  <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
                    <DetailPanel
                      activePrimaryCategory={effectiveSelectedCategory}
                      experienceCard={interviewCard}
                      onApply={() => handleApply(selectedCompanyProject)}
                      posting={selectedCompanyProject}
                      profile={seniorProfile}
                      role={role}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
                <CircleAlert className="size-8 text-[#F06B4F]" />
                <p className="text-sm font-extrabold text-[#17212B]">아직 등록된 프로젝트가 없습니다.</p>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#173F3A] px-4 text-xs font-extrabold text-white shadow-xs hover:bg-[#21544E]"
                  onClick={() => {
                    setIsCompanyProjectModalOpen(false);
                    setIsRegisterOpen(true);
                  }}
                  type="button"
                >
                  새 프로젝트 등록
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
        <DatabaseMetric
          caption={role === 'senior' ? '실시간 기준' : '회사 직접 등록 기준'}
          label={role === 'senior' ? '조회 공고' : '등록 프로젝트'}
          onClick={role === 'company' ? () => setIsCompanyProjectModalOpen(true) : undefined}
          value={`${role === 'senior' ? overviewCatalogTotal : postings.length}건`}
        />
        <DatabaseMetric
          caption={
            role === 'senior' && seniorProfile && preferredProfileCategories.length > 0
              ? '1순위 희망 직종 기준'
              : '맞춤 희망 조건 부합 기준'
          }
          label="추천 건수"
          value={
            role === 'senior' ? `${overviewPreferredTotal}건` : `${postings.length}건`
          }
        />
        <DatabaseMetric
          caption={role === 'senior' ? '시간제·파트타임·유연근무 기준' : '현재 지원 접수 가능'}
          label="시간제 채용"
          value={`${overviewPartTimeTotal}건`}
        />
        <DatabaseMetric
          caption={role === 'senior' ? '마감일까지 7일 이내' : '등록 마감일 기준'}
          label="마감 임박"
          value={`${overviewClosingSoonTotal}건`}
        />
      </div>

      {isMobile ? (
        <section className="rounded-[20px] border border-[#E0D9C8] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[15px] font-extrabold text-[#17212B]">
              <Filter className="size-[18px] text-[#173F3A]" />
              프로젝트 찾기
            </div>
            {hasActiveFilters ? (
              <button
                className="min-h-10 rounded-full px-2 text-[12px] font-extrabold text-[#F06B4F]"
                onClick={resetFilters}
                type="button"
              >
                전체 초기화
              </button>
            ) : null}
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
            <p className="text-[13px] font-extrabold text-[#17212B]">
              {role === 'senior' ? '직무 선택' : '프로젝트 유형'}
            </p>
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1.5" role="group">
              {quickCategoryFilters.map((category) => (
                <CategoryFilterButton
                  badge={category.badge}
                  key={category.id}
                  label={category.id === allCategoryFilterId ? '전체' : category.label}
                  onClick={() => changeCategory(category.id)}
                  selected={effectiveSelectedCategory === category.id}
                />
              ))}
              {remainingCategoryFilters.length > 0 ? (
                <button
                  aria-controls="project-category-picker"
                  aria-haspopup="dialog"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-dashed border-[#173F3A]/50 bg-[#F8FCFB] px-3.5 text-[13px] font-extrabold text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                  onClick={openCategoryPicker}
                  ref={categoryPickerTriggerRef}
                  type="button"
                >
                  {categoryPickerTriggerLabel} <Search aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 border-t border-[#E0D9C8] pt-4">
            <button
              aria-controls="mobile-project-detail-filters"
              aria-expanded={isDetailFiltersExpanded}
              className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-1 text-left text-[13px] font-extrabold text-[#17212B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
              onClick={() => setIsDetailFiltersExpanded((value) => !value)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-[#173F3A]" />
                상세 조건{activeDetailFilterCount ? ` (${activeDetailFilterCount})` : ''}
              </span>
              <ChevronDown className={cn('size-4 text-[#173F3A] transition-transform', isDetailFiltersExpanded && 'rotate-180')} />
            </button>
            {isDetailFiltersExpanded ? (
              <div className="mt-3 grid grid-cols-2 gap-3" id="mobile-project-detail-filters">
                <SelectField label="고용 형태" mobile onChange={changeEmploymentType} options={employmentTypeFilters} value={selectedEmploymentType} />
                <SelectField label="근무 방식" mobile onChange={changeWorkType} options={workTypeFilters} value={selectedWorkType} />
                <SelectField label={role === 'senior' ? '공고 상태' : '진행 단계'} mobile onChange={changeHiringStage} options={activeHiringStageFilters} value={selectedHiringStage} />
              </div>
            ) : null}
            {activeDetailFilters.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeDetailFilters.map((filter) => (
                  <button
                    aria-label={`${filter.label} 해제`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#173F3A]/10 px-3 py-1.5 text-[12px] font-extrabold text-[#173F3A]"
                    key={filter.label}
                    onClick={filter.onClear}
                    type="button"
                  >
                    {filter.label}<X aria-hidden="true" className="size-3.5" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
            <label className="flex h-12 items-center gap-3 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-4 focus-within:border-[#173F3A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#173F3A]/10">
              <Search className="size-5 text-slate-400" />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#17212B] outline-none placeholder:text-slate-400"
                onChange={(event) => changeQuery(event.target.value)}
                placeholder={role === 'senior' ? '회사명, 직무, 업종 또는 지역 검색' : '회사명, 기술스택, 해결 프로젝트 검색'}
                type="search"
                value={query}
              />
            </label>

            <div className="mt-4 border-t border-[#E0D9C8] pt-4">
              <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#17212B]">
                <Filter className="size-4 text-[#173F3A]" />
                {role === 'senior' ? '직무 선택' : '프로젝트 유형'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="group">
                {quickCategoryFilters.map((category) => (
                  <CategoryFilterButton
                    badge={category.badge}
                    key={category.id}
                    label={category.id === allCategoryFilterId ? '전체' : category.label}
                    onClick={() => changeCategory(category.id)}
                    selected={effectiveSelectedCategory === category.id}
                  />
                ))}
                {remainingCategoryFilters.length > 0 ? (
                  <button
                    aria-controls="project-category-picker"
                    aria-haspopup="dialog"
                    className="inline-flex min-h-10 items-center gap-1 rounded-full border border-dashed border-[#173F3A]/50 bg-[#F8FCFB] px-3.5 text-[13px] font-extrabold text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                    onClick={openCategoryPicker}
                    ref={categoryPickerTriggerRef}
                    type="button"
                  >
                  {categoryPickerTriggerLabel} <Search aria-hidden="true" className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 border-t border-[#E0D9C8] pt-4">
              <button
                aria-controls="desktop-project-detail-filters"
                aria-expanded={isDetailFiltersExpanded}
                className="flex min-h-10 items-center gap-2 rounded-xl px-1 text-[13px] font-extrabold text-[#17212B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                onClick={() => setIsDetailFiltersExpanded((value) => !value)}
                type="button"
              >
                <SlidersHorizontal className="size-4 text-[#173F3A]" />
                상세 조건{activeDetailFilterCount ? ` (${activeDetailFilterCount})` : ''}
                <ChevronDown className={cn('size-4 text-[#173F3A] transition-transform', isDetailFiltersExpanded && 'rotate-180')} />
              </button>
              {isDetailFiltersExpanded ? (
                <div className="mt-3 grid gap-3 md:grid-cols-3" id="desktop-project-detail-filters">
                  <SelectField label="고용 형태" onChange={changeEmploymentType} options={employmentTypeFilters} value={selectedEmploymentType} />
                  <SelectField label="근무 방식" onChange={changeWorkType} options={workTypeFilters} value={selectedWorkType} />
                  <SelectField label={role === 'senior' ? '공고 상태' : '진행 단계'} onChange={changeHiringStage} options={activeHiringStageFilters} value={selectedHiringStage} />
                </div>
              ) : null}
              {activeDetailFilters.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeDetailFilters.map((filter) => (
                    <button
                      aria-label={`${filter.label} 해제`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#173F3A]/10 px-3 py-1.5 text-[12px] font-extrabold text-[#173F3A]"
                      key={filter.label}
                      onClick={filter.onClear}
                      type="button"
                    >
                      {filter.label}<X aria-hidden="true" className="size-3.5" />
                    </button>
                  ))}
                  <button className="text-[12px] font-extrabold text-[#F06B4F] hover:underline" onClick={resetFilters} type="button">
                    전체 초기화
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}

      {isCategoryPickerOpen ? (
        <CategoryPickerDialog
          choices={activeCategoryFilters}
          onClose={closeCategoryPicker}
          onSelect={selectCategoryFromPicker}
          selectedCategory={effectiveSelectedCategory}
          title={role === 'senior' ? '직무 선택' : '프로젝트 유형 선택'}
        />
      ) : null}

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

      <div className="flex items-center justify-between gap-3 text-[13px] font-bold text-slate-500">
        <span className="min-w-0 truncate">
          {query.trim() ? '검색 결과' : '추천 결과'}{' '}
          {isFilterTransition ? (
            <strong aria-label="결과 업데이트 중" className="text-[#4B756E]">···</strong>
          ) : (
            <strong className="text-[#173F3A]">{displayedResultCount}</strong>
          )}
          {isFilterTransition ? null : '건'}
        </span>
        <label className="inline-flex shrink-0 items-center gap-2 text-[12px] font-extrabold text-[#17212B]">
          <span className="sr-only">정렬 기준</span>
          <select
            aria-label="정렬 기준"
            className="h-9 max-w-32 rounded-lg border border-[#E0D9C8] bg-white px-2 text-[12px] font-extrabold text-[#17212B] outline-none focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/10"
            onChange={(event) => changeSort(event.target.value as SortOption)}
            value={sortBy}
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        aria-busy={isLoadingPostings || isFilterTransition ? 'true' : 'false'}
        className={cn(
          'grid gap-4',
          role === 'company' || isMobile || filteredPostings.length === 0
            ? 'grid-cols-1'
            : 'lg:grid-cols-[0.9fr_1.1fr]',
        )}
      >
        {isLoadingPostings && !isFilterTransition ? (
          <div className="col-span-full rounded-2xl border border-[#E0D9C8] bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-xs">
            {role === 'senior'
              ? '맞춤 채용 공고를 불러오는 중입니다...'
              : '추천 인재를 불러오는 중입니다...'}
          </div>
        ) : isFilterTransition ? (
          <div
            aria-live="polite"
            className="col-span-full flex min-h-[320px] items-center justify-center text-sm font-bold text-[#4B756E]"
          >
            업데이트 중…
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
                : role === 'company'
                  ? '추천할 인재를 만들 프로젝트가 없습니다.'
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
              {role === 'company'
                ? paginatedRecommendedTalents.map((talent) => {
                    const project = filteredPostings.find((posting) => posting.id === talent.projectId);
                    if (!project) return null;
                    return (
                      <RecommendedTalentCard
                        key={talent.id}
                        onPropose={() => handleApply(project)}
                        onSelect={() => {
                          setSelectedTalentId(talent.id);
                          setSelectedId(project.id);
                        }}
                        selected={selectedTalentId === talent.id}
                        talent={talent}
                      />
                    );
                  })
                : paginatedPostings.map((posting) => (
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

            {role === 'senior' && !isMobile && selectedPosting ? (
              <div
                ref={detailContainerRef}
                className="sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-[#E0D9C8] bg-white p-4 pr-1 shadow-xs transition-all"
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
      {role === 'senior' && isMobile && isMobileDetailOpen && selectedPosting ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-none bg-black/60 p-0 sm:p-4 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
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
            <div className="overflow-y-auto overscroll-contain p-4">
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

    </MobilePage>
  );
}

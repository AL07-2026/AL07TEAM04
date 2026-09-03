import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Coins,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Mic,
  Plus,
  RefreshCw,
  Search,
  Send,
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
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import {
  categoryLabels,
  databaseSummary,
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
import { trackButtonClick, trackJobApply, trackJobView } from '@/services/analyticsService';
import { sendApplicationEmailToManager } from '@/services/emailService';
import {
  extractCleanPositionTitle,
  formatSimpleLocation,
  formatSimpleSalary,
} from '@/services/dataSyncService';
import { getLatestUserExperienceCard } from '@/services/interviewService';
import { analyzeJobPostingForDetail } from '@/services/aiJobDetailAnalyzer';
import { type PostingWorkSummary } from '@/services/postingWorkSummary';
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
import {
  createProposalFromPosting,
  isUsableProposalResumeFile,
} from '@/services/proposalService';
import { getCompletedApplicationDestination } from './jobDatabaseApplicationNavigation';
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
type SortOption = 'fit-desc' | 'deadline-asc' | 'latest-desc' | 'title-asc';

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
const HOME_FOCUS_POSTING_KEY = 'eojob_home_focus_project';

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
    'rounded-2xl bg-white p-4 text-left shadow-xs transition duration-200',
    onClick &&
      'cursor-pointer hover:bg-[#FAFDFB] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]',
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
          'w-full rounded-xl border border-[#E0D9C8]/80 px-3 font-bold text-[#17212B] outline-none focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/10',
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
        'inline-flex min-h-10 shrink-0 whitespace-nowrap items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2',
        selected
          ? 'bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-white shadow-xs'
          : 'bg-[#FAF7F2] text-[#17212B] shadow-2xs hover:bg-[#F0ECE1]',
      )}
      onClick={onClick}
      type="button"
    >
      {badge ? (
        <span
          className={cn(
            'shrink-0 text-[11.5px] font-bold tracking-tight',
            selected ? 'text-[#8DD4C3]' : 'text-[#173F3A]/70',
          )}
        >
          {badge}
        </span>
      ) : null}
      <span className="shrink-0">{label}</span>
      {selected ? <span aria-hidden="true" className="shrink-0 text-[12px]">✓</span> : null}
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
            className="h-full min-w-0 flex-1 border-0 border-none bg-transparent text-[15px] font-semibold text-[#17212B] outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 placeholder:text-slate-400 [appearance:none] [-webkit-appearance:none]"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="직무명으로 찾기"
            type="text"
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
  onSelect,
  posting,
  profile,
  role = 'company',
  selected,
  useServerScore,
}: {
  activePrimaryCategory?: string;
  experienceCard?: StoredExperienceCard | null;
  onApply?: (posting: JobPosting) => void;
  onSelect: () => void;
  posting: JobPosting;
  profile?: SeniorProfileData | null;
  role?: Role;
  useServerScore?: boolean;
  selected: boolean;
}) {
  const matchResult = calculatePersonalizedMatch(
    posting,
    profile,
    activePrimaryCategory,
    experienceCard,
  );
  const hasUserProfile = Boolean(profile && profile.field?.trim() && profile.period?.trim());
  const displayScore = useServerScore ? posting.seniorFitScore || 75 : hasUserProfile && matchResult.personalizedScore > 0 ? matchResult.personalizedScore : posting.seniorFitScore || 75;
  const fitTone = getFitScoreTone(displayScore);
  const showScore = role === 'senior' && shouldShowScoreBadge(posting, profile, activePrimaryCategory);

  const cleanPositionTitle = extractCleanPositionTitle(posting.title, posting.companyName);
  const simpleLocation = formatSimpleLocation(posting.location);
  const simpleSalary = formatSimpleSalary(posting.salaryRange);

  // 2~3 essential badges
  const badges: { isMint?: boolean; label: string }[] = [];
  if (posting.workType === 'remote' || posting.title.includes('재택')) {
    badges.push({ isMint: true, label: '재택·원격' });
  } else if (posting.workType === 'hybrid' || posting.title.includes('하이브리드')) {
    badges.push({ isMint: true, label: '하이브리드' });
  }

  if (posting.employmentType === 'contract' || posting.title.includes('계약직')) {
    badges.push({ label: '계약직' });
  } else if (posting.employmentType === 'part-time' || posting.title.includes('시간제')) {
    badges.push({ label: '시간제' });
  }

  const categoryLabel = getPostingOccupationLabel(posting);
  if (categoryLabel && badges.length < 3) {
    badges.push({ isMint: true, label: categoryLabel });
  }
  if (badges.length === 0) {
    badges.push({ label: hiringStageLabels[posting.hiringStage] || '모집 중' });
  }

  return (
    <article
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group relative w-full max-w-full cursor-pointer rounded-2xl p-4 text-left transition-all duration-200 min-w-0',
        selected
          ? 'bg-[#F2FAF7] shadow-[inset_3px_0_0_#173F3A,0_4px_12px_rgba(23,63,58,0.08)]'
          : 'bg-white shadow-xs hover:bg-[#FAFDFB] hover:shadow-md',
      )}
      onClick={onSelect}
    >
      {/* Top: Company Name + Category & Top-Right Score/Tag */}
      <div className="flex items-center justify-between gap-2 min-w-0 w-full">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[72%]">
          <span className="truncate text-[13px] font-extrabold text-[#173F3A]">
            {posting.companyName}
          </span>
          {posting.industry ? (
            <>
              <span className="text-slate-300 text-[11px]">·</span>
              <span className="truncate text-[12px] font-medium text-slate-500">
                {posting.industry}
              </span>
            </>
          ) : null}
        </div>

        <div className="shrink-0 ml-auto">
          {showScore ? (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-black',
                fitTone.containerClassName,
                fitTone.scoreClassName,
              )}
            >
              <Sparkles
                className={cn(
                  'size-3 shrink-0',
                  displayScore >= 90
                    ? 'text-[#FEEA00] fill-[#FEEA00]'
                    : 'text-[#F06B4F] fill-[#F06B4F]',
                )}
              />
              <span>{displayScore}점</span>
            </span>
          ) : (
            <span className="rounded-full bg-[#F8FCFB] px-2.5 py-0.5 text-[11px] font-bold text-[#173F3A] shadow-2xs">
              검증 공고
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-1.5 text-[15.5px] font-extrabold leading-snug text-[#17212B] min-w-0 break-keep line-clamp-2 transition-colors group-hover:text-[#173F3A]">
        <button
          className="line-clamp-2 rounded-sm text-left transition-colors hover:text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          type="button"
        >
          {cleanPositionTitle}
        </button>
      </h3>

      {/* Badges / Tags */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 min-w-0">
        {badges.map((badge, idx) => (
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-bold truncate',
              badge.isMint
                ? 'bg-[#DDEBE7] text-[#173F3A]'
                : 'bg-[#FAF7F2] text-slate-600',
            )}
            key={`${badge.label}-${idx}`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      {/* Metadata & Salary Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-[#E0D9C8]/60 pt-2.5 text-[12px]">
        <div className="flex items-center gap-1.5 text-slate-500 truncate min-w-0">
          <span className="truncate">{simpleLocation}</span>
          <span className="text-slate-300">·</span>
          <span className="shrink-0">{posting.source === 'worknet' ? posting.experienceYears : posting.projectDuration}</span>
          <span className="text-slate-300">·</span>
          <span className="shrink-0">마감 {getDeadlineText(posting)}</span>
        </div>

        <span className="shrink-0 font-black text-[13.5px] text-[#F06B4F] ml-2">
          {simpleSalary}
        </span>
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
        'w-full max-w-full cursor-pointer overflow-hidden rounded-2xl bg-white p-4 text-left shadow-xs transition duration-200 hover:shadow-md hover:bg-[#FAFDFB]',
        selected && 'bg-[#F2FAF7] shadow-sm ring-2 ring-[#173F3A]',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#DDEBE7] text-[#173F3A]">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="truncate text-[16px] font-extrabold text-[#17212B]">{talent.name}</h3>
              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-500">예시 인재</span>
            </div>
            <p className="mt-0.5 truncate text-[12px] font-bold text-slate-500">
              {talent.career} · {talent.location}
            </p>
          </div>
        </div>
        <span
          aria-label={`추천 적합도 ${talent.matchScore}점, ${fitTone.label}`}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-black',
            fitTone.containerClassName,
            fitTone.scoreClassName,
          )}
        >
          <Sparkles
            className={cn(
              'size-3 shrink-0',
              talent.matchScore >= 90
                ? 'text-[#FEEA00] fill-[#FEEA00]'
                : 'text-[#F06B4F] fill-[#F06B4F]',
            )}
          />
          <span>{talent.matchScore}점</span>
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
            className="rounded-full bg-[#F8FCFB] px-2.5 py-1 text-[11px] font-extrabold text-[#173F3A] shadow-2xs"
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
          disabled
          onClick={(event) => { event.stopPropagation(); onPropose(); }}
          type="button"
        >
          데모 전용
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
  useServerScore,
}: {
  activePrimaryCategory?: string;
  experienceCard?: StoredExperienceCard | null;
  onApply?: () => void;
  posting: JobPosting;
  profile?: SeniorProfileData | null;
  role?: Role;
  useServerScore?: boolean;
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
  const displayScore = useServerScore ? posting.seniorFitScore || 75 : hasUserProfile && matchResult.personalizedScore > 0 ? matchResult.personalizedScore : posting.seniorFitScore || 75;
  const fitTone = getFitScoreTone(displayScore);
  const showScore = shouldShowScoreBadge(posting, profile, activePrimaryCategory);

  const analyzed = useMemo(() => analyzeJobPostingForDetail(posting), [posting]);

  return (
    <article
      className={cn(
        'rounded-2xl bg-white shadow-xs',
        isMobile ? 'p-3.5 space-y-4' : 'p-5 space-y-5',
      )}
    >
      {/* Header */}
      <header className="border-b border-[#E0D9C8]/60 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#DDEBE7] px-2.5 py-0.5 text-[11px] font-extrabold text-[#173F3A]">
              {hiringStageLabels[posting.hiringStage] || '모집 중'}
            </span>
            <span className="text-[12px] font-bold text-slate-500">
              {getPostingOccupationLabel(posting) || posting.industry}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-[11.5px] font-semibold text-[#173F3A]/80">
              {analyzed.keyJobFacts.sourceOrganization}
            </span>
          </div>

          {showScore ? (
            <span
              aria-label={`시니어 적합도 ${displayScore}점, ${fitTone.label}`}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-black',
                fitTone.containerClassName,
                fitTone.scoreClassName,
              )}
            >
              <Sparkles
                className={cn(
                  'size-3.5 shrink-0',
                  displayScore >= 90
                    ? 'text-[#FEEA00] fill-[#FEEA00]'
                    : 'text-[#F06B4F] fill-[#F06B4F]',
                )}
              />
              <span>{displayScore}점</span>
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center rounded-full bg-[#F8FCFB] px-2.5 py-0.5 text-[11px] font-bold text-[#173F3A] shadow-2xs">
              직종 탐색
            </span>
          )}
        </div>

        <h2 className="mt-2 text-[20px] sm:text-[22px] font-extrabold leading-snug tracking-tight text-[#17212B]">
          {posting.title}
        </h2>

        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-bold text-[#173F3A]">
          <span>{posting.companyName}</span>
          <span className="text-[#173F3A]/45">·</span>
          <span>{posting.companySize}</span>
          <span className="text-[#173F3A]/45">·</span>
          <span className="whitespace-nowrap">{analyzed.keyJobFacts.employmentTypeLabel}</span>
        </p>

        {activePrimaryCategory === unclassifiedOccupation || activePrimaryCategory === 'unclassified' ? (
          <p className="mt-2.5 border-l-2 border-[#7AA99E] pl-2.5 text-[12px] font-semibold leading-5 text-[#4B756E]">
            자동 분류 확신이 낮아 기타·직무 확인 필요 목록에 표시된 공고입니다.
          </p>
        ) : null}

        {/* Key Quick Badges */}
        <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F2] px-2.5 py-1 text-[#17212B] shadow-2xs">
            <MapPin className="size-3.5 text-[#173F3A]" />
            {analyzed.keyJobFacts.locationLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F2] px-2.5 py-1 text-[#17212B] shadow-2xs">
            <Briefcase className="size-3.5 text-[#173F3A]" />
            {analyzed.keyJobFacts.experienceRequired}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F2] px-2.5 py-1 text-[#F06B4F] font-extrabold shadow-2xs">
            <Coins className="size-3.5 text-[#F06B4F]" />
            {analyzed.keyJobFacts.salaryLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F2] px-2.5 py-1 text-slate-600 shadow-2xs">
            <CalendarClock className="size-3.5 text-slate-500" />
            마감 {getDeadlineText(posting)}
          </span>
        </div>
      </header>

      {/* 1. AI 3줄 핵심 요약 & 채용 배경 */}
      <section className="rounded-2xl bg-gradient-to-br from-[#F4FAF8] via-[#EBF5F2] to-[#E2EFEA] p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#173F3A]">
          <Sparkles className="size-4 text-[#173F3A]" />
          <span>AI 핵심 요약 & 채용 배경</span>
        </div>

        <div className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-[#17212B]">
          <div className="flex items-start gap-2">
            <span className="mt-1 size-1.5 rounded-full bg-[#173F3A] shrink-0" />
            <p>
              <strong className="font-bold text-[#173F3A]">채용 배경: </strong>
              {analyzed.aiExecutiveSummary.overview}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 size-1.5 rounded-full bg-[#173F3A] shrink-0" />
            <p>
              <strong className="font-bold text-[#173F3A]">핵심 과제: </strong>
              {analyzed.aiExecutiveSummary.keyChallenge}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 size-1.5 rounded-full bg-[#173F3A] shrink-0" />
            <p>
              <strong className="font-bold text-[#173F3A]">시니어 역할: </strong>
              {analyzed.aiExecutiveSummary.expectedImpact}
            </p>
          </div>
        </div>
      </section>

      {/* 2. AI 인재 분석: 기업이 원하는 핵심 경험 유형 */}
      <section className="rounded-2xl bg-[#FAFDFB] p-4 sm:p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-2 border-b border-[#E0D9C8]/60 pb-3">
          <div className="flex min-w-0 items-start gap-2 text-[13.5px] font-extrabold leading-5 text-[#173F3A]">
            <UserRound className="mt-0.5 size-4 shrink-0 text-[#173F3A]" />
            <span>
              기업 문제 해결에 필요한 <span className="whitespace-nowrap">실무 경험</span>{' '}
              (AI 인재상 분석)
            </span>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded bg-[#FAF7F2] px-2 py-1 text-[11px] font-bold text-slate-500 shadow-2xs">
            AI 경험 <span className="whitespace-nowrap">매칭 모델</span>
          </span>
        </div>

        {/* Persona Headline */}
        <div className="mt-3.5 rounded-xl bg-[#DDEBE7]/60 p-3.5">
          <p className="text-[12px] font-extrabold text-[#173F3A]">🎯 문제 해결 최적 시니어 페르소나</p>
          <p className="mt-1 text-[14.5px] font-black leading-snug text-[#17212B] [word-break:keep-all]">
            {analyzed.talentPersona.headline}
          </p>
        </div>

        {/* Required Experiences */}
        <div className="mt-4">
          <p className="max-w-[34rem] text-[12px] font-extrabold leading-5 text-[#4B756E]">
            이 문제 해결을 위해 기업이 <span className="whitespace-nowrap">가장 높게 평가하는</span>{' '}
            <span className="whitespace-nowrap">실무·리딩 경험</span>
          </p>
          <ul className="mt-2 space-y-2">
            {analyzed.talentPersona.experienceHighlights.map((exp, idx) => (
              <li className="flex items-start gap-2 text-[13px] font-semibold text-[#17212B]" key={idx}>
                <CheckCircle2 className="size-4 shrink-0 text-[#173F3A] mt-0.5" />
                <span>{exp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Competency Chips */}
        <div className="mt-4">
          <p className="text-[12px] font-extrabold text-[#4B756E]">문제 해결 핵심 역량 키워드</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analyzed.talentPersona.competencyTags.map((comp) => (
              <span
                key={comp}
                className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] font-extrabold text-[#173F3A] shadow-2xs"
              >
                #{comp}
              </span>
            ))}
          </div>
        </div>

        {/* AI Interview & Proposal Prep Points */}
        <div className="mt-4 rounded-xl bg-[#FFF9F7] p-3.5 shadow-3xs">
          <p className="flex items-start gap-1.5 text-[12px] font-extrabold leading-5 text-[#F06B4F]">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#F06B4F]" />
            <span className="min-w-0">
              AI 인터뷰 & 제안서 작성 시
              <span className="block whitespace-nowrap">'문제 해결 경험' 피칭 포인트</span>
            </span>
          </p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] font-medium leading-relaxed text-[#17212B]">
            {analyzed.talentPersona.interviewPrepFocus.map((focus, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[#F06B4F] font-bold">•</span>
                <span>{focus}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. 구직자 핵심 직무 조건 (Job Facts & Requirements) */}
      <section className="grid gap-3 sm:grid-cols-2">
        {/* Box A: 주요 실무 업무 */}
        <div className="rounded-2xl bg-[#FAF7F2]/60 p-4 shadow-2xs">
          <p className="text-[12.5px] font-extrabold text-[#173F3A] flex items-center gap-1.5">
            <ClipboardCheck className="size-4 text-[#173F3A]" />
            <span>주요 업무 내용</span>
          </p>
          <ul className="mt-2.5 space-y-2 text-[13px] font-semibold text-[#17212B] leading-relaxed">
            {analyzed.structuredDuties.map((duty, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 rounded-full bg-[#173F3A] shrink-0" />
                <span className="break-keep">{duty}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Box B: 자격 요건 */}
        <div className="rounded-2xl bg-[#FAF7F2]/60 p-4 shadow-2xs">
          <p className="text-[12.5px] font-extrabold text-[#173F3A] flex items-center gap-1.5">
            <CheckCircle className="size-4 text-[#173F3A]" />
            <span>자격 및 지원 요건</span>
          </p>
          <ul className="mt-2.5 space-y-2 text-[13px] font-semibold text-[#17212B] leading-relaxed">
            {analyzed.qualifications.map((qual, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 rounded-full bg-[#173F3A] shrink-0" />
                <span className="break-keep">{qual}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Box C: 근무 조건 및 혜택 */}
        <div className="rounded-2xl bg-[#FAF7F2]/60 p-4 shadow-2xs">
          <p className="text-[12.5px] font-extrabold text-[#173F3A] flex items-center gap-1.5">
            <Building2 className="size-4 text-[#173F3A]" />
            <span>근무 환경 및 혜택</span>
          </p>
          <ul className="mt-2.5 space-y-2 text-[13px] font-semibold text-[#17212B] leading-relaxed">
            {analyzed.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 rounded-full bg-[#173F3A] shrink-0" />
                <span className="break-keep">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Box D: 채용 및 접수 정보 */}
        <div className="rounded-2xl bg-[#FAF7F2]/80 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <p className="text-[12.5px] font-extrabold text-[#173F3A] flex items-center gap-1.5">
              <CalendarClock className="size-4 text-[#173F3A]" />
              <span>채용 정보 요약</span>
            </p>
            <dl className="mt-2.5 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between">
                <dt className="text-slate-500 font-bold">근무 형태</dt>
                <dd className="font-extrabold text-[#17212B]">{analyzed.keyJobFacts.workTypeLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-bold">고용 형태</dt>
                <dd className="font-extrabold text-[#17212B]">{analyzed.keyJobFacts.employmentTypeLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-bold">마감 일자</dt>
                <dd className="font-extrabold text-[#17212B]">{getDeadlineText(posting)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-bold">제공 기관</dt>
                <dd className="font-extrabold text-[#173F3A]">{analyzed.keyJobFacts.sourceOrganization}</dd>
              </div>
            </dl>
          </div>

          {posting.sourceUrl ? (
            <a
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[#173F3A] bg-white text-[12.5px] font-extrabold text-[#173F3A] transition hover:bg-[#F8FCFB]"
              href={posting.sourceUrl}
              onClick={() => trackJobApply(posting.id, posting.companyName, posting.title, 'external_redirect')}
              rel="noreferrer"
              target="_blank"
            >
              <span>공식 채용 상세 원문 보기</span>
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col gap-2.5 border-t border-[#E0D9C8]/70 pt-4">
        {role === 'senior' ? (
          <button
            type="button"
            onClick={() => onApply?.()}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-[15.5px] font-extrabold text-white border border-[#173F3A] shadow-[0_4px_14px_rgba(23,63,58,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(23,63,58,0.4)] active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer"
          >
            <span>이 프로젝트에 지원하기</span>
            <ArrowRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onApply?.()}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#F57B61] via-[#F06B4F] to-[#D85A3F] text-[15.5px] font-extrabold text-white border border-[#D85A3F] shadow-[0_4px_14px_rgba(240,107,79,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#F78B73] hover:via-[#F2755B] hover:to-[#E06146] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(240,107,79,0.4)] active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer"
          >
            <span>시니어 인재에게 제안하기</span>
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
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

type PostingSelectionTarget = {
  id: string;
  title: string;
};

const emptyPostingSelection: PostingSelectionTarget = { id: '', title: '' };

function getPostingSelectionTarget(posting?: JobPosting): PostingSelectionTarget {
  return posting ? { id: posting.id, title: posting.title } : emptyPostingSelection;
}

function getFocusedOrFallbackPostingTarget(
  projects: JobPosting[],
  focusProjectId: string,
  focusProjectTitle = '',
  currentTarget: PostingSelectionTarget = emptyPostingSelection,
) {
  if (focusProjectTitle) {
    const titledProject = projects.find((posting) => posting.title === focusProjectTitle);
    if (titledProject) return getPostingSelectionTarget(titledProject);
    const currentProject = projects.find((posting) =>
      posting.id === currentTarget.id &&
      (!currentTarget.title || posting.title === currentTarget.title),
    );
    if (currentProject) return getPostingSelectionTarget(currentProject);
    return getPostingSelectionTarget(projects[0]);
  }
  const focusedProject = focusProjectId
    ? projects.find((posting) => posting.id === focusProjectId)
    : undefined;
  if (focusedProject) {
    return getPostingSelectionTarget(focusedProject);
  }
  const currentProject = projects.find((posting) =>
    posting.id === currentTarget.id &&
    (!currentTarget.title || posting.title === currentTarget.title),
  );
  if (currentProject) {
    return getPostingSelectionTarget(currentProject);
  }
  return getPostingSelectionTarget(projects[0]);
}

function readHomeFocusedPosting(focusProjectId: string, focusProjectTitle: string) {
  if (typeof window === 'undefined' || (!focusProjectId && !focusProjectTitle)) return null;
  try {
    const raw = sessionStorage.getItem(HOME_FOCUS_POSTING_KEY);
    if (!raw) return null;
    const posting = JSON.parse(raw) as Partial<JobPosting>;
    if (!posting || typeof posting !== 'object') return null;
    if (focusProjectTitle && posting.title !== focusProjectTitle) return null;
    if (focusProjectId && posting.id !== focusProjectId) return null;
    if (!posting.id || !posting.title || !posting.companyName || !posting.category) return null;
    return posting as JobPosting;
  } catch {
    return null;
  }
}

function includeHomeFocusedPosting(projects: JobPosting[], focusedPosting: JobPosting | null) {
  if (!focusedPosting) return projects;
  const exists = projects.some(
    (posting) => posting.id === focusedPosting.id && posting.title === focusedPosting.title,
  );
  return exists ? projects : [focusedPosting, ...projects];
}

function prioritizeHomeFocusedPosting(projects: JobPosting[], focusedPosting: JobPosting | null) {
  if (!focusedPosting) return projects;
  const focusedIndex = projects.findIndex(
    (posting) => posting.id === focusedPosting.id && posting.title === focusedPosting.title,
  );
  if (focusedIndex <= 0) return projects;
  return [
    projects[focusedIndex]!,
    ...projects.slice(0, focusedIndex),
    ...projects.slice(focusedIndex + 1),
  ];
}

export function JobDatabasePage({
  role = 'company',
  title,
  initialRegisterOpen = false,
}: {
  role?: Role;
  title?: string;
  initialRegisterOpen?: boolean;
}) {
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
        if (cached.length >= 5) return cached;
      }
    } catch {
      // Ignore
    }
    return getDefaultSeniorJobPostings();
  });

  const focusProjectId = searchParams.get('focusProject')?.trim() ?? '';
  const focusProjectTitle = searchParams.get('focusTitle')?.trim() ?? '';
  const requestedPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const homeFocusedPosting = useMemo(
    () => readHomeFocusedPosting(focusProjectId, focusProjectTitle),
    [focusProjectId, focusProjectTitle],
  );
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
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    if (isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortDropdownOpen]);
  const [selectedTalentId, setSelectedTalentId] = useState('');
  const activeFocusProjectRef = useRef({
    id: focusProjectId,
    title: focusProjectTitle,
  });
  const [selectedPostingTarget, setSelectedPostingTarget] = useState<PostingSelectionTarget>(
    emptyPostingSelection,
  );
  const [isHomeFocusActive, setIsHomeFocusActive] = useState(Boolean(focusProjectId || focusProjectTitle));
  const selectedId = selectedPostingTarget.id;
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(() =>
    Boolean(searchParams.get('focusProject')),
  );
  const [isRegisterOpen, setIsRegisterOpen] = useState(
    () => role === 'company' && (initialRegisterOpen || searchParams.get('register') === '1'),
  );
  const [isCompanyProjectModalOpen, setIsCompanyProjectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [isLoadingPostings, setIsLoadingPostings] = useState<boolean>(() => role === 'senior');
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
  const [currentPage, setCurrentPage] = useState(requestedPage);
  const itemsPerPage = 5;
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
    proposalId: string;
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
  const applicationOpenerRef = useRef<HTMLElement | null>(null);
  const interviewBypassDialogRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isInterviewBypassConfirmOpen) return undefined;

    const focusDialog = window.setTimeout(() => interviewBypassDialogRef.current?.focus(), 0);
    const handleInterviewBypassKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsInterviewBypassConfirmOpen(false);
      window.setTimeout(() => applicationOpenerRef.current?.focus(), 0);
    };

    document.addEventListener('keydown', handleInterviewBypassKeyDown);
    return () => {
      window.clearTimeout(focusDialog);
      document.removeEventListener('keydown', handleInterviewBypassKeyDown);
    };
  }, [isInterviewBypassConfirmOpen]);

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
      if (role === 'senior') {
        setPublishedCompanyProjects(publicProjects);
      }
      const sourceProjects = includeHomeFocusedPosting(
        role === 'senior' ? publicProjects : visibleUserProjects,
        role === 'senior' ? homeFocusedPosting : null,
      );
      setWorknetFeedMessage(
        role === 'senior' && worknetFeed.status === 'success' && publicProjects.length === 0
          ? '내 정보의 희망 직종과 일치하는 고용24 공고를 찾지 못했습니다.'
          : (worknetFeed.message ?? ''),
      );
      setPostings(sourceProjects);
      setSelectedPostingTarget((current) =>
        getFocusedOrFallbackPostingTarget(
          sourceProjects,
          activeFocusProjectRef.current.id,
          activeFocusProjectRef.current.title,
          current,
        ),
      );

      const resumeState = consumeApplicationResume() ?? getPendingApplicationInterview();
      if (resumeState) {
        const resumedPosting = sourceProjects.find(
          (posting) => posting.id === resumeState.projectId,
        );
        if (resumedPosting) {
          const draft = consumeApplicationDraft(resumedPosting.id);
          setApplyingPosting(resumedPosting);
          setSelectedPostingTarget(getPostingSelectionTarget(resumedPosting));
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
          setSelectedPostingTarget(emptyPostingSelection);
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
  }, [homeFocusedPosting, role, user?.uid, worknetReloadKey]);

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
        const visibleCompanyProjects = includeHomeFocusedPosting(
          publishedCompanyProjects.filter((project) =>
            matchesPublishedCompanyProject(project, {
              employmentType: selectedEmploymentType,
              hiringStage: selectedHiringStage,
              query,
              selectedCategory,
              workType: selectedWorkType,
            }),
          ),
          homeFocusedPosting,
        );
        setIsLoadingPostings(false);
        setPostings(visibleCompanyProjects);
        setSelectedPostingTarget(
          getFocusedOrFallbackPostingTarget(
            visibleCompanyProjects,
            activeFocusProjectRef.current.id,
            activeFocusProjectRef.current.title,
          ),
        );
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
      const desiredCategories: OccupationPreference[] = query.trim()
        ? []
        : isCustomMatchSelected && customFallbackCategories.length > 0
          ? customFallbackCategories
          : preferredProfilePreferences;
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
      const companyProjectCategoryFilter = query.trim()
        ? allDatabase
        : resolveSeniorCategoryFilter(selectedCategory, effectivePrimaryProfileFilter);
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
        sortBy: !user && sortBy === 'fit-desc' ? 'title-asc' : sortBy,
        workType: selectedWorkType,
      })
        .then((result) => {
          if (!active || generation !== resultGenerationRef.current) return;
          const matchingCompanyProjects = shouldMergePublicProjectsForDiscovery(
            isHomeRecommendationContext,
            Boolean(query.trim()),
          ) ? publishedCompanyProjects.filter((project) =>
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
          const mergedProjects = includeHomeFocusedPosting(
            mergeSeniorPostings(matchingCompanyProjects, matchingCatalogProjects),
            homeFocusedPosting,
          );
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
          setSelectedPostingTarget((current) =>
            getFocusedOrFallbackPostingTarget(
              mergedProjects,
              activeFocusProjectRef.current.id,
              activeFocusProjectRef.current.title,
              current,
            ),
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
            const matchingCompanyProjects = shouldMergePublicProjectsForDiscovery(
              isHomeRecommendationContext,
              Boolean(query.trim()),
            ) ? publishedCompanyProjects.filter((project) =>
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
            const mergedProjects = includeHomeFocusedPosting(
              mergeSeniorPostings(matchingCompanyProjects, matchingFallbackProjects),
              homeFocusedPosting,
            );
            setPostings(mergedProjects);
            setSelectedPostingTarget(
              getFocusedOrFallbackPostingTarget(
                mergedProjects,
                activeFocusProjectRef.current.id,
                activeFocusProjectRef.current.title,
              ),
            );
          } catch {
            if (!active || generation !== resultGenerationRef.current) return;
            setPostings([]);
            setSelectedPostingTarget(emptyPostingSelection);
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
    homeFocusedPosting,
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
    user,
  ]);

  function handleApply(posting: JobPosting) {
    if (role === 'senior') {
      applicationOpenerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      trackJobApply(posting.id, posting.companyName, posting.title, 'start');
      setApplyingPosting(posting);
      setApplicationFiles([]);
      setApplicantNote('');
      setApplicationError('');
      setInterviewCard(readStoredExperienceCard(user?.uid));
      void getLatestUserExperienceCard(user?.uid).then(setInterviewCard);
    } else {
      trackButtonClick('company_propose_project', { projectId: posting.id, companyName: posting.companyName });
      const text = `✓ [${posting.companyName}] 시니어 인재에게 프로젝트 제안이 성공적으로 전달되었습니다.`;
      setActionNotice(text);
      setTimeout(() => setActionNotice(''), 4000);
    }
  }

  function handleApplicationFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    const validFiles = selectedFiles.filter(isUsableProposalResumeFile);

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
    preserveApplicationDraft(
      applyingPosting.id,
      applicationFiles.filter(isUsableProposalResumeFile),
      applicantNote,
    );
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

    const usableApplicationFiles = applicationFiles.filter(isUsableProposalResumeFile);
    if (usableApplicationFiles.length !== applicationFiles.length || usableApplicationFiles.length === 0) {
      setApplicationFiles(usableApplicationFiles);
      setApplicationError('1개 이상의 첨부파일을 확인해 주세요.');
      return;
    }

    if (!allowInterviewMismatch && !isInterviewReady) {
      setApplicationError('');
      setIsInterviewBypassConfirmOpen(true);
      return;
    }

    const attachedFileNames = usableApplicationFiles.map((file) => file.name).join(', ');
    const interviewSummary = getApplicationInterviewSummary({
      card: interviewCard,
      isInterviewReady,
      posting: applyingPosting,
    });
    setIsApplying(true);
    try {
      const savedProposal = await createProposalFromPosting(
        applyingPosting,
        attachedFileNames,
        interviewSummary,
        applicantNote,
        user?.uid,
        { email: user?.email, name: user?.name },
        usableApplicationFiles,
        seniorProfile?.experienceProfileV1,
        {
          employmentSubsidyTarget: seniorProfile?.employmentSubsidyTarget,
          employmentSubsidyProgram: seniorProfile?.employmentSubsidyProgram,
        },
      );
      const emailResult = sendApplicationEmailToManager(applyingPosting, {
        applicantName: user?.name || '지원자',
        applicantEmail: user?.email,
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
        proposalId: savedProposal.id,
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
      setApplicationError('지원서를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsApplying(false);
    }
  }

  function handleBypassInterview() {
    setIsInterviewBypassConfirmOpen(false);
    void handleConfirmSubmitApplication({ allowInterviewMismatch: true });
  }

  async function handleRegisterProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const effectiveUid = user?.uid || (import.meta.env.MODE === 'test' ? 'company-test-uid' : undefined);
    if (!effectiveUid) {
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
        ownerId: effectiveUid,
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
      setSelectedPostingTarget(getPostingSelectionTarget(created));
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
    if (isServerSearchActive) return prioritizeHomeFocusedPosting(postings, homeFocusedPosting);

    const normalizedQuery = query.trim().toLowerCase();

    const locallyFilteredPostings = postings
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
                postingOccupationCategory === primaryProfileCategory
            : selectedOccupationCategory
              ? postingOccupationCategory === selectedOccupationCategory
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
        if (sortBy === 'title-asc') {
          return first.title.localeCompare(second.title, 'ko');
        }
        if (sortBy === 'deadline-asc') {
          return new Date(first.deadline).getTime() - new Date(second.deadline).getTime();
        }
        if (sortBy === 'latest-desc') {
          return new Date(second.postedAt).getTime() - new Date(first.postedAt).getTime();
        }
        if (!user) {
          return first.title.localeCompare(second.title, 'ko');
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
    return prioritizeHomeFocusedPosting(locallyFilteredPostings, homeFocusedPosting);
  }, [
    homeFocusedPosting,
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
    user,
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

  const effectiveSelectedTalentId = companyRecommendedTalents.some(
    (talent) => talent.id === selectedTalentId,
  )
    ? selectedTalentId
    : (companyRecommendedTalents[0]?.id ?? '');
  const selectedTalent = companyRecommendedTalents.find(
    (talent) => talent.id === effectiveSelectedTalentId,
  );
  const selectedPosting =
    (isHomeFocusActive && homeFocusedPosting
      ? homeFocusedPosting
      : undefined) ??
    (isHomeFocusActive && focusProjectTitle
      ? filteredPostings.find((posting) => posting.title === focusProjectTitle)
      : undefined) ??
    filteredPostings.find((posting) => posting.id === selectedTalent?.projectId) ??
    filteredPostings.find((posting) =>
      posting.id === selectedPostingTarget.id &&
      (!selectedPostingTarget.title || posting.title === selectedPostingTarget.title),
    ) ??
    filteredPostings.find((posting) => posting.id === selectedPostingTarget.id) ??
    filteredPostings[0];
  const selectedCompanyProject =
    postings.find((posting) =>
      posting.id === selectedPostingTarget.id &&
      (!selectedPostingTarget.title || posting.title === selectedPostingTarget.title),
    ) ??
    postings.find((posting) => posting.id === selectedPostingTarget.id) ??
    postings[0];

  useEffect(() => {
    const activeFocusProject = activeFocusProjectRef.current;
    if (
      !activeFocusProject.id ||
      selectedPosting?.id !== activeFocusProject.id ||
      focusedViewportIdRef.current === activeFocusProject.id
    ) return;
    focusedViewportIdRef.current = activeFocusProject.id;
    const frame = window.requestAnimationFrame(() => {
      if (detailContainerRef.current) {
        detailContainerRef.current.scrollTop = 0;
        detailContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedPosting?.id]);

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
  const overviewCatalogTotal =
    stableOverviewMetrics?.catalogTotal ??
    (serverSearchMeta?.catalogTotal ?? (role === 'senior' ? 0 : postings.length));
  const overviewPreferredTotal =
    stableOverviewMetrics?.preferredTotal ??
    (serverSearchMeta?.preferredTotal ?? (role === 'senior' ? 0 : preferredPostingsCount));
  const overviewPartTimeTotal =
    stableOverviewMetrics?.partTimeTotal ??
    (serverSearchMeta?.partTimeTotal ?? (role === 'senior' ? 0 : partTimePostingsCount));
  const overviewClosingSoonTotal =
    stableOverviewMetrics?.closingSoonTotal ??
    (serverSearchMeta?.closingSoonTotal ?? (role === 'senior' ? 0 : closingSoonPostingsCount));

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
    setSelectedPostingTarget(emptyPostingSelection);
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
      <section className="px-1 py-0.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#DDEBE7] px-3 py-1 text-[12px] font-extrabold text-[#173F3A]">
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
        <h1 className="mt-2.5 text-lg sm:text-xl md:text-2xl font-black leading-snug text-[#17212B]">
          {role === 'senior'
            ? '경력과 전문성을 살릴 수 있는 맞춤 채용 공고'
            : '등록한 프로젝트에 맞는 추천 인재를 검토하세요'}
        </h1>
        <p className="mt-1.5 text-[13px] sm:text-[14px] font-medium leading-relaxed text-[#53606E]">
          {role === 'senior' ? (
            <>
              내 정보의 1순위 희망 직종을 먼저 적용하고,{' '}
              <span className="whitespace-nowrap">경력·핵심 역량과</span> AI 경험 인터뷰
              결과로 추천 순서를 계산합니다.
            </>
          ) : (
            '프로젝트 요구조건과 직무 유형을 바탕으로 바로 제안할 수 있는 시니어 인재를 카드로 보여드립니다.'
          )}
        </p>
      </section>

      {role === 'senior' ? (
        !user ? (
          <section className="rounded-2xl bg-[#FFF9F7] p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13.5px] sm:text-[14.5px] font-extrabold text-[#17212B] flex items-center gap-1.5">
                  <Sparkles className="size-4 text-[#F06B4F] shrink-0" />
                  <span>로그인하시면 내 직종·경험 기반 AI 맞춤 프로젝트 추천을 받을 수 있습니다!</span>
                </p>
                <p className="mt-1 text-[12px] font-medium text-slate-600">
                  비로그인 상태에서도 전체 프로젝트를 둘러보실 수 있으며, 로그인 시 1순위 희망 직종 정밀 적합도 점수가 표출됩니다.
                </p>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center shrink-0 rounded-xl bg-[#F06B4F] px-4 text-[13px] font-extrabold text-white shadow-xs hover:bg-[#d95a3f] active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto"
                onClick={() => void navigate('/login')}
                type="button"
              >
                로그인 / 회원가입 ➔
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-[#F8FCFB] p-3.5 sm:p-4 shadow-xs">
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
                  className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-[#173F3A] shadow-2xs cursor-default select-none"
                  key={category}
                >
                  {index + 1}순위 · {occupationCategoryLabels[category]}
                </span>
              ))}
              {seniorProfile?.period ? (
                <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-slate-600 shadow-2xs cursor-default select-none">
                  경력 {seniorProfile.period}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-[#173F3A] shadow-2xs cursor-default select-none">
                <MapPin className="size-3.5 shrink-0 text-[#173F3A]" />
                <span>희망지역: {seniorProfile?.desiredLocation || '전국'}</span>
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] sm:text-[12px] font-extrabold shadow-2xs cursor-default select-none',
                  interviewCard
                    ? 'bg-[#FDF0ED] text-[#D85A3F]'
                    : 'bg-white text-slate-500',
                )}
              >
                {interviewCard ? (
                  <>
                    <Sparkles className="size-3.5 shrink-0 text-[#F06B4F]" />
                    <span>AI 경험 인터뷰의 역할·행동·성과 반영됨</span>
                  </>
                ) : (
                  'AI 경험 인터뷰 미등록 · 내 정보만 반영 중'
                )}
              </span>
            </div>
          ) : (
            <p className="mt-1.5 text-[12px] font-medium text-slate-600">
              희망 직종과 경력 정보를 입력하면 해당 조건의 공고만 표시됩니다.
            </p>
          )}
        </section>
        )
      ) : (
        <section className="rounded-2xl bg-[#F8FCFB] p-3.5 sm:p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <p className="flex items-center gap-1.5 text-[13px] sm:text-[14px] font-extrabold text-[#173F3A]">
              <BarChart3 className="size-4 shrink-0 text-[#173F3A]" />
              <span>추천 인재 매칭 현황</span>
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
            <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-extrabold text-[#173F3A] shadow-2xs">
              등록 프로젝트 {filteredPostings.length}개
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-bold text-slate-700 shadow-2xs">
              <span className="size-2 rounded-full bg-[#173F3A] shrink-0" />
              <span>추천 인재 {companyRecommendedTalents.length}명</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] sm:text-[12px] font-extrabold text-[#173F3A] shadow-2xs">
              <ClipboardCheck className="size-3.5 text-[#173F3A]" />
              <span>제안 전 프로젝트 요구조건 확인 가능</span>
            </span>
          </div>
        </section>
      )}

      {/* New Project Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none bg-black/50 px-2.5 pb-[calc(env(safe-area-inset-bottom)+2.5cm+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xs md:items-center md:p-4">
          <div className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5cm-2rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+3.5cm)] shadow-xl md:max-h-[calc(100dvh-2rem)] md:p-6">
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
            <form
              onSubmit={handleRegisterProject}
              className="mt-4 flex min-w-0 flex-col gap-3.5 [&_input]:min-w-0 [&_input]:w-full [&_label]:min-w-0 [&_select]:min-w-0 [&_select]:w-full [&_textarea]:min-w-0 [&_textarea]:w-full"
            >
              <section className="grid min-w-0 gap-3.5 md:grid-cols-2">
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

              <section className="grid min-w-0 gap-3 rounded-xl bg-[#FAF7F2]/65 p-3 md:grid-cols-2 md:gap-3.5 md:p-3.5 shadow-2xs">
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

              <section className="grid min-w-0 gap-3.5 md:grid-cols-2">
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

              <section className="grid min-w-0 gap-3 rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] p-3 md:grid-cols-2 md:gap-3.5 md:p-3.5">
                <p className="text-xs font-extrabold text-[#173F3A] md:col-span-2">추천 인재 기준</p>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#17212B] md:col-span-2">
                  <span>추천 인재 유형</span>
                  <textarea
                    name="recommendedTalentType"
                    rows={2}
                    placeholder="예: 10년+ 총괄 경험을 가진 시니어 리드"
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

              <div className="-mx-4 mt-4 flex items-center justify-end gap-2 border-t border-[#E0D9C8]/70 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+2.5cm+1rem)] pt-3 md:mx-0 md:border-t-0 md:bg-transparent md:p-0 md:pt-0">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="h-11 rounded-xl border border-[#E0D9C8] px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl bg-[#173F3A] px-5 text-sm font-extrabold text-white shadow-xs hover:bg-[#21544E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? '저장 중...' : '프로젝트 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Application Modal with Resume/Portfolio & AI Interview Verification */}
      {applyingPosting && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none bg-black/60 px-2.5 py-5 backdrop-blur-xs md:items-center md:p-4">
          <div
            aria-labelledby="application-modal-title"
            aria-modal="true"
            className="max-h-[calc(100dvh-2.5rem)] w-full max-w-2xl scroll-py-5 overflow-y-auto overscroll-contain rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-2xl [word-break:keep-all] md:max-h-[calc(100dvh-2rem)] md:p-6"
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
                  AI 인터뷰 결과와 첨부파일을 확인한 뒤{' '}
                  <span className="whitespace-nowrap">지원서를</span> 제출하세요.
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
              <div className="flex flex-col gap-3 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/45 p-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-[#173F3A]">지원 대상 프로젝트</p>
                  <p className="mt-1 text-[16px] font-extrabold leading-6 text-[#17212B]">
                    {applyingPosting.title}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium leading-5 text-slate-600">
                    <span>{getPostingOccupationLabel(applyingPosting)}</span>
                    <span className="text-slate-300">·</span>
                    <span>{applyingPosting.location}</span>
                    <span className="text-slate-300">·</span>
                    <span>{applyingPosting.salaryRange}</span>
                  </p>
                </div>
                <span
                  aria-label={`적합도 ${applyingPostingFitScore}점, ${applyingPostingFitTone.label}`}
                  className={cn(
                    'w-fit shrink-0 rounded-xl border px-3 py-2 text-center text-[13px] font-black',
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
                          ? (
                            <>
                              아직 완료된 인터뷰가 없습니다.
                              <span className="block">
                                약 5분 인터뷰 후 결과 카드까지{' '}
                                <span className="whitespace-nowrap">확인할 수 있습니다.</span>
                              </span>
                            </>
                          )
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
                    'inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#173F3A] px-6 text-[15px] font-extrabold text-white shadow-md transition hover:bg-[#12332F] active:scale-[0.99] disabled:cursor-wait disabled:bg-slate-400 disabled:shadow-none',
                    isMobile && 'w-full',
                  )}
                >
                  <Send className="size-4" />
                  <span>{isApplying ? '지원서 제출 중...' : '최종 지원서 제출하기'}</span>
                </button>
              </div>
              {!isInterviewReady || applicationFiles.length === 0 ? (
                <p className="text-right text-[13px] font-semibold text-[#D85A3F]">
                  {!interviewCard
                    ? 'AI 인터뷰 없이 제출하면 기업 담당자에게 관련 경험 검증이 부족하게 보일 수 있습니다.'
                    : !isInterviewReady
                      ? '제출 전 확인이 필요합니다.'
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
            ref={interviewBypassDialogRef}
            role="dialog"
            tabIndex={-1}
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
                  onClick={handleBypassInterview}
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
                    <Building2 className="size-4 text-[#173F3A]" />
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
                      const textToCopy = `[이어잡 경험 인터뷰 요약]\n지원 공고: ${completedApplication.posting.title} (${completedApplication.posting.companyName})\n\n■ 경험 요약:\n${completedApplication.interviewSummary}\n\n■ 한 줄 지원 소신:\n"${completedApplication.coverNote || '등록된 전달 메시지가 없습니다.'}"`;
                      void navigator.clipboard.writeText(textToCopy);
                      setCopiedSummaryToast(true);
                      setTimeout(() => setCopiedSummaryToast(false), 4000);
                    }}
                    type="button"
                  >
                    <Copy className="size-4 shrink-0" />
                    <span>AI 경험 검증 요약 원클릭 복사하기</span>
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
                      <span>공식 채용 원문 접수처로 이동</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[#BBD5CE] bg-[#F4F9F8] p-4">
                  <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#173F3A]">
                    <Mail className="size-4 text-[#173F3A]" />
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
                onClick={() => {
                  const destination = getCompletedApplicationDestination(
                    completedApplication.proposalId,
                  );
                  window.location.assign(destination);
                }}
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
                      onSelect={() => setSelectedPostingTarget(getPostingSelectionTarget(posting))}
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
          value={
            role === 'senior'
              ? `${overviewCatalogTotal.toLocaleString()}건`
              : `${postings.length}건`
          }
        />
        <DatabaseMetric
          caption={
            role === 'senior' && seniorProfile && preferredProfileCategories.length > 0
              ? '1순위 희망 직종 기준'
              : '맞춤 희망 조건 부합 기준'
          }
          label="추천 건수"
          value={
            role === 'senior'
              ? `${overviewPreferredTotal.toLocaleString()}건`
              : `${postings.length}건`
          }
        />
        <DatabaseMetric
          caption={role === 'senior' ? '시간제·파트타임·유연근무 기준' : '현재 지원 접수 가능'}
          label="시간제 채용"
          value={`${overviewPartTimeTotal.toLocaleString()}건`}
        />
        <DatabaseMetric
          caption={role === 'senior' ? '마감일까지 7일 이내' : '등록 마감일 기준'}
          label="마감 임박"
          value={`${overviewClosingSoonTotal.toLocaleString()}건`}
        />
      </div>

      {isMobile ? (
        <section className="rounded-[20px] bg-white p-4 shadow-xs flex flex-col gap-3.5">
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

          <div>
            <div className="flex h-12 min-h-12 items-center gap-3 rounded-xl bg-[#FAF7F2]/80 px-4 transition-all focus-within:bg-white focus-within:shadow-sm">
              <Search aria-hidden="true" className="size-5 shrink-0 text-[#173F3A]" />
              <input
                className="h-full min-w-0 flex-1 appearance-none bg-transparent text-[15px] font-semibold text-[#17212B] !outline-none focus:!outline-none focus-visible:!outline-none !ring-0 focus:!ring-0 focus-visible:!ring-0 border-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
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
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-[#F7F3EA] hover:text-[#17212B]"
                  onClick={() => changeQuery('')}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-extrabold text-[#17212B]">
              {role === 'senior' ? '직무 선택' : '프로젝트 유형'}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none" role="group">
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
                  className="inline-flex min-h-10 shrink-0 whitespace-nowrap items-center gap-1 rounded-full bg-[#FAF7F2] px-3.5 text-[13px] font-extrabold text-[#173F3A] hover:bg-[#F0ECE1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                  onClick={openCategoryPicker}
                  ref={categoryPickerTriggerRef}
                  type="button"
                >
                  <span className="shrink-0">{categoryPickerTriggerLabel}</span> <Search aria-hidden="true" className="size-3.5 shrink-0" />
                </button>
              ) : null}
            </div>
          </div>

          <div>
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
          <section className="rounded-2xl bg-white p-5 shadow-xs flex flex-col gap-4">
            <label className="flex h-12 items-center gap-3 rounded-xl bg-[#FAF7F2]/80 px-4 transition-all focus-within:bg-white focus-within:shadow-sm">
              <Search className="size-5 text-slate-400 shrink-0" />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#17212B] !outline-none focus:!outline-none focus-visible:!outline-none !ring-0 focus:!ring-0 focus-visible:!ring-0 border-none placeholder:text-slate-400"
                onChange={(event) => changeQuery(event.target.value)}
                placeholder={role === 'senior' ? '회사명, 직무, 업종 또는 지역 검색' : '회사명, 기술스택, 해결 프로젝트 검색'}
                type="search"
                value={query}
              />
              {query ? (
                <button
                  aria-label="검색어 지우기"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-[#FAF7F2] hover:text-[#17212B]"
                  onClick={() => changeQuery('')}
                  type="button"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </label>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#17212B]">
                <Filter className="size-4 text-[#173F3A]" />
                {role === 'senior' ? '직무 선택' : '프로젝트 유형'}
              </div>
              <div className="flex flex-wrap gap-2" role="group">
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
                    className="inline-flex min-h-10 shrink-0 whitespace-nowrap items-center gap-1 rounded-full bg-[#FAF7F2] px-3.5 text-[13px] font-extrabold text-[#173F3A] hover:bg-[#F0ECE1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                    onClick={openCategoryPicker}
                    ref={categoryPickerTriggerRef}
                    type="button"
                  >
                    <span className="shrink-0">{categoryPickerTriggerLabel}</span> <Search aria-hidden="true" className="size-3.5 shrink-0" />
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <button
                aria-controls="desktop-project-detail-filters"
                aria-expanded={isDetailFiltersExpanded}
                className="flex min-h-9 items-center gap-2 rounded-xl px-1 text-[13px] font-extrabold text-[#17212B] hover:text-[#173F3A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                onClick={() => setIsDetailFiltersExpanded((value) => !value)}
                type="button"
              >
                <SlidersHorizontal className="size-4 text-[#173F3A]" />
                <span>상세 조건{activeDetailFilterCount ? ` (${activeDetailFilterCount})` : ''}</span>
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
        <div className="relative inline-block text-left shrink-0" ref={sortDropdownRef}>
          <button
            type="button"
            onClick={() => setIsSortDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isSortDropdownOpen}
            aria-label={`정렬 기준: ${sortOptions.find((option) => option.id === sortBy)?.label || '적합도 높은순'}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E0D9C8] bg-white px-3.5 text-[12.5px] font-extrabold text-[#17212B] shadow-2xs hover:bg-[#FAF7F2] hover:border-[#173F3A]/40 transition-all focus:outline-none"
          >
            <span>{sortOptions.find((option) => option.id === sortBy)?.label || '적합도 높은순'}</span>
            <ChevronDown
              className={cn(
                'size-3.5 text-slate-500 transition-transform duration-200',
                isSortDropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {isSortDropdownOpen && (
            <div
              className="absolute right-0 z-30 mt-1.5 w-max min-w-[145px] rounded-2xl border border-[#E0D9C8]/80 bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
              role="listbox"
            >
              {sortOptions.map((option) => {
                const isSelected = option.id === sortBy;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      changeSort(option.id);
                      setIsSortDropdownOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-extrabold transition-all whitespace-nowrap',
                      isSelected
                        ? 'bg-[#173F3A] text-white shadow-2xs'
                        : 'text-[#17212B] hover:bg-[#FAF7F2]',
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="whitespace-nowrap">{option.label}</span>
                    {isSelected ? <Check className="size-3.5 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
          <div className="col-span-full rounded-2xl border border-[#E0D9C8] bg-white p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-7 animate-spin text-[#173F3A]" />
            <p className="text-sm font-extrabold text-[#17212B]">
              {role === 'senior'
                ? '맞춤 채용 공고를 불러오는 중입니다...'
                : '추천 인재를 불러오는 중입니다...'}
            </p>
            <p className="text-xs font-medium text-slate-500">
              {role === 'senior' ? '1페이지(5개 공고)를 빠르게 구성하고 있습니다.' : '등록 프로젝트와 매칭 기준을 동기화 중입니다.'}
            </p>
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
              {role === 'company' ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  아래 추천 인재는 기능 시연용 예시이며 실제 등록 인재가 아닙니다.
                </p>
              ) : null}
              {role === 'company'
                ? paginatedRecommendedTalents.map((talent) => {
                    const project = filteredPostings.find((posting) => posting.id === talent.projectId);
                    if (!project) return null;
                    return (
                      <RecommendedTalentCard
                        key={talent.id}
                        onPropose={() => handleApply(project)}
                        onSelect={() => {
                          trackJobView(project.id, project.companyName, project.title);
                          setSelectedTalentId(talent.id);
                          setSelectedPostingTarget(getPostingSelectionTarget(project));
                        }}
                        selected={selectedTalentId === talent.id}
                        talent={talent}
                      />
                    );
                  })
                : paginatedPostings.map((posting, index) => (
                    <PostingCard
                      activePrimaryCategory={effectiveSelectedCategory}
                      experienceCard={interviewCard}
                      key={`${posting.id}-${posting.title}-${index}`}
                      onApply={() => handleApply(posting)}
                      onSelect={() => {
                        trackJobView(posting.id, posting.companyName, posting.title);
                        activeFocusProjectRef.current = emptyPostingSelection;
                        setIsHomeFocusActive(false);
                        setSelectedPostingTarget(getPostingSelectionTarget(posting));
                        if (isMobile) {
                          setIsMobileDetailOpen(true);
                        }
                      }}
                      posting={posting}
                      profile={seniorProfile}
                      role={role}
                      useServerScore={isServerSearchActive}
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

                  <div className="flex w-full flex-nowrap items-center gap-1 sm:w-auto sm:flex-wrap sm:gap-1.5">
                    <button
                      onClick={() => {
                        activeFocusProjectRef.current = emptyPostingSelection;
                        setIsHomeFocusActive(false);
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={safeCurrentPage === 1}
                      type="button"
                      className="h-8 shrink-0 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-2.5 text-xs font-extrabold text-[#17212B] transition-all hover:bg-[#EFE9DC] disabled:cursor-not-allowed disabled:opacity-35 sm:px-3"
                    >
                      이전
                    </button>

                    {Array.from({ length: Math.min(isMobile ? 5 : 7, totalPages) }, (_, idx) => {
                      const visiblePageCount = isMobile ? 5 : 7;
                      const sidePageCount = Math.floor(visiblePageCount / 2);
                      let pageNum = idx + 1;
                      if (totalPages > visiblePageCount) {
                        if (
                          safeCurrentPage > sidePageCount + 1 &&
                          safeCurrentPage < totalPages - sidePageCount
                        ) {
                          pageNum = safeCurrentPage - sidePageCount + idx;
                        } else if (safeCurrentPage >= totalPages - sidePageCount) {
                          pageNum = totalPages - visiblePageCount + 1 + idx;
                        }
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            activeFocusProjectRef.current = emptyPostingSelection;
                            setIsHomeFocusActive(false);
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          type="button"
                          className={`h-8 min-w-[30px] shrink-0 rounded-xl px-2 text-xs font-extrabold transition-all sm:min-w-[32px] ${
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
                        activeFocusProjectRef.current = emptyPostingSelection;
                        setIsHomeFocusActive(false);
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={safeCurrentPage === totalPages}
                      type="button"
                      className="h-8 shrink-0 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-2.5 text-xs font-extrabold text-[#17212B] transition-all hover:bg-[#EFE9DC] disabled:cursor-not-allowed disabled:opacity-35 sm:px-3"
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
                className="sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-auto rounded-2xl border border-[#E0D9C8] bg-white p-4 pr-1 shadow-xs transition-all [scrollbar-gutter:stable]"
              >
                <DetailPanel
                  activePrimaryCategory={effectiveSelectedCategory}
                  experienceCard={interviewCard}
                  onApply={() => handleApply(selectedPosting)}
                  posting={selectedPosting}
                  profile={seniorProfile}
                  role={role}
                  useServerScore={isServerSearchActive}
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
                useServerScore={isServerSearchActive}
              />
            </div>
          </div>
        </div>
      ) : null}

    </MobilePage>
  );
}

import {
  BriefcaseBusiness,
  CalendarClock,
  Database,
  Filter,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  categoryLabels,
  databaseSummary,
  employmentTypeLabels,
  hiringStageLabels,
  jobPostings,
  seniorityLabels,
  workTypeLabels,
} from '@/data/jobPostings';
import type { HiringStage, JobPosting, ProjectCategory, WorkType } from '@/data/jobPostings';
import { cn } from '@/lib/utils';

import { Chip, MobilePage, type Role, useViewportMode } from '@/app/wireframe/Ui';

const all = 'all';
type CategoryFilter = ProjectCategory | typeof all;
type WorkTypeFilter = WorkType | typeof all;
type HiringStageFilter = HiringStage | typeof all;
type SortOption = 'fit-desc' | 'deadline-asc' | 'latest-desc';

const categoryFilters: { id: CategoryFilter; label: string }[] = [
  { id: all, label: '전체' },
  ...databaseSummary.categories.map(({ id, label }) => ({ id, label })),
];

const workTypeFilters: { id: WorkTypeFilter; label: string }[] = [
  { id: all, label: '전체 근무' },
  { id: 'remote', label: '원격' },
  { id: 'hybrid', label: '하이브리드' },
  { id: 'onsite', label: '오피스' },
];

const hiringStageFilters: { id: HiringStageFilter; label: string }[] = [
  { id: all, label: '전체 단계' },
  { id: 'open', label: '모집 중' },
  { id: 'screening', label: '서류 검토' },
  { id: 'interviewing', label: '인터뷰 중' },
  { id: 'closing', label: '마감 임박' },
];

const sortOptions: { id: SortOption; label: string }[] = [
  { id: 'fit-desc', label: '적합도 높은순' },
  { id: 'deadline-asc', label: '마감 빠른순' },
  { id: 'latest-desc', label: '최신 등록순' },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(value));

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
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  value: T;
}) {
  return (
    <label className="flex flex-col gap-2 text-[12px] font-extrabold text-[#17212B]">
      <span>{label}</span>
      <select
        className="h-11 rounded-xl border border-[#E0D9C8] bg-white px-3 text-[13px] font-bold text-[#17212B] outline-none focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/10"
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

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
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

function PostingCard({
  onSelect,
  posting,
  selected,
}: {
  onSelect: () => void;
  posting: JobPosting;
  selected: boolean;
}) {
  return (
    <button
      className={cn(
        'w-full rounded-2xl border bg-white p-4 text-left shadow-xs transition hover:shadow-md',
        selected ? 'border-[#173F3A] ring-2 ring-[#173F3A]/10' : 'border-[#E0D9C8]',
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-2.5 py-1 text-[11px] font-extrabold text-[#173F3A]">
              {categoryLabels[posting.category]}
            </span>
            <span className="rounded-full border border-[#F06B4F]/30 bg-[#FDF0ED] px-2.5 py-1 text-[11px] font-extrabold text-[#F06B4F]">
              {hiringStageLabels[posting.hiringStage]}
            </span>
          </div>
          <h3 className="mt-3 text-[17px] font-extrabold leading-snug text-[#17212B]">
            {posting.title}
          </h3>
          <p className="mt-1 text-[13px] font-bold text-[#173F3A]">
            {posting.companyName} · {posting.industry}
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-[#173F3A] px-3 py-2 text-center text-white">
          <p className="text-[10px] font-bold opacity-80">적합도</p>
          <p className="text-[18px] font-extrabold">{posting.seniorFitScore}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] font-medium leading-6 text-slate-600">
        {posting.problemStatement}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[12px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {posting.location} · {workTypeLabels[posting.workType]}
        </span>
        <span>{employmentTypeLabels[posting.employmentType]}</span>
        <span>{seniorityLabels[posting.seniority]}</span>
        <span>마감 {formatDate(posting.deadline)}</span>
      </div>
    </button>
  );
}

function DetailPanel({ posting }: { posting: JobPosting }) {
  return (
    <article className="rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-extrabold text-[#F06B4F]">
            {posting.id} · {hiringStageLabels[posting.hiringStage]}
          </p>
          <h2 className="mt-1 text-[22px] font-extrabold leading-tight text-[#17212B]">
            {posting.title}
          </h2>
          <p className="mt-1 text-[13px] font-bold text-[#173F3A]">
            {posting.companyName} · {posting.companySize} · {employmentTypeLabels[posting.employmentType]}
          </p>
        </div>
        <div className="rounded-xl border border-[#F06B4F]/30 bg-[#FDF0ED] px-3 py-2 text-center">
          <p className="text-[11px] font-extrabold text-[#F06B4F]">시니어 적합도</p>
          <p className="text-[24px] font-extrabold text-[#17212B]">{posting.seniorFitScore}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-[13px] font-semibold text-slate-600 sm:grid-cols-2">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-4 text-[#173F3A]" />
          마감 {formatDate(posting.deadline)}
        </span>
        <span>
          {posting.projectDuration} · {posting.salaryRange}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl bg-[#FAF7F2] p-3.5">
          <p className="text-[12px] font-extrabold text-[#173F3A]">해결해야 할 프로젝트</p>
          <p className="mt-2 text-[13px] font-medium leading-6 text-[#17212B]/80">
            {posting.problemStatement}
          </p>
        </section>
        <section className="rounded-xl bg-[#FAF7F2] p-3.5">
          <p className="text-[12px] font-extrabold text-[#173F3A]">프로젝트 목표</p>
          <p className="mt-2 text-[13px] font-medium leading-6 text-[#17212B]/80">
            {posting.projectGoal}
          </p>
        </section>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <section className="rounded-xl border border-[#E0D9C8] p-3.5">
          <p className="text-[12px] font-extrabold text-[#17212B]">핵심 업무</p>
          <ul className="mt-2 space-y-1.5 text-[13px] font-medium text-slate-600">
            {posting.coreResponsibilities.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-[#E0D9C8] p-3.5">
          <p className="text-[12px] font-extrabold text-[#17212B]">자격 요건</p>
          <ul className="mt-2 space-y-1.5 text-[13px] font-medium text-slate-600">
            {posting.qualifications.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-[#E0D9C8] p-3.5">
          <p className="text-[12px] font-extrabold text-[#17212B]">복지/조건</p>
          <ul className="mt-2 space-y-1.5 text-[13px] font-medium text-slate-600">
            {posting.benefits.map((item) => (
              <li key={item}>• {item}</li>
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
          <ul className="mt-2 space-y-1.5 text-[13px] font-medium text-[#17212B]/80">
            {posting.interviewFocus.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-[#E0D9C8] p-3.5">
        <p className="text-[12px] font-extrabold text-[#17212B]">매칭 점수 산정 기준</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {posting.matchingScoreCriteria.map((item) => (
            <span
              className="rounded-full bg-[#FAF7F2] px-3 py-1.5 text-[12px] font-bold text-[#17212B]/80"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      </section>
    </article>
  );
}

export function JobDatabasePage({ role = 'company' }: { role?: Role }) {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(all);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkTypeFilter>(all);
  const [selectedHiringStage, setSelectedHiringStage] = useState<HiringStageFilter>(all);
  const [sortBy, setSortBy] = useState<SortOption>('fit-desc');
  const [selectedId, setSelectedId] = useState(jobPostings[0]?.id ?? '');

  const filteredPostings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return jobPostings
      .filter((posting) => {
        const matchesCategory = selectedCategory === all || posting.category === selectedCategory;
        const matchesWorkType = selectedWorkType === all || posting.workType === selectedWorkType;
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
          ...posting.requiredSkills,
          ...posting.preferredSkills,
          ...posting.matchingSignals,
          ...posting.interviewFocus,
        ]
          .join(' ')
          .toLowerCase();

        return (
          matchesCategory &&
          matchesWorkType &&
          matchesHiringStage &&
          (!normalizedQuery || searchableText.includes(normalizedQuery))
        );
      })
      .sort((first, second) => {
        if (sortBy === 'deadline-asc') {
          return new Date(first.deadline).getTime() - new Date(second.deadline).getTime();
        }
        if (sortBy === 'latest-desc') {
          return new Date(second.postedAt).getTime() - new Date(first.postedAt).getTime();
        }
        return second.seniorFitScore - first.seniorFitScore;
      });
  }, [query, selectedCategory, selectedHiringStage, selectedWorkType, sortBy]);

  const selectedPosting =
    filteredPostings.find((posting) => posting.id === selectedId) ?? filteredPostings[0];

  return (
    <MobilePage
      activeNav="projects"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4' : 'px-6 pb-6 pt-7 md:px-10 md:py-8',
      )}
      role={role}
      showBack={false}
      title="공고 DB"
    >
      <section className="rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-3 py-1 text-[12px] font-extrabold text-[#173F3A]">
          <Sparkles className="size-3.5" />팀 통합 플로우 기반 데이터베이스
        </p>
        <h1 className="mt-3 text-[24px] font-extrabold leading-tight text-[#17212B] md:text-[32px]">
          시니어 인재 매칭에 필요한 공고 데이터를 채용사이트처럼 정리했어요.
        </h1>
        <p className="mt-2 text-[13px] font-medium leading-6 text-slate-600 md:text-[14px]">
          회사 프로젝트 등록, 인재 프로젝트 탐색, AI 인터뷰 카드와 연결할 수 있도록 공고 기본
          정보와 해결 문제, 매칭 신호, 인터뷰 포인트를 함께 담았습니다.
        </p>
      </section>

      <div className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
        <DatabaseMetric
          caption="검색/필터 가능한 시드 데이터"
          label="공고 수"
          value={`${databaseSummary.totalPostings}건`}
        />
        <DatabaseMetric
          caption="AI 매칭 초기 점수 기준"
          label="평균 적합도"
          value={`${databaseSummary.averageSeniorFitScore}점`}
        />
        <DatabaseMetric
          caption="원격 또는 하이브리드"
          label="유연 근무"
          value={`${databaseSummary.remoteFriendlyCount}건`}
        />
        <DatabaseMetric
          caption="우선 노출 필요 공고"
          label="마감 임박"
          value={`${databaseSummary.closingSoonCount}건`}
        />
      </div>

      <section className="rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#17212B]">
          <Filter className="size-4 text-[#173F3A]" />
          프로젝트 유형 필터
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categoryFilters.map((category) => (
            <Chip
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              selected={selectedCategory === category.id}
            >
              {category.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-xs md:grid-cols-3">
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#17212B] md:col-span-3">
          <SlidersHorizontal className="size-4 text-[#173F3A]" />
          채용사이트형 상세 조건
        </div>
        <SelectField
          label="근무 형태"
          onChange={setSelectedWorkType}
          options={workTypeFilters}
          value={selectedWorkType}
        />
        <SelectField
          label="채용 단계"
          onChange={setSelectedHiringStage}
          options={hiringStageFilters}
          value={selectedHiringStage}
        />
        <SelectField label="정렬" onChange={setSortBy} options={sortOptions} value={sortBy} />
      </section>

      <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#E0D9C8] bg-white px-4 shadow-xs focus-within:border-[#173F3A]">
        <Search className="size-5 text-slate-400" />
        <input
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#17212B] outline-none placeholder:text-slate-400"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="회사명, 기술스택, 해결 프로젝트 검색"
          type="search"
          value={query}
        />
      </label>

      <div className="flex items-center justify-between text-[13px] font-bold text-slate-500">
        <span>
          검색 결과 <strong className="text-[#173F3A]">{filteredPostings.length}</strong>건
        </span>
        <span className="inline-flex items-center gap-1">
          <Database className="size-4" />
          DB MVP
        </span>
      </div>

      <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'lg:grid-cols-[0.9fr_1.1fr]')}>
        <section className="grid gap-3 self-start">
          {filteredPostings.map((posting) => (
            <PostingCard
              key={posting.id}
              onSelect={() => setSelectedId(posting.id)}
              posting={posting}
              selected={selectedPosting?.id === posting.id}
            />
          ))}
        </section>

        {selectedPosting ? (
          <div className={isMobile ? 'order-first' : 'sticky top-4 self-start'}>
            <DetailPanel posting={selectedPosting} />
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E0D9C8] bg-white p-5 text-center text-sm font-bold text-slate-500">
            조건에 맞는 공고가 없습니다.
          </div>
        )}
      </div>

      <section className="rounded-2xl border border-[#F06B4F]/30 bg-[#FDF0ED] p-4 shadow-xs">
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#F06B4F]">
          <Target className="size-4" />
          다음 연결 지점
        </div>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[#17212B]/80">
          이 DB는 회사의 프로젝트 등록 화면, 인재의 추천 프로젝트 목록, AI 인터뷰 결과 카드의
          매칭 근거로 연결할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['프로젝트 등록', '인재 추천', 'AI 인터뷰 질문', '요약 카드'].map((item) => (
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

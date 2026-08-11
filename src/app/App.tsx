import {
  BriefcaseBusiness,
  Building2,
  ChartNoAxesColumnIncreasing,
  Database,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  categoryLabels,
  databaseSummary,
  jobPostings,
  seniorityLabels,
  workTypeLabels,
} from '@/data/jobPostings';
import type { ProjectCategory } from '@/data/jobPostings';

const allCategory = 'all';
type CategoryFilter = ProjectCategory | typeof allCategory;

const categoryFilters: { id: CategoryFilter; label: string }[] = [
  { id: allCategory, label: '전체' },
  ...databaseSummary.categories.map(({ id, label }) => ({ id, label })),
];

function AppHeader() {
  return (
    <header className="border-b border-slate-800 bg-[#07101f]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-cyan-400 text-slate-950">
            <Database className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              AL07 Team 04
            </p>
            <h1 className="text-lg font-bold text-white">시니어 채용 공고 데이터베이스</h1>
          </div>
        </div>
        <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-200 sm:inline-flex">
          {databaseSummary.totalPostings}개 공고 구축
        </span>
      </div>
    </header>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <article className="rounded-lg border border-slate-800 bg-[#0b1628] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-lg bg-slate-900 text-cyan-300">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{caption}</p>
    </article>
  );
}

export function App() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(allCategory);

  const filteredPostings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return jobPostings.filter((posting) => {
      const matchesCategory =
        selectedCategory === allCategory || posting.category === selectedCategory;
      const searchableText = [
        posting.companyName,
        posting.title,
        posting.problemStatement,
        posting.projectGoal,
        posting.location,
        ...posting.requiredSkills,
        ...posting.preferredSkills,
        ...posting.matchingSignals,
      ]
        .join(' ')
        .toLowerCase();

      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [query, selectedCategory]);

  return (
    <main className="min-h-screen bg-[#050b16] text-slate-100">
      <AppHeader />

      <section className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-800 bg-[#0b1628] p-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                <Sparkles className="size-4" />
                우리 프로젝트 기준으로 재정의한 채용 DB
              </p>
              <h2 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl">
                시니어 인재 매칭에 필요한 공고 데이터를 한곳에 모았어요.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                일반 채용사이트의 회사명, 직무, 경력 조건에 더해 해결해야 할 프로젝트 문제,
                매칭 신호, AI 인터뷰 질문 포인트까지 포함한 데이터셋입니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <StatCard
                caption="초기 MVP 검증용 시드 데이터"
                icon={BriefcaseBusiness}
                label="공고 수"
                value={`${databaseSummary.totalPostings}건`}
              />
              <StatCard
                caption="시니어 타겟 적합도 평균"
                icon={Target}
                label="평균 점수"
                value={`${databaseSummary.averageSeniorFitScore}점`}
              />
              <StatCard
                caption="원격 또는 하이브리드 근무 가능"
                icon={ChartNoAxesColumnIncreasing}
                label="유연 근무"
                value={`${databaseSummary.remoteFriendlyCount}건`}
              />
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0b1628] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Filter className="size-4 text-cyan-300" />
                프로젝트 유형
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {categoryFilters.map((category) => {
                  const isSelected = selectedCategory === category.id;

                  return (
                    <button
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        isSelected
                          ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-400'
                      }`}
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      type="button"
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex h-12 items-center gap-3 rounded-lg border border-slate-800 bg-[#0b1628] px-4 focus-within:border-cyan-300">
              <Search className="size-5 text-slate-500" />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="회사명, 기술스택, 해결 프로젝트 검색"
                type="search"
                value={query}
              />
            </label>

            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>
                검색 결과 <strong className="text-white">{filteredPostings.length}</strong>건
              </span>
              <span>시니어 타겟 공고 DB</span>
            </div>

            <section className="grid gap-4">
              {filteredPostings.map((posting) => (
                <article
                  className="rounded-lg border border-slate-800 bg-[#0b1628] p-5 transition hover:border-cyan-400/70"
                  key={posting.id}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-violet-400/15 px-2.5 py-1 text-xs font-bold text-violet-200">
                          {categoryLabels[posting.category]}
                        </span>
                        <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-200">
                          {seniorityLabels[posting.seniority]}
                        </span>
                        <span className="text-xs text-slate-500">{posting.id}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-white">{posting.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-4" />
                          {posting.companyName}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-4" />
                          {posting.location} · {workTypeLabels[posting.workType]}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-center">
                      <p className="text-xs font-semibold text-cyan-200">시니어 적합도</p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {posting.seniorFitScore}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        해결 프로젝트
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {posting.problemStatement}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        목표
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {posting.projectGoal}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {posting.requiredSkills.map((skill) => (
                      <span
                        className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-300"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <p className="text-sm font-semibold text-white">AI 인터뷰 확인 포인트</p>
                    <ul className="mt-2 grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
                      {posting.interviewFocus.map((focus) => (
                        <li className="rounded-md bg-slate-950 px-3 py-2" key={focus}>
                          {focus}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

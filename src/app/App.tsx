import {
  Activity,
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  Home,
  ListChecks,
  Medal,
  Moon,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Timer,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const categories = [
  { id: 'strength', label: '근력', icon: Dumbbell, accent: '#2F80ED' },
  { id: 'cardio', label: '유산소', icon: HeartPulse, accent: '#7C3AED' },
  { id: 'cycling', label: '자전거', icon: Bike, accent: '#12B981' },
  { id: 'routine', label: '루틴', icon: ListChecks, accent: '#F59E0B' },
] as const;

const defaultCategory = categories[0];
type Category = (typeof categories)[number];

const recommendedPlans = [
  { title: '초보자 전신 루틴', minutes: 28, level: '입문', progress: 66 },
  { title: '하체 집중 기록', minutes: 36, level: '중급', progress: 42 },
  { title: '퇴근 후 회복 스트레칭', minutes: 18, level: '가벼움', progress: 82 },
] as const;

const defaultPlan = recommendedPlans[0];

const dailyTasks = ['워밍업 5분', '스쿼트 4세트', '푸시업 3세트', '쿨다운 기록'];

const mobileScreens = [
  {
    title: '오늘의 추천',
    subtitle: '내 컨디션에 맞춘 운동',
    icon: Sparkles,
    tone: 'from-blue-500 to-cyan-400',
  },
  {
    title: '운동 기록',
    subtitle: '완료한 세트와 시간을 저장',
    icon: Timer,
    tone: 'from-violet-500 to-blue-500',
  },
  {
    title: '성취 배지',
    subtitle: '연속 달성 보상을 확인',
    icon: Trophy,
    tone: 'from-emerald-400 to-teal-300',
  },
];

function PhonePreview() {
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[34px] border border-slate-700 bg-[#050915] p-3 shadow-2xl shadow-blue-950/40">
      <div className="overflow-hidden rounded-[26px] border border-slate-800 bg-[#08111f]">
        <div className="flex items-center justify-between px-5 py-4 text-xs text-slate-400">
          <span>9:41</span>
          <div className="h-1.5 w-16 rounded-full bg-slate-700" />
          <span>100%</span>
        </div>
        <div className="space-y-5 px-5 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-300">경험해봄</p>
              <h2 className="mt-1 text-xl font-semibold text-white">오늘도 한 번 해봄</h2>
            </div>
            <button
              aria-label="설정"
              className="grid size-10 place-items-center rounded-full bg-slate-800 text-slate-300"
              type="button"
            >
              <Settings className="size-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">이번 주 달성률</p>
                <p className="mt-1 text-3xl font-bold text-white">78%</p>
              </div>
              <div className="grid size-14 place-items-center rounded-2xl bg-blue-500 text-white">
                <Flame className="size-7" />
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[78%] rounded-full bg-blue-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.slice(0, 4).map(({ icon: Icon, label }) => (
              <button
                className="rounded-2xl border border-slate-700 bg-slate-900 p-3 text-left text-sm font-medium text-slate-100"
                key={label}
                type="button"
              >
                <Icon className="mb-3 size-5 text-blue-300" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {dailyTasks.map((task, index) => (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-900 p-3" key={task}>
                <CheckCircle2
                  className={`size-5 ${index < 2 ? 'text-blue-400' : 'text-slate-600'}`}
                />
                <span className="text-sm text-slate-200">{task}</span>
              </div>
            ))}
          </div>

          <nav className="grid grid-cols-4 rounded-2xl bg-slate-950 p-2 text-slate-500">
            {[Home, Search, CalendarDays, UserRound].map((Icon, index) => (
              <button
                aria-label={`탭 ${index + 1}`}
                className={`grid place-items-center rounded-xl py-2 ${index === 0 ? 'bg-blue-600 text-white' : ''}`}
                key={index}
                type="button"
              >
                <Icon className="size-5" />
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function AppPreviewCard({
  title,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: typeof Sparkles;
  tone: string;
}) {
  return (
    <div className="min-h-[164px] rounded-lg border border-slate-800 bg-[#0b1424] p-4">
      <div className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${tone} text-white`}>
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>모바일 화면</span>
        <ChevronRight className="size-4" />
      </div>
    </div>
  );
}

export function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(defaultCategory);

  const selectedPlan = useMemo(
    () => recommendedPlans.find((plan) => plan.level !== '가벼움') ?? defaultPlan,
    [],
  );

  return (
    <main className="min-h-screen bg-[#050915] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
              AL07 Team 04
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">경험해봄</h1>
          </div>
          <button
            className="inline-grid size-11 place-items-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-blue-400 hover:text-white"
            type="button"
            aria-label="운동 추가"
          >
            <Plus className="size-5" />
          </button>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-7">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
                <Activity className="size-4" />
                운동 경험을 기록하고 추천받는 모바일 서비스
              </p>
              <h2 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-5xl">
                오늘 할 운동을 고르고,
                <br />
                바로 기록까지 이어가세요.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-400">
                FigJam 시안의 다크 모바일 UI를 바탕으로 카테고리 선택, 추천 루틴,
                진행률, 하단 탭 구조를 React 화면으로 구현했습니다.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0b1424] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">운동 카테고리 선택</p>
                  <p className="mt-1 text-lg font-semibold text-white">{selectedCategory.label}</p>
                </div>
                <Medal className="size-6 text-blue-300" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory.id === category.id;

                  return (
                    <button
                      className={`rounded-lg border p-4 text-left transition ${
                        isSelected
                          ? 'border-blue-400 bg-blue-500/15 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
                      }`}
                      key={category.id}
                      onClick={() => setSelectedCategory(category)}
                      type="button"
                    >
                      <Icon
                        className="size-5"
                        style={{ color: isSelected ? category.accent : undefined }}
                      />
                      <span className="mt-3 block text-sm font-semibold">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {recommendedPlans.map((plan) => (
                <article
                  className="rounded-lg border border-slate-800 bg-[#0b1424] p-4"
                  key={plan.title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{plan.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {plan.minutes}분 · {plan.level}
                      </p>
                    </div>
                    <Play className="size-5 text-blue-300" />
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${plan.progress}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.78fr]">
            <PhonePreview />
            <aside className="space-y-4">
              <div className="rounded-lg border border-slate-800 bg-[#0b1424] p-5">
                <Moon className="size-6 text-blue-300" />
                <p className="mt-4 text-sm text-slate-400">현재 추천 루틴</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{selectedPlan.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  선택한 카테고리와 최근 기록을 기준으로 오늘 완료하기 좋은 루틴을
                  먼저 보여줍니다.
                </p>
              </div>
              {mobileScreens.map((screen) => (
                <AppPreviewCard key={screen.title} {...screen} />
              ))}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

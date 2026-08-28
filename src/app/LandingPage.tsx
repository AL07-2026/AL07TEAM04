import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  Handshake,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router';

const features = [
  {
    number: '01',
    icon: Sparkles,
    title: 'AI 경험 과제화',
    description:
      '오랜 경력을 AI 대화로 정리해, 내가 잘하는 문제 해결 역량을 기업이 이해하기 쉽게 보여줍니다.',
  },
  {
    number: '02',
    icon: Handshake,
    title: '1순위 정밀 매칭',
    description:
      '희망 직무와 지역, 경력을 함께 살펴 시니어의 경험이 꼭 필요한 기업 프로젝트를 연결합니다.',
  },
  {
    number: '03',
    icon: Clock3,
    title: '주 1~3회 유연 근무',
    description:
      '풀타임이 아니어도 괜찮습니다. 원격과 하이브리드 방식으로 부담 없이 다시 일할 수 있습니다.',
  },
] as const;

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[#f7f3ea] text-[#17212b]">
      <header className="sticky top-0 z-50 border-b border-[#e0d9c8] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
          <button
            type="button"
            onClick={() => void navigate('/')}
            className="inline-flex items-center border-0 bg-transparent p-0"
            aria-label="이어잡 첫 화면"
          >
            <img src="/logo_text.png" alt="이어잡" className="h-7 w-auto object-contain" />
          </button>
        </div>
      </header>

      <main>
        <section className="relative isolate min-h-[680px] overflow-hidden bg-[#0d3430] sm:min-h-[720px]">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/eojob-landing-hero.mp4"
            title="시니어의 경험과 기업의 과제가 만나는 이어잡 소개 영상"
            autoPlay
            muted
            loop
            playsInline
            controls
            controlsList="nodownload noremoteplayback"
            preload="metadata"
          />
          <div className="absolute inset-0 bg-[#0b302c]/55" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,35,32,0.96)_0%,rgba(8,35,32,0.83)_42%,rgba(8,35,32,0.22)_78%,rgba(8,35,32,0.38)_100%)]"
            aria-hidden="true"
          />

          <div className="relative mx-auto flex min-h-[680px] max-w-6xl items-center px-5 py-16 sm:min-h-[720px] sm:px-8">
            <div className="max-w-3xl text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-sm font-bold text-[#d9eee8] backdrop-blur-sm">
                <Sparkles className="size-4 text-[#ff8a70]" aria-hidden="true" />
                <span>실무 과제 중심의 경험인재 매칭 플랫폼</span>
              </div>

              <h1 className="mt-7 text-4xl font-black leading-[1.18] tracking-normal sm:text-5xl lg:text-6xl">
                기업의 실무 문제와
                <br />
                시니어의 경험을 잇다
              </h1>

              <p className="mt-7 max-w-2xl text-lg font-medium leading-relaxed text-white/88 sm:text-xl">
                기업에는 지금 필요한 실무 경험을, 시니어에게는 다시 빛날 수 있는 일을 연결합니다.
                이어잡이 경력과 과제를 이해하고 알맞은 프로젝트를 찾아드립니다.
              </p>

              <div className="mt-9 flex items-center gap-4 text-lg font-bold text-[#ffd5ca] sm:text-xl">
                <span className="h-1 w-12 bg-[#f06b4f]" aria-hidden="true" />
                <p>경험을 잇고, 일을 잇고, 세대를 잇다</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20" aria-labelledby="landing-features-title">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-base font-extrabold text-[#b84734]">이어잡이 연결하는 방법</p>
              <h2
                id="landing-features-title"
                className="mt-3 text-3xl font-black leading-tight text-[#17212b] sm:text-4xl"
              >
                경험이 다시 일이 되는
                <br />
                쉽고 분명한 연결
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {features.map(({ number, icon: Icon, title, description }) => (
                <article
                  key={number}
                  className="rounded-lg border border-[#e0d9c8] bg-[#faf8f3] p-6 shadow-[0_8px_24px_rgba(23,33,43,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#b84734]">{number}</span>
                    <span className="grid size-11 place-items-center rounded-lg bg-[#ddebe7] text-[#173f3a]">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-black text-[#173f3a]">{title}</h3>
                  <p className="mt-3 text-base font-medium leading-relaxed text-[#4b5768]">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#c9ddd7] bg-[#ddebe7] py-12 sm:py-14">
          <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#173f3a] text-white">
                <TrendingUp className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-[#b84734]">고용노동부 연계 혜택</p>
                <h2 className="mt-2 text-2xl font-black leading-snug text-[#173f3a] sm:text-3xl">
                  검증된 시니어 인재와 함께하고, 인건비 부담도 낮추세요
                </h2>
                <p className="mt-3 text-base font-medium leading-relaxed text-[#405a56]">
                  국민취업지원제도 요건을 충족한 인재를 채용하면 고용촉진장려금 지원 대상이 될 수
                  있습니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void navigate('/login?role=company')}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#173f3a] bg-white px-6 text-base font-extrabold text-[#173f3a] transition hover:bg-[#f7f3ea] active:scale-[0.98]"
            >
              혜택 대상 인재 보기
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="bg-[#173f3a] py-16 text-center text-white sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <BriefcaseBusiness className="mx-auto size-10 text-[#ff8a70]" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
              당신의 경험이 필요한 일을 만나보세요
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed text-white/78 sm:text-lg">
              로그인하지 않아도 이어잡의 전체 프로젝트를 먼저 살펴볼 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="mx-auto mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-[#f06b4f] px-7 text-lg font-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition hover:bg-[#d9573d] active:scale-[0.98]"
            >
              전체 프로젝트 보러가기
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e0d9c8] bg-white py-7 text-center text-sm font-semibold text-[#667085]">
        <p>© 2026 이어잡 (Eojob). All rights reserved.</p>
      </footer>
    </div>
  );
}

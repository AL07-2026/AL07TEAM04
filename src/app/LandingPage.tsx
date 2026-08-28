import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  CreditCard,
  Handshake,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router';

const features = [
  {
    number: '01',
    icon: CreditCard,
    title: '경험 카드',
    description:
      '개인의 경험과 경력을 AI 인터뷰와 직접 입력으로 정리합니다. AI가 문제 해결 역량을 명확하게 추출해 한눈에 보는 경험 카드로 완성합니다.',
    background: 'bg-[#fffbed]',
    iconBackground: 'bg-[#fff1b8]',
  },
  {
    number: '02',
    icon: Handshake,
    title: 'AI 맞춤 매칭',
    description:
      '개인의 경력과 경험, 1·2·3순위 희망 내용을 함께 반영해 AI가 인재와 기업의 프로젝트를 맞춤 연결합니다.',
    background: 'bg-[#f3f8f6]',
    iconBackground: 'bg-[#dcebe6]',
  },
  {
    number: '03',
    icon: Clock3,
    title: '유연 근무',
    description:
      '전일제·반일제·시간 근무제부터 직장·재택·하이브리드까지, 원하는 시간과 장소에서 자유롭게 프로젝트를 수행합니다.',
    background: 'bg-[#fff6f1]',
    iconBackground: 'bg-[#ffe0d6]',
  },
] as const;

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-white text-[#17212b]">
      <header className="sticky top-0 z-50 border-b border-[#e7dfcb] bg-white/95 backdrop-blur-sm">
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
        <section className="bg-[#fffdf5] px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-18">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8d0b9] bg-white px-4 py-2 text-sm font-extrabold text-[#173f3a] shadow-sm">
                <Sparkles className="size-4 text-[#f06b4f]" aria-hidden="true" />
                <span>실무 과제 중심의 경험인재 매칭 플랫폼</span>
              </div>

              <h1 className="mt-7 text-4xl font-black leading-[1.2] tracking-normal text-[#17212b] sm:text-5xl lg:text-6xl">
                기업의 실무 프로젝트와
                <br />
                <span className="text-[#173f3a]">시니어의 경험을 잇다</span>
              </h1>

              <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-relaxed text-[#53606e] sm:text-xl">
                기업에는 지금 필요한 실무 경험을, 시니어에게는 다시 빛날 수 있는 일을 연결합니다.
                이어잡이 경력과 과제를 이해하고 알맞은 프로젝트를 찾아드립니다.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-lg border border-[#e1d7bd] bg-[#17212b] p-2 shadow-[0_14px_36px_rgba(23,63,58,0.14)] sm:p-3">
              <video
                className="aspect-video w-full rounded-md bg-black object-contain"
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
            </div>

            <div className="mt-8 flex items-center justify-center gap-4 text-center text-xl font-black text-[#173f3a] sm:text-2xl">
              <span className="h-1 w-10 shrink-0 bg-[#f06b4f]" aria-hidden="true" />
              <p>경험을 잇고, 일을 잇고, 세대를 잇다</p>
              <span className="h-1 w-10 shrink-0 bg-[#f06b4f]" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="border-t border-[#eee5cf] bg-white px-5 py-16 sm:px-8 sm:py-20" aria-labelledby="service-features-title">
          <div className="mx-auto max-w-6xl">
            <div className="border-t border-[#e5decc] pt-8">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f06b4f]">
                이어잡의 특별한 연결
              </p>
              <h2
                id="service-features-title"
                className="mt-3 text-3xl font-black tracking-normal text-[#17212b] sm:text-4xl"
              >
                Service Features
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {features.map(
                ({ number, icon: Icon, title, description, background, iconBackground }) => (
                  <article
                    key={number}
                    className={`${background} min-h-[290px] rounded-lg border border-[#e2dac7] p-6 shadow-[0_10px_28px_rgba(23,33,43,0.08)] sm:p-7`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#f06b4f]">{number}</span>
                      <span
                        className={`${iconBackground} grid size-12 place-items-center rounded-lg text-[#173f3a]`}
                      >
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-2xl font-black text-[#151b21]">{title}</h3>
                    <p className="mt-4 text-base font-semibold leading-[1.75] text-[#303943]">
                      {description}
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-[#d8e4df] bg-[#edf6f2] px-5 py-11 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#173f3a] text-white">
                <TrendingUp className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-[#f06b4f]">고용노동부 연계 혜택</p>
                <h2 className="mt-2 text-2xl font-black leading-snug text-[#17212b] sm:text-3xl">
                  검증된 시니어 인재와 함께하고, 인건비 부담도 낮추세요
                </h2>
                <p className="mt-3 text-base font-medium leading-relaxed text-[#465a55]">
                  국민취업지원제도 요건을 충족한 인재를 채용하면 고용촉진장려금 지원 대상이 될 수
                  있습니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void navigate('/login?role=company')}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d8d0b9] bg-white px-6 text-base font-black text-[#173f3a] shadow-sm transition hover:border-[#173f3a] active:scale-[0.98]"
            >
              혜택 대상 인재 보기
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="bg-[#fffbed] px-5 py-14 sm:px-8 sm:py-18">
          <div className="mx-auto max-w-6xl rounded-lg border border-[#e2dac7] bg-white px-6 py-10 text-center shadow-[0_12px_30px_rgba(23,33,43,0.09)] sm:px-10 sm:py-12">
            <h2 className="text-2xl font-black leading-snug text-[#17212b] sm:text-3xl">
              지금 바로 이어잡의 검증된 프로젝트를 확인해 보세요
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base font-medium leading-relaxed text-[#53606e] sm:text-lg">
              로그인 없이도 전체 실시간 프로젝트 데이터베이스를 자유롭게 둘러보실 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="mx-auto mt-7 inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-[#173f3a] px-7 text-lg font-black text-white shadow-[0_8px_20px_rgba(23,63,58,0.22)] transition hover:bg-[#0f332f] active:scale-[0.98]"
            >
              <BriefcaseBusiness className="size-5" aria-hidden="true" />
              전체 프로젝트 보러가기
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e7dfcb] bg-white px-5 py-7 sm:px-8">
        <p className="mx-auto max-w-6xl text-right text-sm font-semibold text-[#667085]">
          © 2026 이어잡 IEO Job. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

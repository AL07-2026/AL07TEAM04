import {
  ArrowRight,
  Building2,
  BriefcaseBusiness,
  Clock3,
  CreditCard,
  Handshake,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router';

const features = [
  {
    number: '01',
    icon: CreditCard,
    title: '경험 카드',
    description:
      '개인의 경험 및 경력을 음성 인터뷰 및 직접 입력 후 AI가 적절하게 정리합니다. AI가 문제 해결 역량을 명확하게 추출해 한눈에 보는 경험 카드로 완성합니다.',
  },
  {
    number: '02',
    icon: Handshake,
    title: 'AI 맞춤 매칭',
    description:
      '인재가 선택한 1·2·3순위 희망 분야로 필터링하고, 경험 및 경력 내용을 함께 반영해 AI가 인재와 기업의 프로젝트를 맞춤 연결합니다.',
  },
  {
    number: '03',
    icon: Clock3,
    title: '유연 근무',
    description:
      '전일제·반일제·시간 근무제부터 직장·재택·하이브리드까지, 원하는 시간과 장소에서 자유롭게 프로젝트를 수행합니다.',
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

          <nav className="ml-auto flex items-center gap-1" aria-label="빠른 이동">
            <button
              type="button"
              onClick={() => void navigate('/login?role=senior')}
              className="group relative grid size-10 place-items-center rounded-md text-[#173f3a] transition hover:bg-[#edf6f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f3a]"
              aria-label="인재로 로그인"
              title="인재로 로그인"
            >
              <UserRound className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-[#17212b] px-2 py-1 text-xs font-semibold text-white shadow-md group-hover:block group-focus-visible:block">
                인재로 로그인
              </span>
            </button>
            <button
              type="button"
              onClick={() => void navigate('/login?role=company')}
              className="group relative grid size-10 place-items-center rounded-md text-[#173f3a] transition hover:bg-[#edf6f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f3a]"
              aria-label="기업으로 로그인"
              title="기업으로 로그인"
            >
              <Building2 className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-[#17212b] px-2 py-1 text-xs font-semibold text-white shadow-md group-hover:block group-focus-visible:block">
                기업으로 로그인
              </span>
            </button>
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="group relative grid size-10 place-items-center rounded-md text-[#173f3a] transition hover:bg-[#edf6f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f3a]"
              aria-label="프로젝트 보러가기"
              title="프로젝트 보러가기"
            >
              <BriefcaseBusiness className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-[#17212b] px-2 py-1 text-xs font-semibold text-white shadow-md group-hover:block group-focus-visible:block">
                프로젝트 보러가기
              </span>
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-white px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-18">
          <div className="mx-auto max-w-6xl">
            <div className="pt-2 text-left">
              <p className="text-[0.875rem] font-black tracking-[0.16em] text-[#f47a36] sm:text-[1rem]">
                이어잡이 만드는 새로운 연결
              </p>
              <h2
                className="mt-2 text-[1.5rem] font-medium leading-tight tracking-normal text-[#17212b] sm:text-[1.875rem]"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
                }}
              >
                Experience Meets Opportunity
              </h2>

              <h1 className="mt-10 text-[2rem] font-black leading-[1.24] tracking-normal text-[#111820] sm:text-[3rem] lg:text-[3.75rem]">
                <span className="text-[#173f3a]">기업</span>의{' '}
                <span className="text-[#173f3a]">실무</span> 프로젝트와
                <br />
                <span className="text-[#173f3a]">시니어</span>의{' '}
                <span className="text-[#173f3a]">경험</span>을 잇다
              </h1>

              <p className="mt-6 max-w-5xl text-[1rem] font-medium leading-[1.75] text-[#53606e] sm:text-[1.125rem]">
                <span className="block">
                  &nbsp;경험을 잇고, 일을 잇고, 세대를 잇다.&nbsp;이어잡입니다.
                </span>
                <span className="mt-1 block">
                  이어잡은 시니어 전문가의 실무 노하우와 기업의 당면 과제를 AI로 매칭하는
                  플랫폼으로
                </span>
                <span className="mt-1 block">
                  개인의 경험 및 경력과 기업의 해결 과제를 분석하여, 필요한 프로젝트를
                  연결해 드립니다.
                </span>
              </p>

            </div>

            <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-lg shadow-[0_14px_36px_rgba(23,63,58,0.14)]">
              <video
                className="aspect-video w-full object-cover"
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
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-8 sm:py-20" aria-labelledby="service-features-title">
          <div className="mx-auto max-w-6xl">
            <div>
              <p className="text-[0.875rem] font-black uppercase tracking-[0.24em] text-[#f47a36] sm:text-[1rem]">
                이어잡의 서비스 특징
              </p>
              <h2
                id="service-features-title"
                className="mt-2 text-[1.5rem] font-medium tracking-normal text-[#17212b] sm:text-[1.875rem]"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
                }}
              >
                Service Features
              </h2>
            </div>

            <div className="mt-10 grid gap-7 md:grid-cols-3">
              {features.map(
                ({ number, icon: Icon, title, description }) => (
                  <article
                    key={number}
                    className="min-h-[320px] rounded-lg border border-[#bfd8d0] bg-[#e3f0ec] p-7 text-[#17212b] shadow-[0_12px_30px_rgba(23,63,58,0.12)] sm:p-8"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[0.95rem] font-black text-[#f47a36]">{number}</span>
                      <Icon
                        className="size-[3.25rem] text-[#173f3a]"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mt-8 text-[1.75rem] font-black leading-tight text-[#111820]">
                      {title}
                    </h3>
                    <p className="mt-4 text-[1.125rem] font-semibold leading-[1.75] text-[#26332f]">
                      {description}
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-[#efe5be] bg-[#fffbed] px-5 py-11 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl gap-3 sm:gap-4">
              <span className="grid size-11 shrink-0 place-items-center text-[#f47a36] sm:size-12">
                <Sparkles
                  className="size-9 motion-safe:animate-pulse sm:size-10"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>
              <div>
                <p className="text-[0.875rem] font-black text-[#f47a36] sm:text-[1rem]">
                  고용노동부 연계 혜택
                </p>
                <h2 className="mt-2 text-[1.375rem] font-black leading-snug text-[#17212b] sm:text-[1.875rem]">
                  검증된 시니어 인재와 함께하고, 인건비 부담도 낮추세요
                </h2>
                <p className="mt-3 text-[1rem] font-medium leading-[1.7] text-[#465a55] sm:text-[1.0625rem]">
                  국민취업지원제도 요건을 충족한 인재를 채용하면 고용촉진장려금 지원 대상이 될 수
                  있습니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void navigate('/login?role=company')}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d8d0b9] bg-white px-5 text-[1rem] font-black text-[#173f3a] shadow-sm transition hover:border-[#173f3a] active:scale-[0.98] sm:px-6"
            >
              혜택 대상 인재 보기
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="bg-white px-5 py-14 sm:px-8 sm:py-18">
          <div className="mx-auto max-w-6xl px-5 py-9 text-center sm:px-10 sm:py-12">
            <h2 className="text-[1.375rem] font-black leading-[1.35] text-[#17212b] sm:text-[1.875rem]">
              지금 바로 이어잡의 검증된 프로젝트를 확인해 보세요
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[1rem] font-medium leading-[1.7] text-[#53606e] sm:text-[1.125rem]">
              로그인 없이도 전체 실시간 프로젝트 데이터베이스를 자유롭게 둘러보실 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="mx-auto mt-7 inline-flex min-h-14 items-center justify-center gap-2.5 whitespace-nowrap rounded-lg bg-[#173f3a] px-5 text-[1rem] font-black text-white shadow-[0_8px_20px_rgba(23,63,58,0.22)] transition hover:bg-[#0f332f] active:scale-[0.98] sm:px-7 sm:text-[1.125rem]"
            >
              <BriefcaseBusiness className="size-5 shrink-0" aria-hidden="true" />
              전체 프로젝트 보러가기
              <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-white px-5 py-7 sm:px-8">
        <p className="mx-auto max-w-6xl text-right text-[0.875rem] font-semibold text-[#667085]">
          © 2026 이어잡 IEO Job. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Handshake,
  Home,
  IdCard,
  Info,
  Landmark,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { SiteHeader } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';
import { trackButtonClick, trackSubsidyModalOpen } from '@/services/analyticsService';

const features = [
  {
    icon: IdCard,
    title: '경험 카드',
    description:
      '음성 인터뷰와 직접 입력 내용을 AI가 정리해, 문제 해결 역량이 한눈에 보이는 경험 카드로 완성합니다.',
  },
  {
    icon: Handshake,
    title: 'AI 맞춤 매칭',
    description:
      '희망 분야 1-3순위와 경험·경력을 함께 분석해, 인재와 기업에 맞는 프로젝트를 연결합니다.',
  },
  {
    icon: Clock3,
    title: '유연 근무',
    description:
      '전일제, 반일제, 시간제부터 직장 근무, 재택, 하이브리드까지 원하는 방식으로 프로젝트를 수행합니다.',
  },
] as const;

export function LandingPage() {
  const navigate = useNavigate();
  const { isAdmin, user, signOut } = useAuth();
  const [showSubsidyModal, setShowSubsidyModal] = useState(false);

  const homePath = user?.role === 'company' ? '/company' : '/senior';

  return (
    <div className="min-h-dvh bg-white text-[#17212b]">
      <SiteHeader
        glass
        onProjectClick={() => trackButtonClick('nav_view_projects')}
        actions={
          <nav className="ml-auto flex items-center gap-1.5 sm:gap-2" aria-label="빠른 이동">
            {user ? (
              <>
                {/* 1. 회원 구분 뱃지 */}
                <div
                  className="site-glass-status hidden min-h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold text-[#173F3A] sm:inline-flex"
                  aria-label={
                    user.role === 'company' ? '기업 회원으로 로그인됨' : '인재 회원으로 로그인됨'
                  }
                >
                  <span
                    className="size-2 rounded-full bg-[#10B981] ring-2 ring-[#10B981]/25"
                    aria-hidden="true"
                  />
                  {user.role === 'company' ? (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="size-3.5 shrink-0 text-[#173F3A]" aria-hidden="true" />
                      <span>기업 회원</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <UserRound className="size-3.5 shrink-0 text-[#173F3A]" aria-hidden="true" />
                      <span>인재 회원</span>
                    </span>
                  )}
                </div>

                {/* 2. 내 홈 메인 버튼 (Primary CTA) */}
                <button
                  type="button"
                  onClick={() => {
                    trackButtonClick('nav_user_home');
                    void navigate(homePath);
                  }}
                  className="site-glass-primary inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] sm:px-4"
                  aria-label="내 홈으로 이동"
                  title="내 홈으로 이동"
                >
                  <Home className="size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="hidden sm:inline">내 홈</span>
                </button>

                {/* 3. 관리자 버튼 (관리자일 때) */}
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => void navigate('/admin/dashboard')}
                    className="site-glass-control hidden min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-bold text-[#173F3A] transition-[background-color,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] sm:inline-flex sm:px-3"
                    aria-label="관리자 페이지"
                    title="관리자 페이지"
                  >
                    <ShieldCheck
                      className="size-4.5 shrink-0 text-[#173F3A]"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <span className="hidden md:inline">관리자</span>
                  </button>
                ) : null}

                {/* 4. 로그아웃 버튼 */}
                <button
                  type="button"
                  onClick={async () => {
                    trackButtonClick('nav_logout');
                    await signOut();
                  }}
                  className="site-glass-control site-glass-danger inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-bold text-[#5A6872] transition-[color,background-color,border-color,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] sm:px-3"
                  aria-label="로그아웃"
                  title="로그아웃"
                >
                  <LogOut className="size-4.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    trackButtonClick('nav_login_senior');
                    void navigate('/login?role=senior');
                  }}
                  className="site-glass-control inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold text-[#173F3A] transition-[color,background-color,border-color,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] sm:px-3.5"
                  aria-label="인재로 로그인"
                  title="인재로 로그인"
                >
                  <UserRound className="size-4.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className="hidden sm:inline">인재 로그인</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    trackButtonClick('nav_login_company');
                    void navigate('/login?role=company');
                  }}
                  className="site-glass-control inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold text-[#173F3A] transition-[color,background-color,border-color,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] sm:px-3.5"
                  aria-label="기업으로 로그인"
                  title="기업으로 로그인"
                >
                  <Building2 className="size-4.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className="hidden sm:inline">기업 로그인</span>
                </button>
              </>
            )}
          </nav>
        }
      />

      <main>
        <section className="bg-white pb-16 pt-14 sm:pb-20 sm:pt-18">
          <div className="site-rail">
            <div className="pt-2 text-left">
              <p className="text-[0.875rem] font-bold tracking-[0.16em] text-[#F06B4F] sm:text-[1rem]">
                이어잡이 만드는 새로운 연결
              </p>
              <h1 className="mt-5 max-w-4xl text-balance text-[2rem] font-black leading-[1.20] tracking-normal text-[#111820] sm:mt-6 sm:text-[3rem] lg:text-[3.75rem]">
                <span className="text-[#173f3a]">기업</span>의{' '}
                <span className="text-[#173f3a]">실무</span> 프로젝트와
                <br />
                <span className="text-[#173f3a]">시니어</span>의{' '}
                <span className="text-[#173f3a]">경험</span>을 잇다
              </h1>

              <p className="mt-6 max-w-4xl text-pretty text-[1rem] font-medium leading-[1.75] text-[#53606e] sm:text-[1.125rem]">
                <span className="block">
                  경험을 잇고, 일을 잇고, 세대를 잇다.&nbsp;이어잡입니다.
                </span>
                <span className="mt-1 inline sm:block">
                  이어잡은 시니어 전문가의 실무 노하우와 기업의 당면 과제를 AI로 매칭하는
                  플랫폼으로{' '}
                </span>
                <span className="inline sm:mt-1 sm:block">
                  개인의 경험 및 경력과 기업의 해결 과제를 분석하여, 필요한 프로젝트를 연결해
                  드립니다.
                </span>
              </p>
            </div>

            <div className="mt-10 w-full overflow-hidden rounded-lg shadow-[0_14px_36px_rgba(23,63,58,0.14)]">
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

        <section
          className="bg-white py-12 sm:py-16 md:py-20"
          aria-labelledby="service-features-title"
        >
          <div className="site-rail">
            <div>
              <p className="text-[0.875rem] font-bold text-[#F06B4F] sm:text-[1rem]">
                이어잡의 서비스 특징
              </p>
              <h2
                id="service-features-title"
                className="mt-2 max-w-2xl text-balance text-[1.375rem] font-black leading-snug tracking-normal text-[#17212B] sm:text-[1.875rem]"
              >
                경험을 프로젝트로 연결하는 세 가지 방식
              </h2>
            </div>

            <div className="mt-7 grid gap-4 sm:mt-8 sm:gap-5 md:mt-10 md:grid-cols-3 md:gap-7">
              {features.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 rounded-2xl bg-[#DDEBE7]/70 p-5 text-[#17212B] shadow-[0_8px_24px_rgba(23,63,58,0.06)] sm:p-6 md:block md:min-h-[320px] md:p-7"
                >
                  <div className="flex items-start justify-center pt-0.5 md:justify-end md:pt-0">
                    <Icon
                      className="size-9 text-[#173F3A] md:size-[3.25rem]"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[1.375rem] font-black leading-tight text-[#17212B] [text-wrap:balance] md:mt-8 md:text-[1.75rem]">
                      {title}
                    </h3>
                    <p className="mt-2 text-[1rem] font-semibold leading-[1.65] text-[#2C3E3A] [text-wrap:pretty] md:mt-4 md:text-[1.0625rem] md:leading-[1.75]">
                      {description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#FBE3DC] bg-[#FFF5F2] py-11">
          <div className="site-rail flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl gap-3 sm:gap-4">
              <span className="grid size-11 shrink-0 place-items-center text-[#F06B4F] sm:size-12">
                <Landmark aria-hidden="true" className="size-9 sm:size-10" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-[0.875rem] font-bold text-[#F06B4F] sm:text-[1rem]">
                  고용노동부 연계 혜택
                </p>
                <h2 className="mt-2 text-[1.375rem] font-black leading-snug text-[#17212B] sm:text-[1.875rem]">
                  검증된 시니어 인재와 함께하고, 인건비 부담도 낮추세요
                </h2>
                <p className="mt-3 text-[1rem] font-medium leading-[1.7] text-[#53606E] sm:text-[1.0625rem]">
                  국민취업지원제도 요건을 충족한 인재를 채용하면 고용촉진장려금 지원 대상이 될 수
                  있습니다.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  trackSubsidyModalOpen('landing_banner');
                  setShowSubsidyModal(true);
                }}
                className="inline-flex h-12 min-h-12 w-full sm:w-auto min-w-[190px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#E0D9C8] bg-white px-6 text-[15px] sm:text-[16px] font-extrabold text-[#17212B] shadow-xs transition hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
              >
                <Info className="size-4.5 shrink-0 text-[#173F3A]" />
                <span>혜택 세부내용 확인</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  trackButtonClick('subsidy_talent_cta');
                  void navigate('/login?role=company');
                }}
                className="inline-flex h-12 min-h-12 w-full sm:w-auto min-w-[190px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#F06B4F] px-6 text-[15px] sm:text-[16px] font-extrabold text-white shadow-xs transition hover:bg-[#E05A3E] active:scale-[0.98] cursor-pointer"
              >
                <span>혜택 대상 인재 보기</span>
                <ArrowRight className="size-4.5 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-18">
          <div className="site-rail py-9 text-center sm:py-12">
            <h2 className="text-[1.375rem] font-black leading-[1.35] text-[#17212B] sm:text-[1.875rem]">
              지금 바로 이어잡의 검증된 프로젝트를 확인해 보세요
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[1rem] font-medium leading-[1.7] text-[#53606E] sm:text-[1.125rem]">
              로그인 없이도 전체 실시간 프로젝트 데이터베이스를 자유롭게 둘러보실 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                trackButtonClick('bottom_cta_view_projects');
                void navigate('/senior/project-database');
              }}
              className="mx-auto mt-7 inline-flex h-14 min-h-14 items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-[#173F3A] px-7 text-[16px] sm:text-[17px] font-extrabold text-white shadow-[0_8px_20px_rgba(23,63,58,0.22)] transition hover:bg-[#21544E] active:scale-[0.98] cursor-pointer"
            >
              <BriefcaseBusiness className="size-5 shrink-0" aria-hidden="true" />
              <span>전체 프로젝트 보러가기</span>
              <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      {/* Subsidy Detail Modal */}
      {showSubsidyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-[#E0D9C8] bg-white p-6 sm:p-8 shadow-2xl overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DDEBE7] text-[#173F3A] w-fit">
                  <Landmark className="size-3.5" />
                  고용노동부 주관
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#17212B] tracking-tight">
                  고용촉진장려금 지원 제도 세부 안내
                </h2>
                <p className="text-xs sm:text-sm font-normal text-slate-500">
                  취업지원프로그램을 이수한 시니어를 채용한 중소·중견기업 인건비 지원 제도
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubsidyModal(false)}
                className="inline-flex size-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                aria-label="고용촉진장려금 안내 닫기"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="mt-5 flex flex-col gap-4 text-sm text-[#17212B]">
              {/* Box 1: 지원 금액 */}
              <div className="rounded-2xl bg-[#DDEBE7]/60 p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-[#173F3A] text-sm sm:text-base">
                  <CheckCircle2 className="size-4.5 text-[#173F3A] shrink-0" />
                  <span>실제 기업 지원 혜택 금액</span>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-[#173F3A]">
                      우선지원대상기업 (중소·중견)
                    </span>
                    <p className="mt-1 text-lg font-extrabold text-[#173F3A]">
                      월 60만원{' '}
                      <span className="text-xs font-semibold text-[#173F3A]/80">(연 720만원)</span>
                    </p>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      3개월 단위 180만원씩 분기별 지급
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#173F3A]">
                      특수 대상 (중증장애인·여성가장)
                    </span>
                    <p className="mt-1 text-lg font-extrabold text-[#173F3A]">
                      월 80만원{' '}
                      <span className="text-xs font-semibold text-[#173F3A]/80">(연 960만원)</span>
                    </p>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      최대 2년까지 지속 지원 가능
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 2: 기업 자격 & 근로 조건 (Clean Key-Value Text List) */}
              <div className="rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2]/70 p-4 sm:p-5">
                <div className="font-bold text-[#173F3A] flex items-center gap-1.5 text-sm sm:text-base">
                  <FileText className="size-4.5 text-[#173F3A] shrink-0" />
                  <span>기업의 필수 수급 요건</span>
                </div>
                <dl className="mt-3 flex flex-col gap-2.5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 border-b border-[#E0D9C8]/50 pb-2.5">
                    <dt className="font-bold text-[#17212B] w-28 sm:w-32 shrink-0 whitespace-nowrap">
                      • 대상 기업
                    </dt>
                    <dd className="font-normal text-slate-600 leading-relaxed">
                      우선지원대상기업 (제조업 500인 이하, 건설·운수 300인 이하, 도소매 200인 이하,
                      기타 100인 이하)
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 border-b border-[#E0D9C8]/50 pb-2.5">
                    <dt className="font-bold text-[#17212B] w-28 sm:w-32 shrink-0 whitespace-nowrap">
                      • 근로계약 기간
                    </dt>
                    <dd className="font-normal text-slate-600 leading-relaxed">
                      정규직 또는 최소 1년 이상의 기간제 근로계약 체결 (1년 미만 단기 계약 제외)
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <dt className="font-bold text-[#17212B] w-28 sm:w-32 shrink-0 whitespace-nowrap">
                      • 근무 조건
                    </dt>
                    <dd className="font-normal text-slate-600 leading-relaxed">
                      주 15시간(월 60시간) 이상 근무, 최저임금 이상 지급, 4대 사회보험 가입 필수
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Box 3: 구직자 수료 요건 (Clean Key-Value Text List) */}
              <div className="rounded-2xl border border-[#E0D9C8] bg-white p-4 sm:p-5 shadow-2xs">
                <div className="font-bold text-[#173F3A] flex items-center gap-1.5 text-sm sm:text-base">
                  <CheckCircle2 className="size-4.5 text-[#173F3A] shrink-0" />
                  <span>구직자(시니어) 필수 이수 요건</span>
                </div>
                <dl className="mt-3 flex flex-col gap-2.5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 border-b border-[#E0D9C8]/50 pb-2.5">
                    <dt className="font-bold text-[#17212B] w-28 sm:w-32 shrink-0 whitespace-nowrap">
                      • 이수 프로그램
                    </dt>
                    <dd className="font-normal text-slate-600 leading-relaxed">
                      국민취업지원제도 1단계(취업활동계획 IAP) 수료 (1년 이내) 또는 3개월 이상
                      내일배움카드 직업훈련 이수
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <dt className="font-bold text-[#17212B] w-28 sm:w-32 shrink-0 whitespace-nowrap">
                      • 구직 등록
                    </dt>
                    <dd className="font-normal text-slate-600 leading-relaxed">
                      고용24(워크넷)에 구직신청이 유효하게 등록된 상태에서 채용 연계 진행
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Box 4: 핵심 주의사항 (인위적 감원 금지) */}
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5">
                <ShieldAlert className="size-4.5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex flex-col gap-1 text-xs text-rose-950">
                  <span className="font-bold text-rose-900">
                    기업 필수 유의: 인위적 감원(권고사직) 금지 의무
                  </span>
                  <p className="font-normal leading-relaxed text-rose-900/90">
                    채용 전 3개월부터 채용 후 1년까지(총 15개월 동안) 사업주 권고사직 등 인위적
                    감원이 발생하지 않아야 합니다. (근로자의 자발적 퇴사는 제외)
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 border-t border-[#E0D9C8] pt-4">
              <button
                type="button"
                onClick={() => setShowSubsidyModal(false)}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border border-[#E0D9C8] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  trackButtonClick('subsidy_modal_company_login_cta');
                  setShowSubsidyModal(false);
                  void navigate('/login?role=company');
                }}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173F3A] px-6 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1E4E47] active:scale-[0.98] sm:w-auto"
              >
                <span>혜택 대상 인재 보러가기 (기업 로그인)</span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#e7dfcb] bg-white py-7">
        <div className="site-rail flex items-center justify-between gap-4 text-[0.875rem] font-semibold text-[#667085]">
          <a className="hover:text-[#173F3A]" href="mailto:ieojab2026@gmail.com">
            고객 문의 ieojab2026@gmail.com
          </a>
          <p>© 2026 이어잡 IEO Job. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

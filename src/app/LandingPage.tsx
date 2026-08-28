import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  GraduationCap,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router';

import { useAuth } from '@/lib/authContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-[#FAF7F2] text-[#17212B] font-sans antialiased selection:bg-[#DDEBE7] selection:text-[#173F3A]">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#E0D9C8] bg-white/95 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => void navigate('/')}>
            <img src="/logo_text.png" alt="이어잡" className="h-6 w-auto object-contain hidden sm:block" />
            <img src="/logo_icon.png" alt="이어잡" className="h-7 w-auto object-contain sm:hidden" />
            <span className="rounded-full bg-[#DDEBE7] px-2.5 py-0.5 text-[11px] font-extrabold text-[#173F3A] border border-[#BBD5CE]">
              MVP PROTOTYPE
            </span>
          </div>

          {/* Quick Navigation CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-3.5 text-[13px] font-extrabold text-[#173F3A] transition hover:bg-[#DDEBE7] hover:border-[#BBD5CE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
            >
              <Briefcase className="size-4 text-[#173F3A]" />
              <span>프로젝트 전체보기</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => void navigate('/senior')}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#173F3A] px-4 text-[13px] font-extrabold text-white shadow-xs transition hover:bg-[#12332F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
              >
                <span>내 대시보드</span>
                <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void navigate('/login')}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#F06B4F] px-4 text-[13px] font-extrabold text-white shadow-xs transition hover:bg-[#d95a3f] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F06B4F]"
              >
                <LogIn className="size-4" />
                <span>로그인 / 회원가입</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="relative overflow-hidden border-b border-[#E0D9C8] bg-gradient-to-b from-white via-[#FAF7F2] to-[#F4EFF6]/30 py-12 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Copy & Main Action */}
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#173F3A] shadow-2xs">
                <Sparkles className="size-4 text-[#F06B4F]" />
                <span>AI 기반 시니어 실무 경험 & 기업 프로젝트 매칭</span>
              </div>

              <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#17212B] sm:text-4xl lg:text-5xl leading-[1.25] text-balance">
                10년~30년 베테랑 시니어의 <br className="hidden sm:inline" />
                <span className="text-[#173F3A] underline decoration-[#F06B4F] decoration-4 underline-offset-8">
                  오랜 실무 노하우
                </span>
                를 기업 프로젝트와 잇다
              </h1>

              <p className="mt-5 text-base sm:text-lg font-medium leading-relaxed text-slate-600 max-w-2xl text-pretty">
                이어잡은 풀타임 채용의 부담 없이, 시니어 전문가의 깊은 문제 해결 능력과 기업의 핵심 프로젝트를 AI로 정밀 매칭합니다. 로그인 없이도 실시간 프로젝트 DB를 자유롭게 둘러보실 수 있습니다.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => void navigate('/senior/project-database')}
                  className="flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] px-7 text-base font-extrabold text-white border border-[#173F3A] shadow-[0_4px_16px_rgba(23,63,58,0.3)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(23,63,58,0.4)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Briefcase className="size-5" />
                  <span>🚀 전체 프로젝트 보러가기</span>
                </button>

                <button
                  type="button"
                  onClick={() => void navigate('/signup')}
                  className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-[#E0D9C8] bg-white px-6 text-base font-extrabold text-[#17212B] shadow-xs hover:bg-[#FAF7F2] hover:border-[#173F3A] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <UserCheck className="size-5 text-[#173F3A]" />
                  <span>시니어 무료 회원가입</span>
                </button>
              </div>

              {/* Value Highlights */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-[#E0D9C8]/80 pt-6">
                <div>
                  <dt className="text-[12px] font-bold text-slate-500">실시간 연동 공고</dt>
                  <dd className="mt-1 text-xl sm:text-2xl font-black text-[#173F3A]">1,000+ 건</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-bold text-slate-500">핵심 대상 직종</dt>
                  <dd className="mt-1 text-xl sm:text-2xl font-black text-[#173F3A]">21개 영역</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-bold text-slate-500">근무 형태</dt>
                  <dd className="mt-1 text-xl sm:text-2xl font-black text-[#F06B4F]">주 1~3회/원격</dd>
                </div>
              </div>
            </div>

            {/* Right Interactive Preview Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl border border-[#E0D9C8] bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#E0D9C8] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#F06B4F]" />
                    <span className="text-[13px] font-extrabold text-[#17212B]">실시간 시니어 맞춤 프로젝트</span>
                  </div>
                  <span className="rounded-md bg-[#DDEBE7] px-2 py-0.5 text-[11px] font-extrabold text-[#173F3A]">
                    LIVE FEED
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2] p-4 text-left transition hover:border-[#BBD5CE]">
                    <div className="flex items-center justify-between text-[11.5px] font-bold text-slate-500">
                      <span>IT·소프트웨어 · 원격</span>
                      <span className="font-extrabold text-[#173F3A]">적합도 96점</span>
                    </div>
                    <h4 className="mt-1.5 text-[15px] font-extrabold text-[#17212B]">
                      B2B SaaS 마케팅 시스템 리디자인 및 서비스 설계
                    </h4>
                    <p className="mt-1 text-[12.5px] font-medium text-slate-600 line-clamp-1">
                      해결과제: 레거시 결제 파이프라인 개편 및 사용자 전환율 개선
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E0D9C8] bg-white p-4 text-left transition hover:border-[#BBD5CE]">
                    <div className="flex items-center justify-between text-[11.5px] font-bold text-slate-500">
                      <span>경영·기획 · 주 2회</span>
                      <span className="font-extrabold text-[#173F3A]">적합도 94점</span>
                    </div>
                    <h4 className="mt-1.5 text-[15px] font-extrabold text-[#17212B]">
                      중소기업 해외 판로 개척 및 영업 프로세스 체계화
                    </h4>
                    <p className="mt-1 text-[12.5px] font-medium text-slate-600 line-clamp-1">
                      해결과제: 글로벌 수출 바우처 승인 및 현지 파트너 발굴
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#E0D9C8] pt-4">
                  <button
                    type="button"
                    onClick={() => void navigate('/senior/project-database')}
                    className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8] text-[13.5px] font-extrabold text-[#173F3A] hover:bg-[#DDEBE7] transition"
                  >
                    <span>전체 프로젝트 실시간 둘러보기</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience Section (누구를 위한 서비스인가?) */}
      <section className="py-16 sm:py-20 border-b border-[#E0D9C8] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-[13px] font-extrabold uppercase tracking-wider text-[#F06B4F]">
              TARGET AUDIENCE
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#17212B]">
              이어잡은 누구를 위한 서비스인가요?
            </h2>
            <p className="mt-3 text-base font-medium text-slate-600 max-w-2xl mx-auto">
              경험 풍부한 시니어 실무자와 검증된 전문가가 필요한 기업 모두에게 최적의 파트너십을 제공합니다.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {/* Target 1: Senior Experts */}
            <div className="rounded-3xl border border-[#E0D9C8] bg-[#FAF7F2] p-7 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#173F3A] text-white">
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <span className="text-[12px] font-extrabold text-[#F06B4F]">4060 실무 베테랑</span>
                    <h3 className="text-xl font-extrabold text-[#17212B]">시니어 전문가 (Senior Experts)</h3>
                  </div>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm font-medium text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-5 shrink-0 text-[#173F3A] mt-0.5" />
                    <span>은퇴 후에도 10~30년 경력과 노하우를 살려 지속적으로 활동하고 싶은 분</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-5 shrink-0 text-[#173F3A] mt-0.5" />
                    <span>풀타임 직장 대신 주 1~3회, 원격/하이브리드로 자유롭게 일하고 싶은 분</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-5 shrink-0 text-[#173F3A] mt-0.5" />
                    <span>내 경험을 AI 인터뷰로 간편하게 과제화하여 적합한 프로젝트를 추천받고 싶은 분</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E0D9C8]">
                <button
                  type="button"
                  onClick={() => void navigate('/senior/project-database')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173F3A] text-sm font-extrabold text-white hover:bg-[#12332F] transition"
                >
                  <span>시니어 프로젝트 찾기</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Target 2: Companies & Startups */}
            <div className="rounded-3xl border border-[#E0D9C8] bg-white p-7 sm:p-8 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F06B4F] text-white">
                    <Building2 className="size-6" />
                  </div>
                  <div>
                    <span className="text-[12px] font-extrabold text-[#173F3A]">기업 / 스타트업 / 중소기업</span>
                    <h3 className="text-xl font-extrabold text-[#17212B]">채용 기업 (Hiring Companies)</h3>
                  </div>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm font-medium text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-5 shrink-0 text-[#F06B4F] mt-0.5" />
                    <span>과중한 정규직 채용 부담 없이 당장 급한 핵심 과제를 단기에 해결할 베테랑이 필요한 기업</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-5 shrink-0 text-[#F06B4F] mt-0.5" />
                    <span>경영, 마케팅, IT, 영업, 자문 등 검증된 시니어의 즉각적인 문제 해결 노하우가 필요한 곳</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-5 shrink-0 text-[#F06B4F] mt-0.5" />
                    <span>AI 기반 과제 분석으로 프로젝트에 가장 적합한 시니어 인재를 추천받고 싶은 기업</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E0D9C8]">
                <button
                  type="button"
                  onClick={() => void navigate('/company/projects/new')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-extrabold text-white hover:bg-black transition"
                >
                  <span>기업 프로젝트 등록하기</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section (이어잡의 핵심 특징) */}
      <section className="py-16 sm:py-20 border-b border-[#E0D9C8] bg-[#FAF7F2]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-[13px] font-extrabold uppercase tracking-wider text-[#173F3A]">
              PLATFORM FEATURES
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#17212B]">
              왜 이어잡인가요? 차별화된 3가지 핵심 장점
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E0D9C8] bg-white p-6 text-left shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#DDEBE7] text-[#173F3A]">
                <Sparkles className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-[#17212B]">AI 경험 과제화 인터뷰</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                수십 년의 복잡한 경력을 AI 대화로 간편하게 과제 카드화하여, 내가 가장 잘하는 핵심 문제 해결 역량을 자동으로 도출합니다.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E0D9C8] bg-white p-6 text-left shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#FDF0ED] text-[#F06B4F]">
                <Compass className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-[#17212B]">정밀 적합도 (Fit Score) 매칭</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                1순위~3순위 희망 직종, 주 며칠 근무, 지역 및 보유 스킬을 다각도로 분석해 100점 만점의 매칭 점수와 근거를 제공합니다.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E0D9C8] bg-white p-6 text-left shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#DDEBE7] text-[#173F3A]">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-[#17212B]">OpenAPI 공공 DB 통합연동</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                고용24(워크넷) 및 서울시/공공 실무 채용 API와 실시간 연동되어 신뢰성 높은 최신 프로젝트 데이터베이스를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-[#E0D9C8] text-center text-xs font-semibold text-slate-500">
        <div className="mx-auto max-w-7xl px-4">
          <p>© 2026 이어잡 (Eojob). All rights reserved. | 시니어 실무 경험 & 기업 프로젝트 연결 플랫폼</p>
        </div>
      </footer>
    </div>
  );
}

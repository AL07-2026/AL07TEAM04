import { ArrowRight, Briefcase, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[#FAF7F2] text-[#17212B] font-sans antialiased selection:bg-[#DDEBE7] selection:text-[#173F3A]">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 border-b border-[#E0D9C8] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => void navigate('/')}>
            <img src="/logo_text.png" alt="이어잡" className="h-6 w-auto object-contain hidden sm:block" />
            <img src="/logo_icon.png" alt="이어잡" className="h-7 w-auto object-contain sm:hidden" />
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-4 py-1.5 text-[13px] font-extrabold text-[#173F3A]">
            <Sparkles className="size-4 text-[#F06B4F]" />
            <span>시니어 실무 경험 & 기업 프로젝트 맞춤 연결</span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#17212B] sm:text-5xl lg:text-6xl leading-[1.2] text-balance">
            10년~30년 시니어의 실무 노하우를 <br className="hidden sm:inline" />
            <span className="text-[#173F3A] underline decoration-[#F06B4F] decoration-4 underline-offset-8">
              기업의 핵심 프로젝트
            </span>
            와 잇다
          </h1>

          <p className="mt-6 text-base sm:text-xl font-medium leading-relaxed text-slate-600 max-w-2xl mx-auto text-pretty">
            풀타임 채용의 부담 없이, 시니어 전문가의 깊은 실무 노하우와 기업의 당면 과제를 AI로 정밀 매칭하는 플랫폼 <strong className="text-[#173F3A] font-extrabold">이어잡</strong>입니다.
          </p>

          {/* SINGLE MAIN CTA BUTTON */}
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] px-8 text-lg font-extrabold text-white border border-[#173F3A] shadow-[0_6px_20px_rgba(23,63,58,0.35)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(23,63,58,0.45)] active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Briefcase className="size-5" />
              <span>🚀 전체 프로젝트 보러가기</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>

        {/* Hero Visual Image */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-[#E0D9C8] bg-white p-3 shadow-2xl">
          <img
            src="/eojob_hero_illustration.jpg"
            alt="이어잡 시니어 전문가와 기업 협업 시스템"
            className="w-full h-auto max-h-[520px] object-cover rounded-2xl"
          />
        </div>

        {/* 3 Simple Feature Cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E0D9C8] bg-white p-6 text-left shadow-xs transition hover:border-[#BBD5CE]">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#DDEBE7] text-[#173F3A] text-xl font-black">
              01
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-[#17212B]">AI 경험 과제화</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
              수십 년 경력을 AI 대화 인터뷰로 과제화하여 내가 잘하는 문제 해결 역량을 명확하게 추출합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E0D9C8] bg-white p-6 text-left shadow-xs transition hover:border-[#BBD5CE]">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#FDF0ED] text-[#F06B4F] text-xl font-black">
              02
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-[#17212B]">1순위 정밀 매칭</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
              1순위 희망 직종, 지역, 경력을 다각도로 분석하여 100점 만점의 정확한 적합도 점수를 제공합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E0D9C8] bg-white p-6 text-left shadow-xs transition hover:border-[#BBD5CE]">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#DDEBE7] text-[#173F3A] text-xl font-black">
              03
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-[#17212B]">주 1~3회 유연 근무</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
              풀타임 직장 대신 주 1~3회, 원격/하이브리드 근무로 자유롭게 프로젝트를 수행할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Employment Promotion Subsidy Highlight Card for Companies */}
        <div className="mt-12 rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-900 via-[#173F3A] to-emerald-950 p-6 sm:p-8 text-left text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-extrabold text-emerald-300 border border-emerald-400/30">
              💰 고용노동부 연계 혜택
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              이어잡에서 검증된 시니어 채용하고, 인건비 연 720만원 절감하세요!
            </h3>
            <p className="text-sm font-medium text-emerald-100/90 leading-relaxed">
              국민취업지원제도 1단계를 완료한 시니어 인재 채용 시, 국가로부터 분기별 180만원(월 60만원 x 12개월)의 고용촉진장려금을 지급받을 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void navigate('/senior/project-database')}
            className="shrink-0 flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-extrabold text-slate-950 hover:bg-emerald-300 active:scale-[0.98] transition cursor-pointer"
          >
            <span>혜택 대상 인재 보기 ➔</span>
          </button>
        </div>

        {/* Bottom CTA Card */}
        <div className="mt-12 rounded-3xl border border-[#E0D9C8] bg-white p-8 text-center shadow-md">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#17212B]">
            지금 바로 이어잡의 검증된 프로젝트를 확인해 보세요
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-600">
            로그인 없이도 전체 실시간 프로젝트 데이터베이스를 자유롭게 둘러보실 수 있습니다.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-[#173F3A] px-7 text-base font-extrabold text-white hover:bg-[#12332F] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Briefcase className="size-5" />
              <span>🚀 전체 프로젝트 보러가기</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E0D9C8] bg-white py-6 text-center text-xs font-semibold text-slate-500">
        <p>© 2026 이어잡 (Eojob). All rights reserved.</p>
      </footer>
    </div>
  );
}

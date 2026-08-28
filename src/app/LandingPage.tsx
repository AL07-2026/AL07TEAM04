import { ArrowRight, Briefcase, CheckCircle2, Coins, FileText, Info, Landmark, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export function LandingPage() {
  const navigate = useNavigate();
  const [showSubsidyModal, setShowSubsidyModal] = useState(false);

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
          <div className="inline-flex items-center gap-2 rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-4 py-1.5 text-[13px] font-semibold text-[#173F3A]">
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

          <p className="mt-6 text-base sm:text-xl font-normal leading-relaxed text-slate-600 max-w-2xl mx-auto text-pretty">
            풀타임 채용의 부담 없이, 시니어 전문가의 깊은 실무 노하우와 기업의 당면 과제를 AI로 정밀 매칭하는 플랫폼 <strong className="text-[#173F3A] font-semibold">이어잡</strong>입니다.
          </p>

          {/* SINGLE MAIN CTA BUTTON */}
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] px-8 text-lg font-bold text-white border border-[#173F3A] shadow-[0_6px_20px_rgba(23,63,58,0.35)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(23,63,58,0.45)] active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Briefcase className="size-5" />
              <span>전체 프로젝트 보러가기</span>
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
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#DDEBE7] text-[#173F3A] text-xl font-bold">
              01
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#17212B]">AI 경험 과제화</h3>
            <p className="mt-2 text-sm font-normal leading-relaxed text-slate-600">
              수십 년 경력을 AI 대화 인터뷰로 과제화하여 내가 잘하는 문제 해결 역량을 명확하게 추출합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E0D9C8] bg-white p-6 text-left shadow-xs transition hover:border-[#BBD5CE]">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#FDF0ED] text-[#F06B4F] text-xl font-bold">
              02
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#17212B]">1순위 정밀 매칭</h3>
            <p className="mt-2 text-sm font-normal leading-relaxed text-slate-600">
              1순위 희망 직종, 지역, 경력을 다각도로 분석하여 100점 만점의 정확한 적합도 점수를 제공합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E0D9C8] bg-white p-6 text-left shadow-xs transition hover:border-[#BBD5CE]">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#DDEBE7] text-[#173F3A] text-xl font-bold">
              03
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#17212B]">주 1~3회 유연 근무</h3>
            <p className="mt-2 text-sm font-normal leading-relaxed text-slate-600">
              풀타임 직장 대신 주 1~3회, 원격/하이브리드 근무로 자유롭게 프로젝트를 수행할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Employment Promotion Subsidy Highlight Card for Companies */}
        <div className="mt-12 rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-900 via-[#173F3A] to-emerald-950 p-6 sm:p-8 text-left text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col items-start gap-2.5 max-w-2xl">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
              <Coins className="size-3.5 text-emerald-300" />
              <span>고용노동부 연계 혜택</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              이어잡에서 검증된 시니어 채용하고, 인건비 연 720만원 절감하세요!
            </h3>
            <p className="text-sm font-normal text-emerald-100/90 leading-relaxed">
              국민취업지원제도 1단계를 완료한 시니어 인재 채용 시, 국가로부터 분기별 180만원(월 60만원 x 12개월)의 고용촉진장려금을 지급받을 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowSubsidyModal(true)}
              className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/60 bg-emerald-950/60 px-5 text-sm font-semibold text-emerald-100 hover:bg-emerald-800/80 hover:text-white active:scale-[0.98] transition cursor-pointer"
            >
              <Info className="size-4" />
              <span>혜택 세부내용 확인</span>
            </button>
            <button
              type="button"
              onClick={() => void navigate('/login?role=company')}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-bold text-slate-950 hover:bg-emerald-300 active:scale-[0.98] transition cursor-pointer"
            >
              <span>혜택 대상 인재 보기 ➔</span>
            </button>
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="mt-12 rounded-3xl border border-[#E0D9C8] bg-white p-8 text-center shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold text-[#17212B]">
            지금 바로 이어잡의 검증된 프로젝트를 확인해 보세요
          </h2>
          <p className="mt-2 text-sm font-normal text-slate-600">
            로그인 없이도 전체 실시간 프로젝트 데이터베이스를 자유롭게 둘러보실 수 있습니다.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-[#173F3A] px-7 text-base font-bold text-white hover:bg-[#12332F] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Briefcase className="size-5" />
              <span>전체 프로젝트 보러가기</span>
            </button>
          </div>
        </div>
      </main>

      {/* Subsidy Detail Modal */}
      {showSubsidyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subsidy-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6"
          onClick={() => setShowSubsidyModal(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#E0D9C8] bg-white p-6 sm:p-8 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#E0D9C8]/60 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <Landmark className="size-3.5 text-emerald-700" />
                  <span>고용노동부 주관</span>
                </span>
                <h2
                  id="subsidy-modal-title"
                  className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[#17212B]"
                >
                  고용촉진장려금 지원 제도 세부 안내
                </h2>
                <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
                  취업지원프로그램을 이수한 시니어를 채용한 중소·중견기업 인건비 지원 제도
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubsidyModal(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="닫기"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="mt-5 flex flex-col gap-4 text-sm text-[#17212B]">
              {/* Box 1: 지원 금액 */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-950 text-sm sm:text-base">
                  <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
                  <span>실제 기업 지원 혜택 금액</span>
                </div>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white p-3.5 border border-emerald-100 shadow-2xs">
                    <span className="font-medium text-slate-500">우선지원대상기업 (중소·중견)</span>
                    <p className="mt-1 text-lg font-bold text-emerald-700">
                      월 60만원 <span className="text-xs font-medium text-slate-600">(연 720만원)</span>
                    </p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">3개월 단위 180만원씩 분기별 지급</p>
                  </div>
                  <div className="rounded-xl bg-white p-3.5 border border-emerald-100 shadow-2xs">
                    <span className="font-medium text-slate-500">특수 대상 (중증장애인·여성가장)</span>
                    <p className="mt-1 text-lg font-bold text-emerald-700">
                      월 80만원 <span className="text-xs font-medium text-slate-600">(연 960만원)</span>
                    </p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">최대 2년까지 지속 지원 가능</p>
                  </div>
                </div>
              </div>

              {/* Box 2: 기업 자격 & 근로 조건 (Clean Key-Value Table/Rows) */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2]/70 p-4">
                <div className="font-semibold text-[#173F3A] flex items-center gap-1.5 text-sm">
                  <FileText className="size-4 text-[#173F3A] shrink-0" />
                  <span>기업의 필수 수급 요건</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 rounded-lg bg-white px-3 py-2 border border-[#E0D9C8]/60">
                    <span className="font-semibold text-slate-700 w-24 shrink-0">대상 기업</span>
                    <span className="font-normal text-slate-600 leading-relaxed">
                      우선지원대상기업 (제조업 500인 이하, 건설·운수 300인 이하, 도소매 200인 이하, 기타 100인 이하)
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 rounded-lg bg-white px-3 py-2 border border-[#E0D9C8]/60">
                    <span className="font-semibold text-slate-700 w-24 shrink-0">근로계약 기간</span>
                    <span className="font-normal text-slate-600 leading-relaxed">
                      정규직 또는 최소 1년 이상의 기간제 근로계약 체결 (1년 미만 단기 계약 제외)
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 rounded-lg bg-white px-3 py-2 border border-[#E0D9C8]/60">
                    <span className="font-semibold text-slate-700 w-24 shrink-0">근무 조건</span>
                    <span className="font-normal text-slate-600 leading-relaxed">
                      주 15시간(월 60시간) 이상 근무, 최저임금 이상 지급, 4대 사회보험 가입 필수
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 3: 구직자 수료 요건 (Clean Key-Value Table/Rows) */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-2xs">
                <div className="font-semibold text-[#173F3A] flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="size-4 text-[#173F3A] shrink-0" />
                  <span>구직자(시니어) 필수 이수 요건</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 rounded-lg bg-[#FAF7F2]/50 px-3 py-2 border border-[#E0D9C8]/60">
                    <span className="font-semibold text-slate-700 w-24 shrink-0">이수 프로그램</span>
                    <span className="font-normal text-slate-600 leading-relaxed">
                      국민취업지원제도 1단계(취업활동계획 IAP) 수료 (1년 이내) 또는 3개월 이상 내일배움카드 직업훈련 이수
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 rounded-lg bg-[#FAF7F2]/50 px-3 py-2 border border-[#E0D9C8]/60">
                    <span className="font-semibold text-slate-700 w-24 shrink-0">구직 등록</span>
                    <span className="font-normal text-slate-600 leading-relaxed">
                      고용24(워크넷)에 구직신청이 유효하게 등록된 상태에서 채용 연계 진행
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 4: 핵심 주의사항 (인위적 감원 금지) */}
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <ShieldAlert className="size-4.5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex flex-col gap-0.5 text-xs text-rose-950">
                  <span className="font-semibold text-rose-900">기업 필수 유의: 인위적 감원(권고사직) 금지 의무</span>
                  <p className="font-normal leading-relaxed text-rose-900/90">
                    채용 전 3개월부터 채용 후 1년까지(총 15개월 동안) 사업주 권고사직 등 인위적 감원이 발생하지 않아야 합니다. (근로자의 자발적 퇴사는 제외)
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-[#E0D9C8]/60 pt-4">
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
                  setShowSubsidyModal(false);
                  void navigate('/login?role=company');
                }}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-[0.98] transition shadow-xs cursor-pointer"
              >
                혜택 대상 인재 보러가기 (기업 로그인) ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E0D9C8] bg-white py-6 text-center text-xs font-semibold text-slate-500">
        <p>© 2026 이어잡 (Eojob). All rights reserved.</p>
      </footer>
    </div>
  );
}

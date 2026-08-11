import {
  AlertTriangle,
  AudioLines,
  Award,
  BarChart2,
  Info,
  Mic,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  Zap,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { RollingBanner } from '@/app/LoginPage';
import { cn } from '@/lib/utils';

import {
  ActionButton,
  Chip,
  Field,
  InfoPanel,
  MobilePage,
  type Project,
  ProjectCard,
  StatusBadge,
  StepProgressBar,
  SummaryCard,
  TextAreaField,
  useViewportMode,
} from '@/app/wireframe/Ui';

const projects: Project[] = [
  { company: '그로우랩', title: '신규 서비스 운영 체계 만들기', meta: '주 2회 · 원격 · 3개월' },
  { company: '마켓온', title: 'B2B 영업 전략 점검', meta: '주 1회 · 서울 · 2개월' },
  { company: '에듀브릿지', title: '파트너 운영 프로세스 개선', meta: '주 2회 · 혼합 · 3개월' },
];

const featuredProject = projects[0]!;

const seniorProposals: Project[] = [
  {
    company: '그로우랩',
    title: '신규 서비스 운영 체계 만들기',
    meta: '검토 중 · 8월 4일',
    action: '제안 확인 →',
  },
  {
    company: '마켓온',
    title: 'B2B 영업 전략 점검',
    meta: '연락 받음 · 8월 1일',
    action: '제안 확인 →',
  },
  {
    company: '에듀브릿지',
    title: '파트너 운영 프로세스 개선',
    meta: '검토 전 · 7월 29일',
    action: '제안 확인 →',
  },
];

const receivedProposals: Project[] = [
  { company: '김인재', title: '서비스 운영 15년', meta: '검토 전 · 오늘', action: '제안 확인 →' },
  {
    company: '박경험',
    title: 'B2B 운영과 영업 12년',
    meta: '검토 중 · 어제',
    action: '제안 확인 →',
  },
  {
    company: '이전문',
    title: '프로세스 설계 18년',
    meta: '연락함 · 8월 1일',
    action: '제안 확인 →',
  },
];

export function ProcessOverviewGraphicCard() {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4 md:p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className={cn('font-extrabold tracking-wide text-[#173F3A]', isMobile ? 'text-[13px]' : 'text-[17px]')}>
          ✨ 경험매칭 3단계 프로세스
        </span>
        <span className={cn('font-bold text-slate-400', isMobile ? 'text-[11px]' : 'text-[14px]')}>쉽고 빠른 AI 인터뷰</span>
      </div>
      <div className={cn('gap-2.5 pt-0.5', isMobile ? 'flex flex-col' : 'grid grid-cols-3 gap-3.5')}>
        {/* Step 1 */}
        <div className={cn('flex items-center gap-3 rounded-xl bg-[#DDEBE7] p-3 md:py-3.5 md:px-4 border border-[#BBD5CE] transition hover:bg-[#d2e5e0]', isMobile ? 'justify-start' : 'justify-center')}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#173F3A] text-white shadow-xs">
            <Mic className="size-4.5" />
          </div>
          <div className={cn('flex text-left min-w-0', isMobile ? 'flex-col gap-0.5' : 'flex-row items-center gap-1.5')}>
            <span className="text-sm md:text-[15px] font-extrabold text-[#173F3A] leading-tight whitespace-nowrap">
              1. 경험을 말해요
            </span>
            {!isMobile && <span className="text-slate-300 font-light text-xs select-none">|</span>}
            <span className="text-xs md:text-[13px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
              AI 음성 대화
            </span>
          </div>
        </div>

        {/* Step 2 */}
        <div className={cn('flex items-center gap-3 rounded-xl bg-[#FAF7F2] p-3 md:py-3.5 md:px-4 border border-[#E0D9C8] transition hover:bg-[#F3eee3]', isMobile ? 'justify-start' : 'justify-center')}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F06B4F] text-white shadow-xs">
            <Award className="size-4.5" />
          </div>
          <div className={cn('flex text-left min-w-0', isMobile ? 'flex-col gap-0.5' : 'flex-row items-center gap-1.5')}>
            <span className="text-sm md:text-[15px] font-extrabold text-[#F06B4F] leading-tight whitespace-nowrap">
              2. 카드로 확인
            </span>
            {!isMobile && <span className="text-slate-300 font-light text-xs select-none">|</span>}
            <span className="text-xs md:text-[13px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
              문제·역할·결과
            </span>
          </div>
        </div>

        {/* Step 3 */}
        <div className={cn('flex items-center gap-3 rounded-xl bg-[#DDEBE7] p-3 md:py-3.5 md:px-4 border border-[#BBD5CE] transition hover:bg-[#d2e5e0]', isMobile ? 'justify-start' : 'justify-center')}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#173F3A] text-white shadow-xs">
            <Target className="size-4.5" />
          </div>
          <div className={cn('flex text-left min-w-0', isMobile ? 'flex-col gap-0.5' : 'flex-row items-center gap-1.5')}>
            <span className="text-sm md:text-[15px] font-extrabold text-[#173F3A] leading-tight whitespace-nowrap">
              3. 기업이 판단
            </span>
            {!isMobile && <span className="text-slate-300 font-light text-xs select-none">|</span>}
            <span className="text-xs md:text-[13px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
              프로젝트 근거 매칭
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SeniorHomePage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  return (
    <MobilePage
      activeNav="home"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="senior"
      showBack={false}
      title="인재 홈"
    >
      <div className={cn('flex justify-between gap-2 border-b border-[#E0D9C8]/60 pb-3', isMobile ? 'flex-col items-start' : 'flex-row items-center')}>
        <div>
          <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl md:text-3xl lg:text-4xl')}>김인재님, 안녕하세요 👋</h2>
          <p className="text-xs md:text-lg font-medium text-slate-500 mt-1">이어잡에서 경험에 딱 맞는 프로젝트와 기업 제안을 확인하세요.</p>
        </div>
        {!isMobile && (
          <div className="flex items-center gap-2">
            <img src="/logo_text.png" alt="이어잡" className="h-8 w-auto object-contain" />
          </div>
        )}
      </div>

      {/* RESTORED INTERACTIVE ROLLING BANNER CAROUSEL FOR MOBILE & PC */}
      <RollingBanner isCompact={isMobile} />

      {/* Visual Process Overview */}
      <ProcessOverviewGraphicCard />

      {/* AI Experience Interview Banner */}
      <button
        onClick={() => void navigate('/senior/experience/interview')}
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4 md:p-6 text-left shadow-2xs transition hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs md:text-base font-extrabold text-[#F06B4F]">
            <Sparkles className="size-4 text-[#F06B4F]" /> 1/3 경험 등록 추천
          </span>
          <strong className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-base' : 'text-lg md:text-xl lg:text-2xl')}>
            AI 경험 인터뷰 시작하기
          </strong>
          <span className="text-xs md:text-base font-medium text-slate-600">
            말로 편하게 답하면 전용 경험 카드가 자동 완성됩니다.
          </span>
        </div>
        <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-[#F06B4F] text-white shadow-md shadow-[#F06B4F]/25', isMobile ? 'size-11' : 'size-14')}>
          <Mic className={isMobile ? 'size-5' : 'size-7'} />
        </div>
      </button>

      <div className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4 gap-4')}>
        <SummaryCard label="새 추천 프로젝트" role="senior" value="12개" />
        <SummaryCard label="진행 중인 제안" role="senior" value="2건" />
        {!isMobile && <SummaryCard label="경험 카드 조회수" role="senior" value="38회" />}
        {!isMobile && <SummaryCard label="매칭 성공률" role="senior" value="98%" />}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base md:text-xl lg:text-2xl font-extrabold text-[#17212B]">추천 프로젝트</h3>
        <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}>
          <ProjectCard onClick={() => void navigate('/senior/projects/1')} project={featuredProject} />
          {projects.slice(1).map((proj) => (
            <ProjectCard key={proj.title} onClick={() => void navigate('/senior/projects/1')} project={proj} />
          ))}
        </div>
      </div>

      <ActionButton onClick={() => void navigate('/senior/projects')}>
        프로젝트 전체 둘러보기 →
      </ActionButton>
    </MobilePage>
  );
}

const experienceOptions = ['기획', '운영', '영업', '마케팅', '재무', '인사', '기술', '교육'];

export function ExperienceSelectionPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(['운영', '영업']);
  function toggle(option: string) {
    setSelected((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : current.length < 3
          ? [...current, option]
          : current,
    );
  }
  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior"
      contentClassName="flex flex-col gap-[18px] px-6 pb-6 pt-7"
      role="senior"
      title="경험 선택"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-[#173F3A]">분야 선택</p>
        <button
          onClick={() => void navigate('/senior/experience/interview')}
          className="text-xs font-extrabold text-[#F06B4F] underline"
          type="button"
        >
          🎙️ AI 경험 인터뷰 시작 →
        </button>
      </div>
      <h2 className="text-2xl font-extrabold text-[#17212B]">경험 분야를 선택하세요</h2>
      <p className="text-[13px] font-medium text-slate-500">최대 3개까지 선택할 수 있어요.</p>
      <div className="flex flex-wrap gap-2.5">
        {experienceOptions.map((option) => (
          <Chip key={option} onClick={() => toggle(option)} selected={selected.includes(option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="flex h-20 flex-col rounded-xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <strong className="text-[13px] font-extrabold text-[#17212B]">선택 {selected.length}개</strong>
        <span className="text-xs font-medium text-slate-500">
          {selected.join(' · ') || '분야를 선택하세요'}
        </span>
      </div>
      <ActionButton
        onClick={() => void navigate('/senior/experience/interview')}
        className="mb-1"
      >
        AI 경험 인터뷰 진행 (추천)
      </ActionButton>
      <ActionButton
        secondary
        disabled={!selected.length}
        onClick={() => void navigate('/senior/projects')}
      >
        프로젝트 보기
      </ActionButton>
    </MobilePage>
  );
}

export function ExperienceInterviewPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: '가장 해결하기 어려웠던 업무 문제는 무엇이었나요?' },
    { id: 2, sender: 'user', text: '반복되는 납기 지연 문제를 개선했습니다.' },
    { id: 3, sender: 'ai', text: '직접 바꾼 방법과 결과를 알려주세요.' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  function handleVoiceInput() {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'user',
          text: '생산 일정과 부서 간 협업 방식을 재설계하여 납기 준수율을 향상시켰습니다.',
        },
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: '훌륭하네요! 말씀하신 내용을 바탕으로 대표 경험 카드를 생성합니다.',
        },
      ]);
    }, 1200);
  }

  function handleTextSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: inputText },
      { id: Date.now() + 1, sender: 'ai', text: '입력하신 내용으로 경험 카드가 생성되었습니다.' },
    ]);
    setInputText('');
  }

  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior/experience"
      contentClassName="flex flex-col gap-3.5 px-5 pb-6 pt-3"
      role="senior"
      title="AI 경험 인터뷰"
    >
      <StepProgressBar current={1} total={3} />

      <div className="my-0.5 flex flex-col items-center gap-1 text-center">
        <p className="text-xl font-extrabold tracking-tight text-[#17212B]">AI 경험 인터뷰</p>
        <p className="text-xs font-medium text-slate-500">편하게 말해 주세요. AI가 경험을 정리해 드립니다.</p>
      </div>

      <div className="flex min-h-[200px] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A]">
                <Sparkles className="size-3.5" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed font-medium ${
                msg.sender === 'user'
                  ? 'rounded-tr-xs bg-[#173F3A] text-white shadow-xs'
                  : 'rounded-tl-xs border border-[#BBD5CE] bg-[#DDEBE7]/70 text-[#17212B]'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center gap-2.5 pt-1">
        {/* Voice Graphic with Waveform indicator */}
        <div className="relative flex items-center justify-center">
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <AudioLines className="size-24 text-[#F06B4F] opacity-70 animate-pulse" />
            </div>
          )}
          <button
            onClick={handleVoiceInput}
            disabled={isRecording}
            type="button"
            className="group relative flex size-20 flex-col items-center justify-center gap-1 rounded-full bg-[#F06B4F] text-white shadow-xl shadow-[#F06B4F]/25 transition-all active:scale-95 hover:scale-105 hover:bg-[#E05A3E]"
          >
            <div
              className={`flex size-8 items-center justify-center rounded-full bg-white/20 ${isRecording ? 'animate-ping' : ''}`}
            >
              {isRecording ? (
                <AudioLines className="size-4 text-white" />
              ) : (
                <Mic className="size-4 text-white" />
              )}
            </div>
            <span className="text-[10px] font-extrabold tracking-tight">
              {isRecording ? '듣는 중...' : '말로 답하기'}
            </span>
          </button>
        </div>

        <form onSubmit={handleTextSubmit} className="flex w-full items-center gap-2">
          <input
            type="text"
            placeholder="✏️ 직접 입력하기"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-[#E0D9C8] bg-white px-3 text-xs text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] font-medium"
          />
          <button
            type="submit"
            className="flex h-10 items-center justify-center rounded-xl bg-[#DDEBE7] px-3 text-xs font-bold text-[#173F3A] hover:bg-[#BBD5CE]"
          >
            입력
          </button>
        </form>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#173F3A]">
          <Zap className="size-3.5 text-[#F06B4F]" />
          <span>약 5분 소요 · AI 음성 분석 중</span>
        </div>

        <ActionButton onClick={() => void navigate('/senior/experience/card')} className="mt-1">
          경험 카드로 확인해요 →
        </ActionButton>
      </div>
    </MobilePage>
  );
}

export function ExperienceCardPage() {
  const navigate = useNavigate();

  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior/experience/interview"
      contentClassName="flex flex-col gap-4 px-5 pb-6 pt-3"
      role="senior"
      title="경험 카드 확인"
    >
      <StepProgressBar current={2} total={3} />

      <div className="my-0.5 flex flex-col items-center gap-1 text-center">
        <h2 className="text-xl font-extrabold tracking-tight text-[#17212B]">
          경험 카드가 완성됐어요
        </h2>
        <p className="text-xs font-medium text-slate-500">내용을 확인하고 필요한 부분을 수정해 주세요.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-3 py-1 text-xs font-extrabold text-[#173F3A]">
            ✨ 해결 경험 파싱 완료
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#173F3A]">
            ✓ 본인 확인
          </span>
        </div>

        <h3 className="text-base font-extrabold text-[#17212B]">반복되는 납기 지연 문제 개선</h3>

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8]/60 p-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DDEBE7] text-[#173F3A]">
              <AlertTriangle className="size-4" />
            </div>
            <div className="flex flex-col text-xs">
              <strong className="font-extrabold text-[#173F3A]">문제 (Problem)</strong>
              <span className="font-medium text-[#17212B]/80">생산 일정과 부서 간 협업 불일치</span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8]/60 p-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DDEBE7] text-[#173F3A]">
              <User className="size-4" />
            </div>
            <div className="flex flex-col text-xs">
              <strong className="font-extrabold text-[#173F3A]">역할 (Role)</strong>
              <span className="font-medium text-[#17212B]/80">생산관리 책임자로 개선 주도</span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8]/60 p-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DDEBE7] text-[#173F3A]">
              <Settings className="size-4" />
            </div>
            <div className="flex flex-col text-xs">
              <strong className="font-extrabold text-[#173F3A]">행동 (Action)</strong>
              <span className="font-medium text-[#17212B]/80">공정 점검과 협업 방식을 재설계</span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8]/60 p-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DDEBE7] text-[#173F3A]">
              <BarChart2 className="size-4" />
            </div>
            <div className="flex flex-col text-xs">
              <strong className="font-extrabold text-[#173F3A]">결과 (Result)</strong>
              <span className="font-medium text-[#17212B]/80">납기 준수율 향상</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-1">
        <ActionButton secondary onClick={() => void navigate('/senior/experience/interview')}>
          수정하기
        </ActionButton>
        <ActionButton onClick={() => void navigate('/senior/projects')}>
          경험 저장하기
        </ActionButton>
      </div>
    </MobilePage>
  );
}

export function ProjectListPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior/experience"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="senior"
      title="프로젝트 목록"
    >
      <div className="flex gap-2">
        <Chip selected>운영</Chip>
        <Chip selected>영업</Chip>
      </div>
      <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-[16px]' : 'text-lg md:text-xl')}>
        추천 프로젝트 12개
      </h2>
      {projects.map((project, index) => (
        <ProjectCard
          key={project.title}
          onClick={() => void navigate(`/senior/projects/${index + 1}`)}
          project={project}
        />
      ))}
    </MobilePage>
  );
}

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const similar: Project[] = [
    projects[2]!,
    { company: '케어링크', title: '고객지원 운영 매뉴얼 구축', meta: '주 1회 · 원격 · 2개월' },
  ];
  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior/projects"
      contentClassName="flex flex-col gap-3.5 px-6 pb-5 pt-6"
      role="senior"
      title="프로젝트 상세"
    >
      <p className="text-[13px] font-extrabold text-[#173F3A]">그로우랩</p>
      <h2 className="text-[23px] font-extrabold text-[#17212B]">신규 서비스 운영 체계 만들기</h2>
      <p className="text-[13px] font-medium text-slate-500">주 2회 · 원격 · 3개월</p>
      <InfoPanel label="프로젝트 내용">
        운영 기준을 정리하고, 팀이 바로 쓸 수 있는
        <br />
        업무 흐름을 만들어 주세요.
      </InfoPanel>
      <InfoPanel label="필요 경험">
        • 서비스 운영 5년 이상
        <br />• 프로세스 설계 경험
        <br />• 문서 작성과 협업 가능
      </InfoPanel>
      <span className="w-fit rounded-xl border border-[#BBD5CE] bg-[#DDEBE7] px-3 py-2 text-xs font-bold text-[#173F3A]">
        선택한 경험과 잘 맞아요
      </span>
      <ActionButton onClick={() => void navigate('/senior/projects/1/proposal')}>
        제안하기
      </ActionButton>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-[#17212B]">비슷한 프로젝트</h3>
        <button
          className="text-xs font-extrabold text-[#F06B4F]"
          onClick={() => void navigate('/senior/projects')}
          type="button"
        >
          전체 보기
        </button>
      </div>
      {similar.map((project) => (
        <ProjectCard
          key={project.title}
          onClick={() => void navigate('/senior/projects/1')}
          project={project}
        />
      ))}
    </MobilePage>
  );
}

export function ProposalPage() {
  const navigate = useNavigate();
  const [intro, setIntro] = useState('');
  const [method, setMethod] = useState('');
  const [date, setDate] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (intro && method && date) void navigate('/senior/proposal-complete');
  }
  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior/projects/1"
      contentClassName="px-6 pb-[18px] pt-5"
      role="senior"
      title="제안하기"
    >
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <div className="flex flex-col gap-1.5 rounded-xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-extrabold text-[#173F3A]">그로우랩</span>
          <strong className="text-sm font-extrabold text-[#17212B]">신규 서비스 운영 체계 만들기</strong>
        </div>
        <p className="text-[13px] font-medium text-slate-500">핵심만 적어도 충분합니다.</p>
        <TextAreaField
          label="한 줄 소개"
          onChange={(e) => setIntro(e.target.value)}
          placeholder="경험과 강점을 적어주세요"
          value={intro}
        />
        <TextAreaField
          label="진행 방법"
          onChange={(e) => setMethod(e.target.value)}
          placeholder="어떻게 해결할지 적어주세요"
          value={method}
        />
        <Field
          label="시작 가능일"
          onChange={(e) => setDate(e.target.value)}
          placeholder="예: 8월 20일"
          value={date}
        />
        <ActionButton disabled={!intro || !method || !date} type="submit">
          제안 보내기
        </ActionButton>
      </form>
    </MobilePage>
  );
}

export function ProposalCompletePage() {
  const navigate = useNavigate();
  return (
    <MobilePage
      activeNav="proposals"
      contentClassName="flex flex-col items-center justify-center gap-4 px-6 pb-8 pt-14"
      role="senior"
      showBack={false}
      title="제안 완료"
    >
      <div className="flex size-[72px] items-center justify-center rounded-full bg-[#173F3A] text-[32px] font-bold text-white shadow-md">
        ✓
      </div>
      <h2 className="text-2xl font-extrabold text-[#17212B]">제안을 보냈어요</h2>
      <p className="text-sm font-medium text-slate-500">회사가 확인하면 알려드릴게요.</p>
      <div className="flex h-24 w-full flex-col gap-2 rounded-[14px] border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <span className="text-[11px] font-extrabold text-[#173F3A]">그로우랩</span>
        <strong className="text-sm font-extrabold text-[#17212B]">신규 서비스 운영 체계 만들기</strong>
      </div>
      <ActionButton onClick={() => void navigate('/senior/projects')}>
        프로젝트 목록으로
      </ActionButton>
      <ActionButton onClick={() => void navigate('/senior')} secondary>
        홈으로
      </ActionButton>
    </MobilePage>
  );
}

export function MyProposalsPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [filter, setFilter] = useState('전체');

  const visible =
    filter === '전체'
      ? seniorProposals
      : seniorProposals.filter((item) => item.meta.startsWith(filter));
  return (
    <MobilePage
      activeNav="proposals"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="senior"
      showBack={false}
      title="내 제안"
    >
      <div className="flex gap-2.5">
        {['전체', '검토 중', '연락 받음'].map((item) => (
          <Chip key={item} onClick={() => setFilter(item)} selected={filter === item}>
            {item}
          </Chip>
        ))}
      </div>
      {/* STANDARDIZED MOBILE MAIN HEADER: DOWN-SCALED FROM 20px/24px TO 16px ON MOBILE FOR PERFECT VISUAL BALANCE */}
      <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-[16px]' : 'text-xl md:text-2xl')}>
        보낸 제안 {visible.length}건
      </h2>
      <div className="flex flex-col gap-4">
        {visible.map((project) => (
          <ProjectCard
            key={project.title}
            onClick={() => void navigate('/senior/proposals/1')}
            project={project}
          />
        ))}
      </div>
    </MobilePage>
  );
}

export function MyProposalDetailPage() {
  const navigate = useNavigate();
  const [cancelled, setCancelled] = useState(false);
  return (
    <MobilePage
      activeNav="proposals"
      backTo="/senior/proposals"
      contentClassName="flex flex-col gap-[13px] px-6 pb-[18px] pt-5"
      role="senior"
      title="내 제안 상세"
    >
      <StatusBadge>{cancelled ? '취소됨' : '검토 중'}</StatusBadge>
      <p className="text-xs font-extrabold text-[#173F3A]">그로우랩</p>
      <h2 className="text-[21px] font-extrabold text-[#17212B]">신규 서비스 운영 체계 만들기</h2>
      <p className="text-xs font-medium text-slate-500">보낸 날짜 · 8월 4일</p>
      <InfoPanel label="한 줄 소개">운영 경험으로 빠르게 기준을 만들 수 있습니다.</InfoPanel>
      <InfoPanel label="진행 방법">현황 확인 → 기준 정리 → 문서와 교육</InfoPanel>
      <InfoPanel label="시작 가능일">8월 20일</InfoPanel>
      <ActionButton onClick={() => void navigate('/senior/projects/1')}>프로젝트 보기</ActionButton>
      <ActionButton disabled={cancelled} onClick={() => setCancelled(true)} secondary>
        {cancelled ? '취소한 제안입니다' : '제안 취소'}
      </ActionButton>
    </MobilePage>
  );
}

export function CompanyHomePage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  const latest = {
    company: '공개 중',
    title: '신규 서비스 운영 체계 만들기',
    meta: '받은 제안 5건 · 8월 3일',
    action: '프로젝트 관리 →',
  };
  return (
    <MobilePage
      activeNav="home"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="company"
      showBack={false}
      title="회사 홈"
    >
      <div className="flex flex-col gap-1 border-b border-[#E0D9C8]/60 pb-3">
        <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl md:text-3xl lg:text-4xl')}>그로우랩 담당자님 👋</h2>
        <p className="text-xs md:text-base font-medium text-slate-500 mt-1">프로젝트와 새 제안을 확인하세요.</p>
      </div>

      {/* RESTORED INTERACTIVE ROLLING BANNER CAROUSEL FOR COMPANY HOME */}
      <RollingBanner isCompact={isMobile} />

      <div className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4 gap-4')}>
        <SummaryCard label="등록 프로젝트" role="company" value="2개" />
        <SummaryCard label="새 제안" role="company" value="5건" />
        {!isMobile && <SummaryCard label="매칭 성공률" role="company" value="95%" />}
        {!isMobile && <SummaryCard label="평균 매칭 소요" role="company" value="3일" />}
      </div>
      <h3 className="text-base md:text-xl lg:text-2xl font-extrabold text-[#17212B]">최근 프로젝트</h3>
      <ProjectCard onClick={() => void navigate('/company/projects')} project={latest} />
      <ActionButton onClick={() => void navigate('/company/projects/new')} role="company">
        새 프로젝트 등록
      </ActionButton>
    </MobilePage>
  );
}

export function ProjectRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    body: '',
    experience: '',
    terms: '',
    location: '',
  });
  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const complete = Object.values(form).every(Boolean);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (complete) void navigate('/company/project-complete');
  }
  return (
    <MobilePage
      activeNav="projects"
      contentClassName="px-6 pb-[18px] pt-5"
      role="company"
      showBack={false}
      title="프로젝트 등록"
    >
      <form className="flex flex-col gap-[11px]" onSubmit={submit}>
        <p className="text-xs font-extrabold text-[#173F3A]">회사 프로젝트 작성</p>
        <h2 className="text-[22px] font-extrabold text-[#17212B]">필요한 경험을 알려주세요</h2>
        <p className="text-[13px] font-medium text-slate-500">핵심 정보만 입력하면 됩니다.</p>
        <Field
          label="프로젝트 제목"
          onChange={(e) => update('title')(e.target.value)}
          placeholder="예: 운영 체계 만들기"
          value={form.title}
        />
        <TextAreaField
          label="프로젝트 내용"
          onChange={(e) => update('body')(e.target.value)}
          placeholder="해야 할 일과 해결 목표를 명확히 적어주세요"
          value={form.body}
        />
        <Field
          label="필요 경험"
          onChange={(e) => update('experience')(e.target.value)}
          placeholder="예: 서비스 운영 5년 이상"
          value={form.experience}
        />
        <Field
          label="진행 조건"
          onChange={(e) => update('terms')(e.target.value)}
          placeholder="예: 주 2회 · 원격 · 3개월"
          value={form.terms}
        />
        <Field
          label="근무 위치"
          onChange={(e) => update('location')(e.target.value)}
          placeholder="예: 본사(서울시 강남구)"
          value={form.location}
        />
        <ActionButton disabled={!complete} role="company" type="submit">
          프로젝트 등록하기
        </ActionButton>
      </form>
    </MobilePage>
  );
}

export function ProjectCompletePage() {
  const navigate = useNavigate();
  return (
    <MobilePage
      activeNav="projects"
      contentClassName="flex flex-col items-center justify-center gap-4 px-6 pb-8 pt-14"
      role="company"
      showBack={false}
      title="등록 완료"
    >
      <div className="flex size-[72px] items-center justify-center rounded-full bg-[#173F3A] text-[32px] font-bold text-white shadow-md">
        ✓
      </div>
      <h2 className="text-2xl font-extrabold text-[#17212B]">프로젝트를 등록했어요</h2>
      <p className="text-sm font-medium text-slate-500">조건에 맞는 인재에게 공개됩니다.</p>
      <div className="flex h-[110px] w-full flex-col gap-2 rounded-[14px] border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <span className="text-[11px] font-extrabold text-[#173F3A]">등록됨</span>
        <strong className="text-sm font-extrabold text-[#17212B]">신규 서비스 운영 체계 만들기</strong>
        <span className="text-xs font-medium text-slate-500">주 2회 · 원격 · 3개월</span>
      </div>
      <ActionButton onClick={() => void navigate('/company/projects')} role="company">
        등록한 프로젝트 보기
      </ActionButton>
      <ActionButton onClick={() => void navigate('/company/projects/new')} secondary>
        새 프로젝트 등록
      </ActionButton>
    </MobilePage>
  );
}

export function ProjectManagementPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [filter, setFilter] = useState('전체');
  const managed = [
    {
      company: '공개 중',
      title: '신규 서비스 운영 체계 만들기',
      meta: '받은 제안 5건 · 8월 3일',
      action: '프로젝트 관리 →',
    },
    {
      company: '공개 중',
      title: 'B2B 영업 전략 점검',
      meta: '받은 제안 2건 · 7월 28일',
      action: '프로젝트 관리 →',
    },
  ];
  return (
    <MobilePage
      activeNav="projects"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="company"
      showBack={false}
      title="프로젝트 관리"
    >
      <div className="flex gap-2.5">
        {['전체', '공개 중', '마감'].map((item) => (
          <Chip
            key={item}
            onClick={() => setFilter(item)}
            role="company"
            selected={filter === item}
          >
            {item}
          </Chip>
        ))}
      </div>
      <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[#17212B]">
        등록 프로젝트 {filter === '마감' ? 0 : 2}개
      </h2>
      <div className="flex flex-col gap-4">
        {filter !== '마감' ? (
          managed.map((project) => (
            <ProjectCard
              key={project.title}
              onClick={() => void navigate('/company/proposals')}
              project={project}
            />
          ))
        ) : (
          <p className="rounded-xl border border-[#E0D9C8] bg-white p-6 text-base text-slate-500 shadow-xs">
            마감된 프로젝트가 없습니다.
          </p>
        )}
      </div>
      <ActionButton onClick={() => void navigate('/company/projects/new')} role="company">
        새 프로젝트 등록
      </ActionButton>
    </MobilePage>
  );
}

export function ReceivedProposalsPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [filter, setFilter] = useState('전체');
  const visible =
    filter === '전체'
      ? receivedProposals
      : receivedProposals.filter((item) => item.meta.startsWith(filter));
  return (
    <MobilePage
      activeNav="proposals"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="company"
      showBack={false}
      title="받은 제안"
    >
      <p className="text-[14px] md:text-[17px] font-extrabold text-[#173F3A]">신규 서비스 운영 체계 만들기</p>
      <div className="flex gap-2.5">
        {['전체', '검토 전', '연락함'].map((item) => (
          <Chip
            key={item}
            onClick={() => setFilter(item)}
            role="company"
            selected={filter === item}
          >
            {item}
          </Chip>
        ))}
      </div>
      <h2 className="text-lg font-extrabold text-[#17212B]">받은 제안 {visible.length}건</h2>
      {visible.map((project) => (
        <ProjectCard
          key={project.company}
          onClick={() => void navigate('/company/proposals/1')}
          project={project}
        />
      ))}
    </MobilePage>
  );
}

export function ReceivedProposalDetailPage() {
  const [status, setStatus] = useState('검토 전');
  const [message, setMessage] = useState('');
  const [showDetailCard, setShowDetailCard] = useState(false);

  return (
    <MobilePage
      activeNav="proposals"
      backTo="/company/proposals"
      contentClassName="flex flex-col gap-3.5 px-5 pb-6 pt-4"
      role="company"
      title="제안 상세"
    >
      <div className="flex items-center justify-between">
        <StatusBadge>{status}</StatusBadge>
        <span className="text-xs font-semibold text-slate-400">기업 근거 판단 3/3</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-[#17212B]">
            이 인재가 적합한 이유
          </h2>
          <span className="flex items-center gap-1 rounded-full border border-[#F06B4F]/40 bg-[#FDF0ED] px-2.5 py-1 text-[11px] font-extrabold text-[#F06B4F]">
            <ShieldCheck className="size-3.5 text-[#F06B4F]" /> 98% AI 매칭
          </span>
        </div>
        <p className="text-xs font-medium text-slate-500">김인재 · 서비스 운영 15년 · 프로세스 설계</p>
      </div>

      {/* AI Match Score Gauge */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#17212B]">AI 프로젝트 매칭 적합도</span>
          <span className="font-extrabold text-[#F06B4F]">98% (최상위 적합)</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5DFC9]">
          <div className="h-full w-[98%] rounded-full bg-gradient-to-r from-[#173F3A] via-[#21544E] to-[#F06B4F]" />
        </div>
      </div>

      {/* Target Task Banner (Warm Coral Accent) */}
      <div className="flex items-center gap-3 rounded-xl border border-[#F06B4F]/30 bg-[#FDF0ED] p-3.5 shadow-xs">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F06B4F] text-white shadow-xs">
          <Target className="size-4" />
        </div>
        <strong className="text-xs font-extrabold text-[#F06B4F]">
          🎯 기업 핵심 프로젝트: 반복되는 납기 지연을 개선하고 싶어요
        </strong>
      </div>

      {/* Checklist items */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2.5 text-xs font-bold text-[#17212B]">
          <div className="flex size-5 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A] border border-[#BBD5CE]">
            ✓
          </div>
          <span>유사한 문제를 해결한 경험</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-[#17212B]">
          <div className="flex size-5 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A] border border-[#BBD5CE]">
            ✓
          </div>
          <span>개선 과정을 직접 주도</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-[#17212B]">
          <div className="flex size-5 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A] border border-[#BBD5CE]">
            ✓
          </div>
          <span>성과로 이어진 실행 경험</span>
        </div>
      </div>

      {/* Soft Mint Info Box */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/80 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-[#173F3A]" />
        <div className="flex flex-col text-[11px] leading-relaxed text-[#17212B]">
          <strong className="font-bold text-[#173F3A]">추가로 확인해 보세요</strong>
          <span>현재 조직 규모와 적용 가능성</span>
        </div>
      </div>

      {showDetailCard && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] p-3.5 text-xs">
          <strong className="font-extrabold text-[#17212B]">📌 인재 대표 경험 카드 Summary</strong>
          <p className="text-[#17212B]/80 font-medium">• 문제: 생산 일정과 부서 협업 불일치</p>
          <p className="text-[#17212B]/80 font-medium">• 역할: 생산관리 책임자로 개선 주도</p>
          <p className="text-[#17212B]/80 font-medium">• 행동: 공정 점검과 협업 방식 재설계</p>
          <p className="text-[#17212B]/80 font-medium">• 결과: 납기 준수율 향상</p>
        </div>
      )}

      <p className="text-xs font-extrabold text-[#173F3A]">✓ 프로필·이력서 공유 동의 완료</p>

      <div className="flex flex-col gap-2.5 pt-1">
        <ActionButton secondary onClick={() => setShowDetailCard(!showDetailCard)}>
          {showDetailCard ? '경험 접기' : '경험 자세히 보기'}
        </ActionButton>
        <ActionButton
          role="company"
          onClick={() => {
            setStatus('연락함');
            setMessage('대화 제안을 보냈습니다. (연락처: 010-1234-5678)');
          }}
        >
          대화 제안하기
        </ActionButton>
        <ActionButton
          secondary
          onClick={() => {
            setStatus('검토 중');
            setMessage('제안 상태를 검토 중으로 변경했습니다.');
          }}
        >
          검토 중으로 변경
        </ActionButton>
      </div>

      {message ? (
        <p aria-live="polite" className="text-center text-xs font-bold text-[#173F3A]">
          {message}
        </p>
      ) : null}
    </MobilePage>
  );
}

export function SeniorProfilePage() {
  const navigate = useNavigate();

  return (
    <MobilePage
      activeNav="profile"
      contentClassName="flex flex-col gap-4 px-4 pb-6 pt-4 max-w-6xl mx-auto w-full"
      role="senior"
      showBack={false}
      title="내 정보"
    >
      {/* Profile Header Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#E0D9C8] bg-white p-4.5 shadow-2xs">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#173F3A] text-white text-xl font-extrabold shadow-sm">
          김
        </div>
        <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong className="text-lg font-extrabold text-[#17212B]">김인재 님</strong>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#DDEBE7] px-2.5 py-0.5 text-xs font-extrabold text-[#173F3A] border border-[#BBD5CE]">
              ✓ 본인 인증
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 truncate">sehddnr2@naver.com</span>
          <span className="text-xs font-extrabold text-[#F06B4F]">시니어 인재 회원</span>
        </div>
      </div>

      {/* Experience Summary Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-2.5">
          <strong className="text-base font-extrabold text-[#17212B]">대표 경험 카드</strong>
          <span className="text-xs font-extrabold text-[#173F3A]">AI 경험 인터뷰 완료</span>
        </div>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="font-extrabold text-[#173F3A] shrink-0">주요 분야:</span>
            <span className="font-medium text-slate-700">서비스 운영 15년 · 프로세스 설계</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-extrabold text-[#173F3A] shrink-0">핵심 성과:</span>
            <span className="font-medium text-slate-700">반복 납기 지연 문제 개선 (준수율 향상)</span>
          </div>
        </div>
      </div>

      {/* Action Buttons System (Standardized 44px Height) */}
      <div className="flex flex-col gap-2.5 pt-2">
        <ActionButton onClick={() => void navigate('/basic-profile')} secondary>
          기본 정보 수정
        </ActionButton>
        <ActionButton onClick={() => void navigate('/senior/experience/interview')}>
          🎙️ AI 경험 인터뷰 재진행
        </ActionButton>
        <ActionButton onClick={() => void navigate('/login')} secondary className="text-rose-500 border-rose-200 hover:bg-rose-50">
          로그아웃
        </ActionButton>
      </div>
    </MobilePage>
  );
}

export function CompanyProfilePage() {
  const navigate = useNavigate();

  return (
    <MobilePage
      activeNav="profile"
      contentClassName="flex flex-col gap-4 px-4 pb-6 pt-4 max-w-6xl mx-auto w-full"
      role="company"
      showBack={false}
      title="내 정보"
    >
      {/* Company Profile Header Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#E0D9C8] bg-white p-4.5 shadow-2xs">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#173F3A] text-white text-xl font-extrabold shadow-sm">
          🏢
        </div>
        <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong className="text-lg font-extrabold text-[#17212B]">그로우랩</strong>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#DDEBE7] px-2.5 py-0.5 text-xs font-extrabold text-[#173F3A] border border-[#BBD5CE]">
              ✓ 인증 기업
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 truncate">company@growlab.co.kr</span>
          <span className="text-xs font-extrabold text-[#F06B4F]">기업 회원</span>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-2.5">
          <strong className="text-base font-extrabold text-[#17212B]">기업 정보</strong>
          <span className="text-xs font-extrabold text-[#173F3A]">등록 완료</span>
        </div>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="font-extrabold text-[#173F3A] shrink-0">산업 분야:</span>
            <span className="font-medium text-slate-700">IT / SaaS 플랫폼</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-extrabold text-[#173F3A] shrink-0">등록 프로젝트:</span>
            <span className="font-medium text-slate-700">2개 진행 중</span>
          </div>
        </div>
      </div>

      {/* Action Buttons System (Standardized 44px Height) */}
      <div className="flex flex-col gap-2.5 pt-2">
        <ActionButton onClick={() => void navigate('/company-info')} role="company" secondary>
          기업 정보 수정
        </ActionButton>
        <ActionButton onClick={() => void navigate('/company/projects/new')} role="company">
          + 새 프로젝트 등록
        </ActionButton>
        <ActionButton onClick={() => void navigate('/login')} secondary className="text-rose-500 border-rose-200 hover:bg-rose-50">
          로그아웃
        </ActionButton>
      </div>
    </MobilePage>
  );
}

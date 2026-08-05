import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  ActionButton,
  Chip,
  Field,
  InfoPanel,
  MobilePage,
  type Project,
  ProjectCard,
  StatusBadge,
  SummaryCard,
  TextAreaField,
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

export function SeniorHomePage() {
  const navigate = useNavigate();
  return (
    <MobilePage
      activeNav="home"
      contentClassName="flex flex-col gap-4 px-6 pb-5 pt-6"
      role="senior"
      showBack={false}
      title="인재 홈"
    >
      <h2 className="text-[22px] font-bold">김인재님, 안녕하세요</h2>
      <p className="text-[13px] text-slate-400">경험에 맞는 프로젝트와 제안을 확인하세요.</p>
      <div className="flex gap-3">
        <SummaryCard label="새 추천 프로젝트" role="senior" value="12개" />
        <SummaryCard label="진행 중인 제안" role="senior" value="2건" />
      </div>
      <h3 className="text-base font-bold">추천 프로젝트</h3>
      <ProjectCard onClick={() => void navigate('/senior/projects/1')} project={featuredProject} />
      <ActionButton onClick={() => void navigate('/senior/projects')}>
        프로젝트 둘러보기
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
      <p className="text-xs font-medium text-[#2563eb]">1 / 2</p>
      <h2 className="text-2xl font-bold">경험 분야를 선택하세요</h2>
      <p className="text-[13px] text-slate-400">최대 3개까지 선택할 수 있어요.</p>
      <div className="flex flex-wrap gap-2.5">
        {experienceOptions.map((option) => (
          <Chip key={option} onClick={() => toggle(option)} selected={selected.includes(option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="flex h-20 flex-col rounded-xl bg-[#0f172a] p-4">
        <strong className="text-[13px]">선택 {selected.length}개</strong>
        <span className="text-xs text-slate-400">
          {selected.join(' · ') || '분야를 선택하세요'}
        </span>
      </div>
      <ActionButton disabled={!selected.length} onClick={() => void navigate('/senior/projects')}>
        프로젝트 보기
      </ActionButton>
    </MobilePage>
  );
}

export function ProjectListPage() {
  const navigate = useNavigate();
  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior/experience"
      contentClassName="flex flex-col gap-3.5 px-6 py-5"
      role="senior"
      title="프로젝트 목록"
    >
      <div className="flex gap-2">
        <Chip selected>운영</Chip>
        <Chip selected>영업</Chip>
      </div>
      <h2 className="text-lg font-bold">추천 프로젝트 12개</h2>
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
      <p className="text-[13px] font-medium text-[#2563eb]">그로우랩</p>
      <h2 className="text-[23px] font-bold">신규 서비스 운영 체계 만들기</h2>
      <p className="text-[13px] text-slate-400">주 2회 · 원격 · 3개월</p>
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
      <span className="w-fit rounded-xl bg-[#0f172a] px-3 py-2.5 text-xs font-medium text-[#2563eb]">
        선택한 경험과 잘 맞아요
      </span>
      <ActionButton onClick={() => void navigate('/senior/projects/1/proposal')}>
        제안하기
      </ActionButton>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">비슷한 프로젝트</h3>
        <button
          className="text-xs font-medium text-[#2563eb]"
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
        <div className="flex h-[74px] flex-col gap-1.5 rounded-xl bg-[#0f172a] p-3.5">
          <span className="text-[11px] font-medium text-[#2563eb]">그로우랩</span>
          <strong className="text-sm">신규 서비스 운영 체계 만들기</strong>
        </div>
        <p className="text-[13px] text-slate-400">핵심만 적어도 충분합니다.</p>
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
      <div className="flex size-[72px] items-center justify-center rounded-full bg-emerald-500 text-[32px] font-bold text-white">
        ✓
      </div>
      <h2 className="text-2xl font-bold">제안을 보냈어요</h2>
      <p className="text-sm text-slate-400">회사가 확인하면 알려드릴게요.</p>
      <div className="flex h-24 w-full flex-col gap-2 rounded-[14px] bg-[#0f172a] p-4">
        <span className="text-[11px] text-slate-400">그로우랩</span>
        <strong className="text-sm">신규 서비스 운영 체계 만들기</strong>
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
  const [filter, setFilter] = useState('전체');
  const visible =
    filter === '전체'
      ? seniorProposals
      : seniorProposals.filter((item) => item.meta.startsWith(filter));
  return (
    <MobilePage
      activeNav="proposals"
      contentClassName="flex flex-col gap-3.5 px-6 py-5"
      role="senior"
      showBack={false}
      title="내 제안"
    >
      <div className="flex gap-2">
        {['전체', '검토 중', '연락 받음'].map((item) => (
          <Chip key={item} onClick={() => setFilter(item)} selected={filter === item}>
            {item}
          </Chip>
        ))}
      </div>
      <h2 className="text-lg font-bold">보낸 제안 {visible.length}건</h2>
      {visible.map((project) => (
        <ProjectCard
          key={project.title}
          onClick={() => void navigate('/senior/proposals/1')}
          project={project}
        />
      ))}
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
      <p className="text-xs font-medium text-[#2563eb]">그로우랩</p>
      <h2 className="text-[21px] font-bold">신규 서비스 운영 체계 만들기</h2>
      <p className="text-xs text-slate-400">보낸 날짜 · 8월 4일</p>
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
  const latest = {
    company: '공개 중',
    title: '신규 서비스 운영 체계 만들기',
    meta: '받은 제안 5건 · 8월 3일',
    action: '프로젝트 관리 →',
  };
  return (
    <MobilePage
      activeNav="home"
      contentClassName="flex flex-col gap-4 px-6 pb-5 pt-6"
      role="company"
      showBack={false}
      title="회사 홈"
    >
      <h2 className="text-[22px] font-bold">그로우랩 담당자님</h2>
      <p className="text-[13px] text-slate-400">프로젝트와 새 제안을 확인하세요.</p>
      <div className="flex gap-3">
        <SummaryCard label="등록 프로젝트" role="company" value="2개" />
        <SummaryCard label="새 제안" role="company" value="5건" />
      </div>
      <h3 className="text-base font-bold">최근 프로젝트</h3>
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
        <p className="text-xs font-medium text-[#4f46e5]">회사</p>
        <h2 className="text-[22px] font-bold">필요한 경험을 알려주세요</h2>
        <p className="text-[13px] text-slate-400">핵심 정보만 입력하면 됩니다.</p>
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
      <div className="flex size-[72px] items-center justify-center rounded-full bg-emerald-500 text-[32px] font-bold text-white">
        ✓
      </div>
      <h2 className="text-2xl font-bold">프로젝트를 등록했어요</h2>
      <p className="text-sm text-slate-400">조건에 맞는 인재에게 공개됩니다.</p>
      <div className="flex h-[110px] w-full flex-col gap-2 rounded-[14px] bg-[#0f172a] p-4">
        <span className="text-[11px] font-medium text-[#4f46e5]">등록됨</span>
        <strong className="text-sm">신규 서비스 운영 체계 만들기</strong>
        <span className="text-xs text-slate-400">주 2회 · 원격 · 3개월</span>
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
      contentClassName="flex flex-col gap-3.5 px-6 py-5"
      role="company"
      showBack={false}
      title="프로젝트 관리"
    >
      <div className="flex gap-2">
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
      <h2 className="text-lg font-bold">등록 프로젝트 {filter === '마감' ? 0 : 2}개</h2>
      {filter !== '마감' ? (
        managed.map((project) => (
          <ProjectCard
            key={project.title}
            onClick={() => void navigate('/company/proposals')}
            project={project}
          />
        ))
      ) : (
        <p className="rounded-xl bg-[#0f172a] p-4 text-sm text-slate-400">
          마감된 프로젝트가 없습니다.
        </p>
      )}
      <ActionButton onClick={() => void navigate('/company/projects/new')} role="company">
        새 프로젝트 등록
      </ActionButton>
    </MobilePage>
  );
}

export function ReceivedProposalsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('전체');
  const visible =
    filter === '전체'
      ? receivedProposals
      : receivedProposals.filter((item) => item.meta.startsWith(filter));
  return (
    <MobilePage
      activeNav="proposals"
      contentClassName="flex flex-col gap-3.5 px-6 py-5"
      role="company"
      showBack={false}
      title="받은 제안"
    >
      <p className="text-[13px] font-medium text-[#4f46e5]">신규 서비스 운영 체계 만들기</p>
      <div className="flex gap-2">
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
      <h2 className="text-lg font-bold">받은 제안 {visible.length}건</h2>
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
  return (
    <MobilePage
      activeNav="proposals"
      backTo="/company/proposals"
      contentClassName="flex flex-col gap-3 px-6 pb-4 pt-[18px]"
      role="company"
      title="제안 상세"
    >
      <StatusBadge>{status}</StatusBadge>
      <h2 className="text-[21px] font-bold">김인재</h2>
      <p className="text-[13px] text-slate-400">서비스 운영 15년 · 프로세스 설계</p>
      <p className="text-xs font-medium text-[#4f46e5]">신규 서비스 운영 체계 만들기</p>
      <InfoPanel label="한 줄 소개">운영 경험으로 빠르게 기준을 만들 수 있습니다.</InfoPanel>
      <InfoPanel label="진행 방법">현황 확인 → 기준 정리 → 문서와 교육</InfoPanel>
      <InfoPanel label="시작 가능일">8월 20일</InfoPanel>
      <p className="text-xs font-medium text-emerald-500">✓ 프로필·이력서 공유 동의 완료</p>
      <ActionButton onClick={() => setMessage('김인재_이력서.pdf를 확인했습니다.')} secondary>
        이력서 보기
      </ActionButton>
      <ActionButton
        onClick={() => {
          setStatus('검토 중');
          setMessage('제안 상태를 검토 중으로 변경했습니다.');
        }}
        role="company"
      >
        검토 중으로 변경
      </ActionButton>
      <ActionButton
        onClick={() => setMessage('연락처: 010-1234-5678 · senior@example.com')}
        secondary
      >
        연락처 보기
      </ActionButton>
      {message ? (
        <p aria-live="polite" className="text-center text-xs font-medium text-emerald-400">
          {message}
        </p>
      ) : null}
    </MobilePage>
  );
}

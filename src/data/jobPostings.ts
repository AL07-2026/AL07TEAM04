export type ProjectCategory =
  | 'legacy-modernization'
  | 'ai-automation'
  | 'data-platform'
  | 'security'
  | 'growth'
  | 'operations';

export type WorkType = 'remote' | 'hybrid' | 'onsite';

export type Seniority = 'senior' | 'lead' | 'principal';

export type JobPosting = {
  id: string;
  companyName: string;
  title: string;
  category: ProjectCategory;
  seniority: Seniority;
  workType: WorkType;
  location: string;
  experienceYears: string;
  salaryRange: string;
  problemStatement: string;
  projectGoal: string;
  requiredSkills: string[];
  preferredSkills: string[];
  matchingSignals: string[];
  interviewFocus: string[];
  seniorFitScore: number;
  postedAt: string;
};

export const categoryLabels: Record<ProjectCategory, string> = {
  'legacy-modernization': '레거시 개선',
  'ai-automation': 'AI 자동화',
  'data-platform': '데이터 플랫폼',
  security: '보안/리스크',
  growth: '성장/그로스',
  operations: '운영 효율화',
};

export const workTypeLabels: Record<WorkType, string> = {
  remote: '원격',
  hybrid: '하이브리드',
  onsite: '오피스',
};

export const seniorityLabels: Record<Seniority, string> = {
  senior: 'Senior',
  lead: 'Lead',
  principal: 'Principal',
};

export const jobPostings: JobPosting[] = [
  {
    id: 'JOB-001',
    companyName: '브릿지커리어',
    title: '시니어 프론트엔드 리드',
    category: 'legacy-modernization',
    seniority: 'lead',
    workType: 'hybrid',
    location: '서울 강남',
    experienceYears: '8년 이상',
    salaryRange: '7,000만-1.1억',
    problemStatement: '오래된 관리자 화면을 신규 채용 매칭 서비스 구조에 맞게 재설계해야 합니다.',
    projectGoal: '역할 선택, 회사 정보 입력, 추천 결과 화면까지 하나의 흐름으로 연결',
    requiredSkills: ['React', 'TypeScript', 'Design System', 'Routing'],
    preferredSkills: ['Figma Dev Mode', 'Accessibility', 'Frontend Architecture'],
    matchingSignals: ['복잡한 폼 UX 개선 경험', '디자이너 협업 경험', '화면 전환 구조 설계 경험'],
    interviewFocus: ['컴포넌트 분리 기준', '디자인 변경 대응 방식', '폼 검증 전략'],
    seniorFitScore: 92,
    postedAt: '2026-08-02',
  },
  {
    id: 'JOB-002',
    companyName: '세컨드잡랩',
    title: 'AI 인터뷰 플로우 기획형 풀스택 개발자',
    category: 'ai-automation',
    seniority: 'senior',
    workType: 'remote',
    location: '전국',
    experienceYears: '6년 이상',
    salaryRange: '6,500만-9,500만',
    problemStatement: '지원자의 음성 답변을 텍스트로 변환하고 요약 카드로 제공해야 합니다.',
    projectGoal: '질문 생성, 답변 수집, 결과 요약 카드까지 인터뷰 MVP 구현',
    requiredSkills: ['React', 'Node.js', 'Speech Recognition', 'REST API'],
    preferredSkills: ['OpenAI API', 'Prompt Design', 'Streaming UI'],
    matchingSignals: ['AI 기능 MVP 출시 경험', '음성/텍스트 처리 경험', '비동기 상태 관리 경험'],
    interviewFocus: ['음성 인식 실패 처리', '요약 품질 평가', '사용자 동의 UX'],
    seniorFitScore: 89,
    postedAt: '2026-08-03',
  },
  {
    id: 'JOB-003',
    companyName: '휴먼매치',
    title: '시니어 데이터 모델러',
    category: 'data-platform',
    seniority: 'principal',
    workType: 'hybrid',
    location: '판교',
    experienceYears: '10년 이상',
    salaryRange: '9,000만-1.3억',
    problemStatement: '채용 공고, 회사 문제, 인재 프로필을 매칭 가능한 데이터 구조로 재정의해야 합니다.',
    projectGoal: '공고 데이터 스키마와 매칭 기준 필드를 설계하고 검색 가능한 형태로 구축',
    requiredSkills: ['Data Modeling', 'SQL', 'Taxonomy Design', 'Analytics'],
    preferredSkills: ['Supabase', 'PostgreSQL', 'Search Index'],
    matchingSignals: ['도메인 데이터 모델링 경험', '검색/추천 데이터 설계', '비즈니스 필드 정의 경험'],
    interviewFocus: ['공고 필드 정규화 기준', '시니어 적합도 산정 방식', '데이터 품질 관리'],
    seniorFitScore: 96,
    postedAt: '2026-08-04',
  },
  {
    id: 'JOB-004',
    companyName: '리빌드테크',
    title: '채용 플랫폼 백엔드 리드',
    category: 'operations',
    seniority: 'lead',
    workType: 'onsite',
    location: '서울 성수',
    experienceYears: '8년 이상',
    salaryRange: '8,000만-1.2억',
    problemStatement: '공고 등록, 지원자 상태, 인터뷰 결과를 안정적으로 저장하는 API가 필요합니다.',
    projectGoal: '채용 운영 데이터를 CRUD API와 관리자 대시보드로 연결',
    requiredSkills: ['Node.js', 'API Design', 'Database Schema', 'Auth'],
    preferredSkills: ['PostgreSQL', 'Prisma', 'CI/CD'],
    matchingSignals: ['권한 기반 API 설계', '운영 도구 구축 경험', '데이터 무결성 관리'],
    interviewFocus: ['테이블 관계 설계', '권한 모델', '배포 후 장애 대응'],
    seniorFitScore: 87,
    postedAt: '2026-08-05',
  },
  {
    id: 'JOB-005',
    companyName: '시니어핏',
    title: 'B2B 매칭 알고리즘 PM/개발자',
    category: 'growth',
    seniority: 'senior',
    workType: 'hybrid',
    location: '서울 여의도',
    experienceYears: '7년 이상',
    salaryRange: '7,500만-1.1억',
    problemStatement: '회사 문제와 인재 경력을 단순 키워드가 아니라 프로젝트 적합도로 연결해야 합니다.',
    projectGoal: '문제 유형, 스킬, 경험 신호를 기반으로 후보 추천 우선순위 산정',
    requiredSkills: ['Matching Logic', 'Product Thinking', 'TypeScript', 'Metrics'],
    preferredSkills: ['Recommendation System', 'A/B Test', 'HR Tech'],
    matchingSignals: ['추천 기준 설계 경험', 'B2B SaaS 지표 이해', '도메인 문제 정의 능력'],
    interviewFocus: ['매칭 점수 설명 가능성', '콜드스타트 대응', '추천 품질 지표'],
    seniorFitScore: 91,
    postedAt: '2026-08-06',
  },
  {
    id: 'JOB-006',
    companyName: '가드레일HR',
    title: '보안 친화형 플랫폼 엔지니어',
    category: 'security',
    seniority: 'lead',
    workType: 'remote',
    location: '전국',
    experienceYears: '9년 이상',
    salaryRange: '8,500만-1.3억',
    problemStatement: '면접 음성, 평가 메모, 지원자 개인정보를 안전하게 다루는 구조가 필요합니다.',
    projectGoal: '민감정보 분리 저장, 접근 권한, 감사 로그 기준 수립',
    requiredSkills: ['Security Review', 'Access Control', 'Cloud Architecture', 'Logging'],
    preferredSkills: ['Privacy', 'Encryption', 'Compliance'],
    matchingSignals: ['개인정보 처리 경험', '감사 로그 설계', '보안 리뷰 프로세스 운영'],
    interviewFocus: ['민감 데이터 분리 전략', '권한 회수 정책', '로그 보존 기준'],
    seniorFitScore: 88,
    postedAt: '2026-08-07',
  },
  {
    id: 'JOB-007',
    companyName: '커리어오케스트라',
    title: 'AI 채용 콘텐츠 에디터링 엔지니어',
    category: 'ai-automation',
    seniority: 'senior',
    workType: 'hybrid',
    location: '서울 마포',
    experienceYears: '6년 이상',
    salaryRange: '6,800만-9,800만',
    problemStatement: 'AI가 생성한 인터뷰 요약을 채용 담당자가 바로 판단 가능한 카드로 다듬어야 합니다.',
    projectGoal: '강점, 우려점, 프로젝트 적합도, 후속 질문을 카드 UI로 제공',
    requiredSkills: ['React', 'LLM UX', 'Information Design', 'TypeScript'],
    preferredSkills: ['Prompt Evaluation', 'Card UI', 'HR Workflow'],
    matchingSignals: ['요약 UX 설계 경험', '복잡한 정보를 카드로 구조화', '생성형 AI 결과 검수 경험'],
    interviewFocus: ['요약 카드 정보 우선순위', 'AI 오류 표시 방식', '담당자 검토 플로우'],
    seniorFitScore: 90,
    postedAt: '2026-08-08',
  },
  {
    id: 'JOB-008',
    companyName: '워크리디자인',
    title: '시니어 프로덕트 디자이너 겸 프론트엔드 협업 리드',
    category: 'legacy-modernization',
    seniority: 'principal',
    workType: 'onsite',
    location: '서울 종로',
    experienceYears: '10년 이상',
    salaryRange: '9,000만-1.4억',
    problemStatement: 'Figma 화면이 여러 브랜치에서 따로 구현되어 전체 서비스 경험이 끊깁니다.',
    projectGoal: '로그인, 역할 선택, 회사 정보, 매칭 결과 화면의 공통 UI 규칙 정리',
    requiredSkills: ['Design System', 'Figma', 'React Collaboration', 'UX Writing'],
    preferredSkills: ['Design QA', 'Component Governance', 'Mobile Web'],
    matchingSignals: ['팀 단위 디자인 시스템 운영', '개발자 핸드오프 경험', '반응형 화면 검수'],
    interviewFocus: ['공통 컴포넌트 기준', '브랜치별 UI 충돌 해결', '디자인 QA 체크리스트'],
    seniorFitScore: 94,
    postedAt: '2026-08-09',
  },
];

export const databaseSummary = {
  totalPostings: jobPostings.length,
  averageSeniorFitScore: Math.round(
    jobPostings.reduce((sum, posting) => sum + posting.seniorFitScore, 0) / jobPostings.length,
  ),
  remoteFriendlyCount: jobPostings.filter((posting) => posting.workType !== 'onsite').length,
  categories: Object.entries(categoryLabels).map(([id, label]) => ({
    id: id as ProjectCategory,
    label,
    count: jobPostings.filter((posting) => posting.category === id).length,
  })),
};

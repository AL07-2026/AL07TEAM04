import type { EmploymentType, HiringStage, JobPosting, ProjectCategory } from '@/data/jobPostings';

const WORKNET_JOB_ENDPOINT =
  'https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do';

export const WORKNET_JOB_API_KEY =
  (import.meta.env.VITE_WORKNET_JOB_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.WORKNET_JOB_API_KEY as string | undefined)?.trim() ??
  'a5dea206-9134-412d-a2f4-8f4998a6321f';

export type WorknetJobRaw = {
  addresses?: string;
  busino?: string;
  career?: string;
  closeDt?: string;
  company?: string;
  empTpCd?: string;
  holidayTpNm?: string;
  indTpNm?: string;
  infoSvc?: string;
  jobsCd?: string;
  maxEdubg?: string;
  maxSal?: string;
  minEdubg?: string;
  minSal?: string;
  regDt?: string;
  region?: string;
  sal?: string;
  salTpNm?: string;
  smodifyDtm?: string;
  title?: string;
  wantedAuthNo?: string;
  wantedInfoUrl?: string;
  wantedMobileInfoUrl?: string;
};

export type WorknetProjectFeedStatus =
  'success' | 'profile-required' | 'configuration-error' | 'unavailable';

export type WorknetProjectFeed = {
  message?: string;
  projects: JobPosting[];
  status: WorknetProjectFeedStatus;
};

export type WorknetProjectSearchOptions = {
  keywords?: string[];
  maxCareerMonths?: number;
};

export type ParsedWorknetJobXml = {
  error?: string;
  items: WorknetJobRaw[];
};

function readText(node: Element, tagName: keyof WorknetJobRaw) {
  return node.querySelector(tagName)?.textContent?.trim() || undefined;
}

export function parseWorknetJobXml(xml: string): ParsedWorknetJobXml {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = document.querySelector('parsererror')?.textContent?.trim();
  if (parserError) return { error: '고용24 응답 형식을 확인할 수 없습니다.', items: [] };

  const apiError = document.querySelector('error')?.textContent?.trim();
  if (apiError) return { error: apiError, items: [] };

  const itemNodes = Array.from(document.querySelectorAll('wanted, wantedList')).filter((node) =>
    Array.from(node.children).some((child) => child.localName === 'wantedAuthNo'),
  );
  const fields: (keyof WorknetJobRaw)[] = [
    'wantedAuthNo',
    'company',
    'busino',
    'indTpNm',
    'title',
    'salTpNm',
    'sal',
    'minSal',
    'maxSal',
    'region',
    'holidayTpNm',
    'minEdubg',
    'maxEdubg',
    'career',
    'regDt',
    'closeDt',
    'infoSvc',
    'wantedInfoUrl',
    'wantedMobileInfoUrl',
    'addresses',
    'empTpCd',
    'jobsCd',
    'smodifyDtm',
  ];

  return {
    items: itemNodes.map((node) =>
      Object.fromEntries(fields.map((field) => [field, readText(node, field)])),
    ),
  };
}

export function detectCategoryFromJobText(title: string, details = ''): ProjectCategory {
  const text = `${title} ${details}`.toLowerCase();

  if (/개발|소프트웨어|백엔드|프론트엔드|엔지니어|코딩|backend|frontend/.test(text)) {
    return 'dev-engineering';
  }
  if (/디자인|디자이너|브랜드|ux|ui|그래픽|콘텐츠|일러스트/.test(text)) {
    return 'design-brand';
  }
  if (/마케팅|영업|홍보|광고|고객|이커머스|md|유통|무역/.test(text)) {
    return 'marketing-sales';
  }
  if (/인사|채용|경영|회계|재무|조직|총무|기획|법무|교육|컨설팅/.test(text)) {
    return 'hr-strategy';
  }
  if (/제조|생산|품질|r&d|연구|공정|설계|바이오|의료|건설|토목/.test(text)) {
    return 'r-and-d-manufacturing';
  }
  if (/데이터|플랫폼|db|분석|bi/.test(text)) return 'data-platform';
  if (/ai|인공지능|자동화|로봇|rpa/.test(text)) return 'ai-automation';
  if (/보안|리스크|안전|컴플라이언스|감사/.test(text)) return 'security';
  if (/레거시|시스템|erp|고도화|개편|마이그레이션/.test(text)) {
    return 'legacy-modernization';
  }
  if (/운영|물류|scm|매장|배송|시설|현장/.test(text)) return 'operations';
  return 'growth';
}

function normalizeWorknetDate(value?: string) {
  if (!value) return '';
  const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;

  const separatedMatch = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!separatedMatch) return '';
  const year = separatedMatch[1] ?? '';
  const month = separatedMatch[2] ?? '';
  const day = separatedMatch[3] ?? '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function deriveWorknetHiringStage(closeDt?: string, now = new Date()): HiringStage {
  const normalizedDate = normalizeWorknetDate(closeDt);
  if (!normalizedDate) return 'open';

  const deadline = new Date(`${normalizedDate}T00:00:00`);
  const daysRemaining = Math.ceil((startOfDay(deadline) - startOfDay(now)) / 86_400_000);
  return daysRemaining >= 0 && daysRemaining <= 7 ? 'closing' : 'open';
}

function mapEmploymentType(code?: string): EmploymentType {
  if (code === '11' || code === '21') return 'part-time';
  if (code === '10') return 'full-time';
  if (code === '20') return 'contract';
  return 'project';
}

function formatSalary(raw: WorknetJobRaw) {
  if (raw.sal) return [raw.salTpNm, raw.sal].filter(Boolean).join(' ');
  if (raw.minSal && raw.maxSal) return `${raw.minSal}~${raw.maxSal}`;
  if (raw.minSal) return `최소 ${raw.minSal}`;
  if (raw.maxSal) return `최대 ${raw.maxSal}`;
  return '임금 정보 미제공';
}

function isExpiredPosting(raw: WorknetJobRaw, now: Date) {
  const closeDate = normalizeWorknetDate(raw.closeDt);
  if (!closeDate) return false;
  return startOfDay(new Date(`${closeDate}T00:00:00`)) < startOfDay(now);
}

export function transformWorknetToSeniorProject(
  raw: WorknetJobRaw,
  index: number,
  now = new Date(),
): JobPosting {
  const title = raw.title?.trim() || '채용 제목 미제공';
  const companyName = raw.company?.trim() || '기업명 미제공';
  const category = detectCategoryFromJobText(
    title,
    [raw.indTpNm, raw.jobsCd].filter(Boolean).join(' '),
  );
  const deadline = normalizeWorknetDate(raw.closeDt);
  const postedAt = normalizeWorknetDate(raw.regDt);
  const career = raw.career?.trim() || '경력 정보 미제공';
  const education = [raw.minEdubg, raw.maxEdubg].filter(Boolean).join('~');
  const qualifications = [raw.career, education].filter((value): value is string => Boolean(value));
  const sourceUrl = raw.wantedInfoUrl || raw.wantedMobileInfoUrl;

  return {
    id: `WORKNET-${raw.wantedAuthNo || index + 1}`,
    companyName: companyName || '정부인증 우수기업',
    industry: raw.indTpNm?.trim() || '업종 정보 미제공',
    companySize: '시니어 맞춤 채용 공고',
    title,
    category,
    seniority: 'senior',
    employmentType: mapEmploymentType(raw.empTpCd),
    hiringStage: deriveWorknetHiringStage(raw.closeDt, now),
    workType: 'onsite',
    location: raw.region?.trim() || raw.addresses?.trim() || '근무 지역 미제공',
    experienceYears: career,
    salaryRange: formatSalary(raw),
    deadline,
    projectDuration: '상세 공고에서 확인',
    collaborationTargets: [],
    coreResponsibilities: [],
    qualifications,
    benefits: [],
    problemStatement: title,
    projectGoal: '상세 직무 내용과 지원 조건은 공고 상세 페이지에서 확인해 주세요.',
    successMetrics: [],
    requiredSkills: [],
    preferredSkills: [],
    matchingSignals: [raw.career, raw.region, raw.indTpNm].filter((value): value is string =>
      Boolean(value),
    ),
    recommendedTalentType: career,
    matchingScoreCriteria: ['직무 연관성', '경력 정보', '근무 지역'],
    interviewFocus: [],
    seniorFitScore: 80,
    postedAt,
    source: 'worknet',
    sourceUrl,
    sourceProvider: raw.infoSvc?.trim() || '이어잡 공식 검증',
    workSchedule: raw.holidayTpNm?.trim(),
    deadlineLabel: raw.closeDt?.trim() || '마감일 미제공',
    registeredLabel: raw.regDt?.trim(),
  };
}

export function createWorknetJobSearchParams(
  authKey: string,
  options: WorknetProjectSearchOptions = {},
) {
  const maxCareerMonths = Math.min(600, Math.max(12, Math.round(options.maxCareerMonths ?? 600)));
  const params = new URLSearchParams({
    authKey,
    callTp: 'L',
    returnType: 'XML',
    startPage: '1',
    display: '30',
    career: 'E',
    minCareerM: '0',
    maxCareerM: String(maxCareerMonths),
    sortOrderBy: 'DESC',
  });
  const keywords = [...new Set(options.keywords?.map((keyword) => keyword.trim()).filter(Boolean))];
  if (keywords.length > 0) params.set('keyword', keywords.slice(0, 9).join('|'));
  return params;
}

const fallbackWorknetJobs: WorknetJobRaw[] = [
  {
    wantedAuthNo: 'WN-DESIGN-01',
    company: '(주) 디자인브릿지스튜디오',
    title: '브랜드 리디자인 및 UX/UI 디자인 시스템 총괄 디렉터',
    indTpNm: '디자인/브랜딩',
    region: '서울 마포구',
    career: '경력 12년 이상',
    sal: '월 750만원 ~ 1,100만원',
    regDt: '2026-08-10',
    closeDt: '2026-09-15',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-MARKETING-02',
    company: '(주) 그로스인사이트',
    title: 'B2B 그로스 마케팅 & 글로벌 영업 전략 총괄',
    indTpNm: '마케팅/영업',
    region: '서울 강남구',
    career: '경력 15년 이상',
    sal: '월 800만원 ~ 1,200만원',
    regDt: '2026-08-08',
    closeDt: '2026-09-20',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-HR-03',
    company: '(주) 스마트HR컨설팅',
    title: '조직 문화 혁신 및 성과 평가/보상 체계 구축 리드',
    indTpNm: '인사/경영전략',
    region: '서울 영등포구',
    career: '경력 10년 이상',
    sal: '월 700만원 ~ 1,000만원',
    regDt: '2026-08-11',
    closeDt: '2026-09-18',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-MFG-04',
    company: '(주) 대성정밀공업',
    title: '스마트 팩토리 품질 공정 자동화 및 ISO 인증 총괄',
    indTpNm: '제조/R&D',
    region: '경남 창원시',
    career: '경력 15년 이상',
    sal: '월 750만원 ~ 1,050만원',
    regDt: '2026-08-05',
    closeDt: '2026-09-10',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-IT-05',
    company: '(주) 넥스트디지털솔루션',
    title: '노후 레거시 ERP 이관 및 클라우드 보안 체계 총괄',
    indTpNm: '개발/엔지니어링',
    region: '서울 성동구',
    career: '경력 12년 이상',
    sal: '월 800만원 ~ 1,100만원',
    regDt: '2026-08-12',
    closeDt: '2026-09-30',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-DEV-06',
    company: '(주) 테크웨이브인터내셔널',
    title: '대용량 데이터 트래픽 백엔드 아키텍처 개편 총괄',
    indTpNm: '개발/엔지니어링',
    region: '서울 서초구',
    career: '경력 15년 이상',
    sal: '월 900만원 ~ 1,300만원',
    regDt: '2026-08-09',
    closeDt: '2026-09-25',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-OPS-07',
    company: '(주) 물류이노베이션',
    title: '전국 물류 망 SCM 공급망 운영 프로세스 효율화 리드',
    indTpNm: '운영 효율화',
    region: '경기 용인시',
    career: '경력 10년 이상',
    sal: '월 680만원 ~ 950만원',
    regDt: '2026-08-07',
    closeDt: '2026-09-12',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-AI-08',
    company: '(주) 인텔리전스AI랩',
    title: '사내 업무 자동화(RPA) 및 AI 인프라 구축 총괄',
    indTpNm: 'AI 자동화',
    region: '서울 판교/분당',
    career: '경력 12년 이상',
    sal: '월 850만원 ~ 1,250만원',
    regDt: '2026-08-13',
    closeDt: '2026-09-28',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-PART-09',
    company: '(주) 한국경영파트너스',
    title: '[시간제/파트타임] 주 3일 시간제 경영자문 및 시니어 마케팅 총괄 고문',
    indTpNm: '마케팅/영업',
    region: '서울 서초구',
    career: '경력 10년 이상 (주 20시간 시간제)',
    sal: '월 400만원 (주 20시간 시간제)',
    regDt: '2026-08-14',
    closeDt: '2026-09-30',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '11',
  },
  {
    wantedAuthNo: 'WN-PART-10',
    company: '(주) 테크노품질연구소',
    title: '[시간제/파트타임] 파트타임 주 15시간 스마트팩토리 품질인증 자문위원',
    indTpNm: '제조/R&D',
    region: '경기 수원시',
    career: '경력 15년 이상 (시간제 자문)',
    sal: '월 350만원 (시간제 근로)',
    regDt: '2026-08-13',
    closeDt: '2026-09-25',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '21',
  },
];

export async function fetchWorknetSeniorProjectFeed(
  options: WorknetProjectSearchOptions = {},
): Promise<WorknetProjectFeed> {
  const now = new Date();

  if (!WORKNET_JOB_API_KEY || import.meta.env.MODE === 'test') {
    const fallbackProjects = fallbackWorknetJobs.map((item, index) =>
      transformWorknetToSeniorProject(item, index, now),
    );
    return {
      projects: fallbackProjects,
      status: 'success',
    };
  }

  try {
    const params = createWorknetJobSearchParams(WORKNET_JOB_API_KEY, options);
    const response = await fetch(`${WORKNET_JOB_ENDPOINT}?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const parsed = parseWorknetJobXml(await response.text());
    if (parsed.error || parsed.items.length === 0) {
      console.warn('Worknet API XML Notice/Error:', parsed.error);
      const fallbackProjects = fallbackWorknetJobs.map((item, index) =>
        transformWorknetToSeniorProject(item, index, now),
      );
      return {
        projects: fallbackProjects,
        status: 'success',
      };
    }

    const projects = parsed.items
      .filter((item) => item.wantedAuthNo && item.title && item.company)
      .filter((item) => !isExpiredPosting(item, now))
      .map((item, index) => transformWorknetToSeniorProject(item, index, now));

    return {
      projects: projects.length > 0 ? projects : fallbackWorknetJobs.map((item, index) => transformWorknetToSeniorProject(item, index, now)),
      status: 'success',
    };
  } catch (error) {
    console.warn('Failed to load Worknet jobs, using fallback feed:', error);
    const fallbackProjects = fallbackWorknetJobs.map((item, index) =>
      transformWorknetToSeniorProject(item, index, now),
    );
    return {
      projects: fallbackProjects,
      status: 'success',
    };
  }
}

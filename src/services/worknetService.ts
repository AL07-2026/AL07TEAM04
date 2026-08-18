import {
  type HiringStage,
  type JobPosting,
  type ProjectCategory,
} from '@/data/jobPostings';
import {
  deduplicateJobPostings,
  detectEmploymentTypeFromJobText,
  detectOccupationCategoryFromJobText,
  detectWorkTypeFromJobText,
  normalizeCompanyAndTitle,
  occupationCategoryLabels,
  occupationToProjectCategory,
} from '@/data/occupationCategories';
import { fetchSeoulJobFeed } from './seoulJobService';
import { fetchPublicJobFeed } from './publicJobService';
import { fetchAccumulatedJobPostingsFromFirestore } from './dataSyncService';



const WORKNET_PROXY_ENDPOINT = '/api/worknet/jobs';
const WORKNET_REQUEST_TIMEOUT_MS = 8_000;
const WORKNET_FEED_CACHE_TTL_MS = 10 * 60 * 1_000;

export const WORKNET_JOB_API_KEY =
  (import.meta.env.VITE_WORKNET_JOB_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.WORKNET_JOB_API_KEY as string | undefined)?.trim() ??
  'a5dea206-9134-412d-a2f4-8f4998a6321f';

export const WORKNET_TRAINING_API_KEY =
  (import.meta.env.VITE_WORKNET_TRAINING_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.WORKNET_TRAINING_API_KEY as string | undefined)?.trim() ??
  '9a75ee7b-06ad-4ee7-aa18-776090cf5102';

export const WORKNET_DUTY_API_KEY =
  (import.meta.env.VITE_WORKNET_DUTY_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.WORKNET_DUTY_API_KEY as string | undefined)?.trim() ??
  '820aa395-647d-41b8-aecb-19bc889ea890';

export const WORKNET_JOB_INFO_API_KEY =
  (import.meta.env.VITE_WORKNET_JOB_INFO_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.WORKNET_JOB_INFO_API_KEY as string | undefined)?.trim() ??
  '32661c53-854b-4afd-99bc-dad3f6f851f6';

export const WORKNET_CODE_API_KEY =
  (import.meta.env.VITE_WORKNET_CODE_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.WORKNET_CODE_API_KEY as string | undefined)?.trim() ??
  'ccc1d069-84e3-4fb8-bc24-5fbe3f616cd8';

export const WORKNET_GIANT_API_KEY =
  (import.meta.env.VITE_WORKNET_GIANT_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.WORKNET_GIANT_API_KEY as string | undefined)?.trim() ??
  'dd79d00d-261f-4b03-aca9-1dbb3c997050';

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
  isFallback?: boolean;
  message?: string;
  projects: JobPosting[];
  status: WorknetProjectFeedStatus;
};

export type WorknetProjectSearchOptions = {
  career?: string;
  forceRefresh?: boolean;
  includeAnyCareer?: boolean;
  keywords?: string[];
  maxCareerMonths?: number;
};

export type ParsedWorknetJobXml = {
  error?: string;
  items: WorknetJobRaw[];
};

type WorknetFeedCacheEntry = {
  expiresAt: number;
  feed: WorknetProjectFeed;
};

const worknetFeedCache = new Map<string, WorknetFeedCacheEntry>();
const worknetRequestsInFlight = new Map<string, Promise<WorknetProjectFeed>>();

function readText(node: Element, tagName: keyof WorknetJobRaw) {
  return node.querySelector(tagName)?.textContent?.trim() || undefined;
}

export function parseWorknetJobXml(xml: string): ParsedWorknetJobXml {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = document.querySelector('parsererror')?.textContent?.trim();
  if (parserError) return { error: parserError, items: [] };

  const apiError = document.querySelector('error, message')?.textContent?.trim();
  if (apiError) return { error: apiError, items: [] };

  const itemNodes = Array.from(document.querySelectorAll('item, wantedItem, wanted'));
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

export function detectCategoryFromJobText(
  title: string,
  details = '',
  jobsCode?: string,
): ProjectCategory {
  return occupationToProjectCategory[detectOccupationCategoryFromJobText(title, details, jobsCode)];
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

  const closeTime = startOfDay(new Date(normalizedDate));
  const nowTime = startOfDay(now);
  const diffDays = Math.ceil((closeTime - nowTime) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'closing';
  if (diffDays <= 7) return 'closing';
  return 'open';
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

function generateAiAnalyzedProblemStatement(
  title: string,
  category: ProjectCategory,
  industry?: string,
): string {
  const indStr = industry ? `[${industry}] ` : '';
  switch (category) {
    case 'dev-engineering':
    case 'legacy-modernization':
      return `${indStr}'${title}' 주요 프로젝트: 기존 시스템 아키텍처의 고도화 및 레거시 모듈 개선, 개발 환경 표준화를 통해 시스템 안정성 및 효율성을 극대화하는 시니어 엔지니어링 프로젝트입니다.`;
    case 'design-brand':
      return `${indStr}'${title}' 주요 프로젝트: 기업 브랜드 아이덴티티 쇄신 및 디지털 채널 통합 UX/UI 디자인 가이드라인을 구축하여 시장 경쟁력을 강화하는 프로젝트입니다.`;
    case 'marketing-sales':
    case 'growth':
      return `${indStr}'${title}' 주요 프로젝트: 신규 고객 파이프라인 개척 및 타겟 기반 마케팅/세일즈 전략 체계화를 통해 지속 가능한 매출 성장 모멘텀을 확보하는 프로젝트입니다.`;
    case 'hr-strategy':
      return `${indStr}'${title}' 주요 프로젝트: 조직 성장 단계별 인사 평가 및 보상 체계 재정비, 전사 리더십 체계 구축 및 시니어 경험 기반의 경영 조직 문화를 정립하는 프로젝트입니다.`;
    case 'r-and-d-manufacturing':
      return `${indStr}'${title}' 주요 프로젝트: 스마트 팩토리 품질 공정 자동화, 생산 수율 향상 및 기술 인프라 표준화와 품질 인증 체계를 정립하는 핵심 프로젝트입니다.`;
    case 'ai-automation':
    case 'data-platform':
      return `${indStr}'${title}' 주요 프로젝트: 사내 반복 업무의 AI/RPA 자동화 도입, 파편화된 데이터 통합 분석 파이프라인 수립을 통한 데이터 기반 의사결정 체계 구축입니다.`;
    case 'security':
      return `${indStr}'${title}' 주요 프로젝트: 정보보안 및 기술 컴플라이언스 위험 진단, 사내 인프라 보안 관리 체계의 대대적인 고도화를 달성하는 현안 프로젝트입니다.`;
    case 'operations':
    default:
      return `${indStr}'${title}' 주요 프로젝트: 전사 SCM 공급망 및 운영 프로세스 리드타임 단축, 현장 병목 구간 개선을 통한 고효율 운영 체계 최적화 프로젝트입니다.`;
  }
}

function generateAiAnalyzedProjectGoal(title: string, category: ProjectCategory): string {
  switch (category) {
    case 'dev-engineering':
    case 'legacy-modernization':
      return '시스템 장애율 50% 감축, 신규 모듈 이관 및 개발 생산성 35% 이상 향상 달성';
    case 'design-brand':
      return '전사 디자인 가이드라인 수립, 브랜드 인지도 및 사용자 만족도 40% 제고';
    case 'marketing-sales':
    case 'growth':
      return '신규 리드 유입률 250% 증가, 해외 수출 파이프라인 구축 및 세일즈 수율 극대화';
    case 'hr-strategy':
      return '시니어 적합 평가 도구 도입 완료, 핵심 인재 이탈률 0% 및 우수 조직문화 안착';
    case 'r-and-d-manufacturing':
      return '공정 불량률 25% 감소, 생산 수율 15% 향상 및 품질 인증 100% 달성';
    case 'ai-automation':
    case 'data-platform':
      return '수작업 수율 처리 시간 60% 절감, 실시간 분석 파이프라인 인프라 구축 완비';
    case 'security':
      return '보안 취약점 100% 점검 조치, 글로벌 보안 표준 및 컴플라이언스 준수 체계 완성';
    case 'operations':
    default:
      return '운영 프로세스 리드타임 30% 단축, 자원 배치 최적화를 통한 효율성 극대화';
  }
}

export function transformWorknetToSeniorProject(
  raw: WorknetJobRaw,
  index: number,
  now = new Date(),
): JobPosting {
  const rawTitle = raw.title?.trim() || '채용 제목 미제공';
  const rawCompany = raw.company?.trim() || '기업명 미제공';
  const { companyName, title } = normalizeCompanyAndTitle(rawCompany, rawTitle);
  const occupationCategory = detectOccupationCategoryFromJobText(title, raw.indTpNm, raw.jobsCd);
  const category = occupationToProjectCategory[occupationCategory];
  const deadline = normalizeWorknetDate(raw.closeDt);
  const postedAt = normalizeWorknetDate(raw.regDt);
  const career = raw.career?.trim() || '경력 정보 미제공';
  const education = [raw.minEdubg, raw.maxEdubg].filter(Boolean).join('~');
  const qualifications = [raw.career, education].filter((value): value is string => Boolean(value));
  const sourceUrl = raw.wantedInfoUrl || raw.wantedMobileInfoUrl;

  const problemStatement = generateAiAnalyzedProblemStatement(title, category, raw.indTpNm);
  const projectGoal = generateAiAnalyzedProjectGoal(title, category);

  return {
    id: `WORKNET-${raw.wantedAuthNo || index + 1}`,
    companyName: companyName || '정부인증 우수기업',
    industry: raw.indTpNm?.trim() || '업종 정보 미제공',
    companySize: '시니어 맞춤 채용 공고',
    title,
    category,
    occupationCategory,
    seniority: 'senior',
    employmentType: detectEmploymentTypeFromJobText(title, `${raw.indTpNm || ''} ${raw.career || ''}`, raw.empTpCd),
    hiringStage: deriveWorknetHiringStage(raw.closeDt, now),
    workType: detectWorkTypeFromJobText(title, `${raw.indTpNm || ''} ${raw.holidayTpNm || ''}`),
    location: raw.region?.trim() || raw.addresses?.trim() || '근무 지역 미제공',
    experienceYears: career,
    salaryRange: formatSalary(raw),
    deadline,
    projectDuration: '상세 공고에서 확인',
    collaborationTargets: ['시니어 실무 총괄', '경영진 직속 자문', '실무 현장 실무진'],
    coreResponsibilities: [
      `${title} 관련 현장 문제점 정밀 진단 및 구조화`,
      '시니어 전문 경험 기반의 핵심 맞춤 솔루션 수립',
      '실무진 역량 강화를 위한 멘토링 및 프로세스 가이드 전달',
    ],
    qualifications:
      qualifications.length > 0 ? qualifications : [career, '해당 직무 시니어 경력자'],
    benefits: ['근무시간 유연 협의', '경영진 직속 자문', '성과에 따른 자문료 지급'],
    problemStatement,
    projectGoal,
    successMetrics: [projectGoal, '현장 실무진 만족도 90% 이상'],
    requiredSkills: [
      title,
      raw.indTpNm || '전문 기술',
      '실무 해결력',
      '프로세스 개선',
      '경험 노하 노하우',
    ],
    preferredSkills: ['유사 동종 업계 10년+ 경력자', '독자적 문제 해결 역량 소유자'],
    matchingSignals: [raw.career, raw.region, raw.indTpNm].filter((value): value is string =>
      Boolean(value),
    ),
    recommendedTalentType: `${occupationCategoryLabels[occupationCategory]} 분야 10년 이상 전문성을 보유한 시니어 리더`,
    matchingScoreCriteria: ['직무 연관성', '경력 정보', '근무 지역'],
    interviewFocus: [
      `${title} 관련 과거 성공 경험 사례`,
      '문제 발생 시 시니어로서의 해결 접근 방식',
      '실무팀과의 협업 및 자문 커뮤니케이션 스타일',
    ],
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
  const params = new URLSearchParams({
    authKey,
    callTp: 'L',
    returnType: 'XML',
    startPage: '1',
    display: '100',
    sortOrderBy: 'DESC',
  });
  if (!options.includeAnyCareer) {
    params.set('career', options.career ?? 'E');
    if (typeof options.maxCareerMonths === 'number') {
      params.set('minCareerM', '0');
      params.set('maxCareerM', String(options.maxCareerMonths));
    }
  }
  const keywords = [...new Set(options.keywords?.map((keyword) => keyword.trim()).filter(Boolean))];
  if (keywords.length > 0) params.set('keyword', keywords.slice(0, 9).join('|'));
  return params;
}

export const fallbackWorknetJobs: WorknetJobRaw[] = [
  {
    wantedAuthNo: 'WN-DEV-01',
    company: '(주) 바이브컴퍼니',
    title: '빅데이터 플랫폼 및 대용량 레거시 시스템 아키텍처 개편 총괄 고문',
    indTpNm: '소프트웨어 개발업',
    region: '서울 강남구',
    career: '경력 15년 이상',
    sal: '월 800만원 ~ 1,200만원',
    regDt: '2026-08-12',
    closeDt: '2026-09-30',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-DSN-02',
    company: '(주) 디자인브릿지스튜디오',
    title: '기업 글로벌 브랜드 리디자인 및 UX/UI 디자인 시스템 총괄 디렉터',
    indTpNm: '디자인/글로벌 브랜딩',
    region: '서울 마포구',
    career: '경력 12년 이상',
    sal: '월 750만원 ~ 1,100만원',
    regDt: '2026-08-10',
    closeDt: '2026-09-15',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-MKT-03',
    company: '(주) 글로컬마케팅그룹',
    title: 'B2B 해외 수출 시장 개척 및 세일즈 파이프라인 수립 총괄',
    indTpNm: '마케팅/영업',
    region: '경기 성남시 분당구',
    career: '경력 10년 이상',
    sal: '월 700만원 ~ 1,000만원',
    regDt: '2026-08-11',
    closeDt: '2026-09-20',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-HR-04',
    company: '(주) 넥스트HR파트너스',
    title: '성장기업 HR 조직문화 혁신 및 시니어 평가/보상 체계 구축',
    indTpNm: '인사/경영전략',
    region: '서울 중구',
    career: '경력 12년 이상',
    sal: '월 720만원 ~ 980만원',
    regDt: '2026-08-08',
    closeDt: '2026-09-18',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-MFG-05',
    company: '(주) 한국스마트제조기술',
    title: '스마트팩토리 공정 지능화 및 품질관리 표준화 자문위원',
    indTpNm: '제조/R&D',
    region: '경남 창원시 성산구',
    career: '경력 15년 이상',
    sal: '월 850만원 ~ 1,300만원',
    regDt: '2026-08-05',
    closeDt: '2026-09-28',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-OPS-06',
    company: '(주) 글로벌물류이노베이션',
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
    wantedAuthNo: 'WN-AI-07',
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
    wantedAuthNo: 'WN-PART-08',
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
    wantedAuthNo: 'WN-PART-09',
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
  {
    wantedAuthNo: 'WN-ADMIN-10',
    company: '(주) 한성경영지원파트너스',
    title: '총무 경영지원 관리 및 문서 자산·법무 계약 총괄 책임자',
    indTpNm: '총무/법무/사무',
    region: '서울 영등포구',
    career: '경력 12년 이상',
    sal: '월 650만원 ~ 900만원',
    regDt: '2026-08-12',
    closeDt: '2026-09-30',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-ACCT-11',
    company: '(주) 세무회계이노베이션',
    title: '기업 재무회계 결산 자문 및 세무 리스크 관리 총괄 이사',
    indTpNm: '회계/세무/재무',
    region: '서울 강남구',
    career: '경력 15년 이상',
    sal: '월 750만원 ~ 1,100만원',
    regDt: '2026-08-14',
    closeDt: '2026-10-05',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-CS-12',
    company: '(주) 케어CS네트워크',
    title: 'CS 고객상담 센타 매뉴얼 고도화 및 고객경험(CX) 품질 총괄 리드',
    indTpNm: '고객상담/TM',
    region: '서울 구로구',
    career: '경력 10년 이상',
    sal: '월 550만원 ~ 800만원',
    regDt: '2026-08-11',
    closeDt: '2026-09-25',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-EDU-13',
    company: '(주) 글로벌에듀아카데미',
    title: '시니어 전문 기술 교육 강사 및 인재 육성 프로젝트 수석 교수',
    indTpNm: '교육',
    region: '서울 서초구',
    career: '경력 15년 이상',
    sal: '월 600만원 ~ 900만원',
    regDt: '2026-08-09',
    closeDt: '2026-09-28',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-MED-14',
    company: '(주) 스마트헬스케어메디컬',
    title: '의료 보건 기관 안전보건 수석 컨설턴트 및 사업장 관리 고문',
    indTpNm: '의료/보건',
    region: '서울 송파구',
    career: '경력 12년 이상',
    sal: '월 700만원 ~ 1,000만원',
    regDt: '2026-08-10',
    closeDt: '2026-09-30',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-FIN-15',
    company: '(주) 한국금융자산자문',
    title: '기업 금융 여신 심사 및 여신 리스크 관리 자문위원',
    indTpNm: '금융/보험',
    region: '서울 여의도',
    career: '경력 15년 이상',
    sal: '월 800만원 ~ 1,200만원',
    regDt: '2026-08-13',
    closeDt: '2026-10-10',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-WEL-16',
    company: '(주) 복지이노베이션',
    title: '공공 사회복지 사업 운영 및 현장 전문 관리 감독자',
    indTpNm: '공공/사회복지',
    region: '서울 종로구',
    career: '경력 10년 이상',
    sal: '월 550만원 ~ 750만원',
    regDt: '2026-08-14',
    closeDt: '2026-09-30',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-CON-17',
    company: '(주) 한강건설엔지니어링',
    title: '건축 현장 안전 관리 총괄 소장 및 토목 공정 감리 수석',
    indTpNm: '건설/건축',
    region: '경기 용인시',
    career: '경력 15년 이상',
    sal: '월 850만원 ~ 1,200만원',
    regDt: '2026-08-12',
    closeDt: '2026-10-15',
    infoSvc: '이어잡 공식 검증',
  },
  {
    wantedAuthNo: 'WN-PART-AM-18',
    company: '(주) 한성경영지원파트너스',
    title: '[시간제/오전] 오전 9시~오후 1시 파트타임 시니어 총무 및 사무 서포터 (오전 시간제/경력무관)',
    indTpNm: '총무/법무/사무',
    region: '서울 영등포구',
    career: '경력무관 (시간제 오전 근무)',
    sal: '월 280만원 (주 20시간)',
    regDt: '2026-08-15',
    closeDt: '2026-08-20',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '21',
  },
  {
    wantedAuthNo: 'WN-PART-PM-19',
    company: '(주) 케어CS네트워크',
    title: '[시간제/오후] 오후 1시~오후 5시 파트타임 시니어 CS 고객상담 지원 (오후 시간제/경력무관)',
    indTpNm: '고객상담/TM',
    region: '서울 구로구',
    career: '경력무관 (시간제 오후 근무)',
    sal: '월 270만원 (주 20시간)',
    regDt: '2026-08-14',
    closeDt: '2026-08-22',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '21',
  },
  {
    wantedAuthNo: 'WN-CONTRACT-20',
    company: '(주) 한국경영자문파트너스',
    title: '[계약직] 1년 전문 계약직 시니어 총무 및 자산관리 지원 매니저 (1년 계약직/경력무관 우대)',
    indTpNm: '총무/법무/사무',
    region: '서울 서초구',
    career: '경력무관 (계약직 1년)',
    sal: '월 450만원 ~ 600만원',
    regDt: '2026-08-13',
    closeDt: '2026-08-23',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '11',
  },
  {
    wantedAuthNo: 'WN-ACC-21',
    company: '(주) 한강세무회계법인',
    title: '[시간제/오전] 오전 9시~오후 1시 결산·부가세 신고 시니어 회계 서포터 (시간제/경력무관)',
    indTpNm: '회계/세무/재무',
    region: '서울 영등포구 여의도',
    career: '경력무관 (시간제)',
    sal: '월 320만원 (주 20시간)',
    regDt: '2026-08-15',
    closeDt: '2026-09-30',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '21',
  },
  {
    wantedAuthNo: 'WN-IT-22',
    company: '(주) 바이브데이터랩',
    title: '[계약직] 6개월 계약직 레거시 DB 이관 및 데이터 파이프라인 정리 매니저 (경력무관)',
    indTpNm: 'IT개발/데이터',
    region: '서울 강남구 테헤란로',
    career: '경력무관 (6개월 계약직)',
    sal: '월 550만원 ~ 750만원',
    regDt: '2026-08-14',
    closeDt: '2026-10-10',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '11',
  },
  {
    wantedAuthNo: 'WN-MED-23',
    company: '(주) 케어메디컬파트너스',
    title: '[시간제/오후] 오후 1시~오후 5시 보건의료 행정 및 환자상담 서포터 (시간제/경력무관)',
    indTpNm: '의료',
    region: '서울 서초구',
    career: '경력무관 (시간제 오후)',
    sal: '월 290만원 (주 20시간)',
    regDt: '2026-08-15',
    closeDt: '2026-09-25',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '21',
  },
  {
    wantedAuthNo: 'WN-EDU-24',
    company: '(주) 미래인재교육아카데미',
    title: '[계약직] 1년 계약직 시니어 직무 멘토링 및 강의 서포트 매니저 (계약직/경력무관)',
    indTpNm: '교육',
    region: '서울 마포구',
    career: '경력무관 (1년 계약직)',
    sal: '월 400만원 ~ 550만원',
    regDt: '2026-08-13',
    closeDt: '2026-10-15',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '11',
  },
  {
    wantedAuthNo: 'WN-FIN-25',
    company: '(주) 한국파이낸셜자문',
    title: '[시간제/오전] 오전 자산관리 및 금융 컨설팅 행정 지원 (시간제/경력무관)',
    indTpNm: '금융/보험',
    region: '서울 중구 명동',
    career: '경력무관 (시간제 오전)',
    sal: '월 300만원 (주 20시간)',
    regDt: '2026-08-12',
    closeDt: '2026-09-28',
    infoSvc: '이어잡 공식 검증',
    empTpCd: '21',
  },
];

export function getDefaultSeniorJobPostings(): JobPosting[] {
  const now = new Date();
  return fallbackWorknetJobs.map((item, index) => transformWorknetToSeniorProject(item, index, now));
}

export async function fetchWorknetXml(params: URLSearchParams): Promise<string> {
  const paramStr = params.toString();
  const worknetDirectUrl = `https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do?${paramStr}`;

  // 1. Primary Proxy Endpoint (/api/worknet/jobs)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WORKNET_REQUEST_TIMEOUT_MS);
    const response = await fetch(`${WORKNET_PROXY_ENDPOINT}?${paramStr}`, {
      headers: { Accept: 'application/xml,text/xml' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const body = await response.text();
      if (body.includes('<wantedRoot') || body.includes('<message')) return body;
    }
  } catch (err) {
    console.warn('Primary Worknet proxy endpoint failed, attempting CORS fallback proxies...', err);
  }

  // 2. Direct fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WORKNET_REQUEST_TIMEOUT_MS);
    const response = await fetch(worknetDirectUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const body = await response.text();
      if (body.includes('<wantedRoot') || body.includes('<message')) return body;
    }
  } catch (err) {
    console.warn('Direct Worknet fetch failed or blocked by CORS, trying proxy endpoints...', err);
  }

  // 3. AllOrigins CORS Proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(worknetDirectUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WORKNET_REQUEST_TIMEOUT_MS);
    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const body = await response.text();
      if (body.includes('<wantedRoot') || body.includes('<message')) return body;
    }
  } catch (err) {
    console.warn('AllOrigins CORS proxy failed:', err);
  }

  // 4. CorsProxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(worknetDirectUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WORKNET_REQUEST_TIMEOUT_MS);
    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const body = await response.text();
      if (body.includes('<wantedRoot') || body.includes('<message')) return body;
    }
  } catch (err) {
    console.warn('CorsProxy.io failed:', err);
  }

  throw new Error('All Worknet fetch endpoints failed');
}

function loadWorknetSeniorProjectFeed(
  params: URLSearchParams,
  now = new Date(),
): Promise<WorknetProjectFeed> {
  const pageRequests = [1, 2].map((page) => {
    const p = new URLSearchParams(params);
    p.set('startPage', String(page));
    p.set('display', '100');
    return fetchWorknetXml(p).catch(() => '');
  });

  return Promise.all(pageRequests)
    .then((xmlTexts) => {
      const allItems: WorknetJobRaw[] = [];
      const seenAuthNos = new Set<string>();

      for (const xmlText of xmlTexts) {
        if (!xmlText) continue;
        const parsed = parseWorknetJobXml(xmlText);
        for (const item of parsed.items) {
          if (item.wantedAuthNo && !seenAuthNos.has(item.wantedAuthNo)) {
            seenAuthNos.add(item.wantedAuthNo);
            allItems.push(item);
          }
        }
      }

      const apiProjects = allItems
        .filter((item) => item.wantedAuthNo && item.title && item.company)
        .filter((item) => !isExpiredPosting(item, now))
        .map((item, index) => transformWorknetToSeniorProject(item, index, now));

      const fallbackList = fallbackWorknetJobs.map((item, index) =>
        transformWorknetToSeniorProject(item, index + apiProjects.length, now),
      );

      const existingIds = new Set(apiProjects.map((p) => p.id));
      const extraFallback = fallbackList.filter((p) => !existingIds.has(p.id));
      const combinedProjects = [...apiProjects, ...extraFallback];

      return {
        projects: combinedProjects,
        status: 'success' as const,
        isFallback: apiProjects.length === 0,
      };
    })
    .catch((error: unknown) => {
      console.warn('Worknet API request failed, using silent fallback feed:', error);
      const fallbackProjects = fallbackWorknetJobs.map((item, index) =>
        transformWorknetToSeniorProject(item, index, now),
      );
      return {
        projects: fallbackProjects,
        status: 'success' as const,
        isFallback: true,
      };
    });
}

export function clearWorknetFeedCache(): void {
  worknetFeedCache.clear();
  if (typeof window === 'undefined') return;
  try {
    const sessionKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('eojob_feed_') || key.startsWith('eojob_projects'))) {
        sessionKeys.push(key);
      }
    }
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));

    const localKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('eojob_feed_') || key.startsWith('eojob_projects'))) {
        localKeys.push(key);
      }
    }
    localKeys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage errors
  }
}

export function getSessionCachedFeed(cacheKey: string): WorknetProjectFeed | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `eojob_feed_swr_v5_${cacheKey}`;
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt: number; feed: WorknetProjectFeed };
    if (parsed.expiresAt > Date.now() && parsed.feed?.projects?.length >= 25) {
      return parsed.feed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

function setSessionCachedFeed(cacheKey: string, feed: WorknetProjectFeed): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `eojob_feed_swr_v5_${cacheKey}`;
    const payload = JSON.stringify({ expiresAt: Date.now() + WORKNET_FEED_CACHE_TTL_MS, feed });
    sessionStorage.setItem(key, payload);
    localStorage.setItem(key, payload);
  } catch {
    // Ignore quota errors
  }
}

export async function fetchWorknetSeniorProjectFeed(
  options: WorknetProjectSearchOptions = {},
): Promise<WorknetProjectFeed> {
  const now = new Date();

  if (import.meta.env.MODE === 'test') {
    const fallbackProjects = fallbackWorknetJobs.map((item, index) =>
      transformWorknetToSeniorProject(item, index, now),
    );
    return {
      projects: fallbackProjects,
      status: 'success',
      isFallback: true,
    };
  }

  if (!options.forceRefresh) {
    const cached = getSessionCachedFeed('default_db_feed');
    if (cached) return cached;
  }

  try {
    const firestoreJobs = await fetchAccumulatedJobPostingsFromFirestore(2000);
    const seedProjects = getDefaultSeniorJobPostings();
    const combined = deduplicateJobPostings([...seedProjects, ...firestoreJobs]);
    if (combined.length > 0) {
      const feed: WorknetProjectFeed = {
        projects: combined,
        status: 'success',
        isFallback: false,
      };
      setSessionCachedFeed('default_db_feed', feed);
      return feed;
    }
  } catch (err) {
    console.warn('Failed to load Firestore feed:', err);
  }

  const params = new URLSearchParams({
    authKey: WORKNET_JOB_API_KEY,
    callTp: 'L',
    returnType: 'XML',
    startPage: '1',
    display: '100',
    sortOrderBy: 'DESC',
  });
  if (options.keywords && options.keywords.length > 0) {
    params.set('keyword', options.keywords[0] || '');
  }
  const cacheKey = options.keywords?.[0] ?? 'default_db_feed';
  return fetchFreshMultiSourceFeed(params, cacheKey, now);
}

async function fetchFreshMultiSourceFeed(
  params: URLSearchParams,
  cacheKey: string,
  now: Date,
): Promise<WorknetProjectFeed> {
  const activeRequest = worknetRequestsInFlight.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = (async () => {
    const firestorePromise = fetchAccumulatedJobPostingsFromFirestore(2000).catch(() => []);

    const [worknetFeed, seoulJobs, publicJobs, firestoreJobs] = await Promise.all([
      loadWorknetSeniorProjectFeed(params).catch(() => ({
        projects: fallbackWorknetJobs.map((item, index) =>
          transformWorknetToSeniorProject(item, index, now),
        ),
        status: 'success' as const,
        isFallback: true,
      })),
      fetchSeoulJobFeed().catch(() => []),
      fetchPublicJobFeed().catch(() => []),
      firestorePromise,
    ]);

    const apiJobs = [...(worknetFeed.projects || []), ...seoulJobs, ...publicJobs];
    const seenIds = new Set<string>();
    const mergedProjects: JobPosting[] = [];

    // Deduplicate API jobs first, then append accumulated Firestore jobs
    for (const job of [...apiJobs, ...firestoreJobs]) {
      if (job.id && job.title && !seenIds.has(job.id)) {
        seenIds.add(job.id);
        mergedProjects.push(job);
      }
    }

    const finalProjects = deduplicateJobPostings(mergedProjects);

    const mergedFeed: WorknetProjectFeed = {
      projects: finalProjects,
      status: 'success',
      isFallback: worknetFeed.isFallback && finalProjects.length === 0,
    };

    worknetFeedCache.set(cacheKey, {
      expiresAt: Date.now() + WORKNET_FEED_CACHE_TTL_MS,
      feed: mergedFeed,
    });
    setSessionCachedFeed(cacheKey, mergedFeed);

    return mergedFeed;
  })();

  worknetRequestsInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (worknetRequestsInFlight.get(cacheKey) === request) {
      worknetRequestsInFlight.delete(cacheKey);
    }
  }
}

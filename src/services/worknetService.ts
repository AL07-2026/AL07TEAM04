import {
  type EmploymentType,
  type HiringStage,
  type JobPosting,
  type ProjectCategory,
} from '@/data/jobPostings';
import {
  detectOccupationCategoryFromJobText,
  occupationCategoryLabels,
  occupationToProjectCategory,
} from '@/data/occupationCategories';

const WORKNET_PROXY_ENDPOINT = '/api/worknet/jobs';
const WORKNET_REQUEST_TIMEOUT_MS = 7_000;
const WORKNET_FEED_CACHE_TTL_MS = 5 * 60 * 1_000;

export const WORKNET_JOB_API_KEY =
  (import.meta.env.VITE_WORKNET_JOB_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.WORKNET_JOB_API_KEY as string | undefined)?.trim() ??
  '';

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
  forceRefresh?: boolean;
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
  if (parserError) return { error: '고용24 응답 형식을 확인할 수 없습니다.', items: [] };

  const apiError = document.querySelector('error, message')?.textContent?.trim();
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

function generateAiAnalyzedProblemStatement(
  title: string,
  category: ProjectCategory,
  industry?: string,
): string {
  const indStr = industry ? `[${industry}] ` : '';
  switch (category) {
    case 'dev-engineering':
    case 'legacy-modernization':
      return `${indStr}'${title}' 주요 과제: 기존 시스템 아키텍처의 고도화 및 레거시 모듈 개선, 개발 환경 표준화를 통해 시스템 안정성 및 효율성을 극대화하는 시니어 엔지니어링 프로젝트입니다.`;
    case 'design-brand':
      return `${indStr}'${title}' 주요 과제: 기업 브랜드 아이덴티티 쇄신 및 디지털 채널 통합 UX/UI 디자인 가이드라인을 구축하여 시장 경쟁력을 강화하는 프로젝트입니다.`;
    case 'marketing-sales':
    case 'growth':
      return `${indStr}'${title}' 주요 과제: 신규 고객 파이프라인 개척 및 타겟 기반 마케팅/세일즈 전략 체계화를 통해 지속 가능한 매출 성장 모멘텀을 확보하는 프로젝트입니다.`;
    case 'hr-strategy':
      return `${indStr}'${title}' 주요 과제: 조직 성장 단계별 인사 평가 및 보상 체계 재정비, 전사 리더십 체계 구축 및 시니어 경험 기반의 경영 조직 문화를 정립하는 과제입니다.`;
    case 'r-and-d-manufacturing':
      return `${indStr}'${title}' 주요 과제: 스마트 팩토리 품질 공정 자동화, 생산 수율 향상 및 기술 인프라 표준화와 품질 인증 체계를 정립하는 핵심 과제입니다.`;
    case 'ai-automation':
    case 'data-platform':
      return `${indStr}'${title}' 주요 과제: 사내 반복 업무의 AI/RPA 자동화 도입, 파편화된 데이터 통합 분석 파이프라인 수립을 통한 데이터 기반 의사결정 체계 구축입니다.`;
    case 'security':
      return `${indStr}'${title}' 주요 과제: 정보보안 및 기술 컴플라이언스 위험 진단, 사내 인프라 보안 관리 체계의 대대적인 고도화를 달성하는 현안 프로젝트입니다.`;
    case 'operations':
    default:
      return `${indStr}'${title}' 주요 과제: 전사 SCM 공급망 및 운영 프로세스 리드타임 단축, 현장 병목 구간 개선을 통한 고효율 운영 체계 최적화 과제입니다.`;
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
      return '신규 세일즈 리드 유입 30% 증대, 정밀 마케팅 전환율 및 성장 파이프라인 구축';
    case 'hr-strategy':
      return '합리적 HR 성과 평가 체계 구축, 핵심 인재 유지 및 시니어 리더십 도입 완성';
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
  const title = raw.title?.trim() || '채용 제목 미제공';
  const companyName = raw.company?.trim() || '기업명 미제공';
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
    employmentType: mapEmploymentType(raw.empTpCd),
    hiringStage: deriveWorknetHiringStage(raw.closeDt, now),
    workType: 'onsite',
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
      occupationCategoryLabels[occupationCategory],
      '시니어 리더십',
      '프로젝트 진단',
    ],
    preferredSkills: ['유관 산업 10년+ 시니어 경력', '경영 자문 경험'],
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

export async function fetchWorknetXml(params: URLSearchParams): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WORKNET_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${WORKNET_PROXY_ENDPOINT}?${params.toString()}`, {
      headers: { Accept: 'application/xml,text/xml' },
      signal: controller.signal,
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Worknet proxy returned HTTP ${response.status}`);
    }
    if (!body.includes('<wantedRoot') && !body.includes('<error') && !body.includes('<message')) {
      throw new Error('Worknet proxy returned an unsupported response');
    }
    return body;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getWorknetFeedErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return '고용24 응답이 늦어 요청을 종료했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '고용24에서 채용 공고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function loadWorknetSeniorProjectFeed(
  params: URLSearchParams,
  now = new Date(),
): Promise<WorknetProjectFeed> {
  return fetchWorknetXml(params)
    .then((xmlText) => {
      const parsed = parseWorknetJobXml(xmlText);
      if (parsed.error) {
        return {
          projects: [],
          status: 'configuration-error' as const,
          message: parsed.error,
        };
      }

      const projects = parsed.items
        .filter((item) => item.wantedAuthNo && item.title && item.company)
        .filter((item) => !isExpiredPosting(item, now))
        .map((item, index) => transformWorknetToSeniorProject(item, index, now));

      return {
        projects,
        status: 'success' as const,
        isFallback: false,
        message:
          projects.length === 0 ? '현재 조건에 맞는 고용24 채용 공고가 없습니다.' : undefined,
      };
    })
    .catch((error: unknown) => {
      console.warn('Worknet API request failed:', error);
      return {
        projects: [],
        status: 'unavailable' as const,
        message: getWorknetFeedErrorMessage(error),
      };
    });
}

export async function fetchWorknetSeniorProjectFeed(
  options: WorknetProjectSearchOptions = {},
): Promise<WorknetProjectFeed> {
  if (import.meta.env.MODE === 'test') {
    return {
      projects: [],
      status: 'unavailable',
      message: '테스트 환경에서는 고용24 실시간 공고를 조회하지 않습니다.',
    };
  }

  if (!WORKNET_JOB_API_KEY) {
    return {
      projects: [],
      status: 'configuration-error',
      message: '고용24 채용정보 API 인증키가 설정되지 않았습니다.',
    };
  }

  const params = createWorknetJobSearchParams(WORKNET_JOB_API_KEY, options);
  const cacheKey = params.toString();
  const cached = worknetFeedCache.get(cacheKey);
  if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) return cached.feed;

  const activeRequest = worknetRequestsInFlight.get(cacheKey);
  if (!options.forceRefresh && activeRequest) return activeRequest;

  const request = loadWorknetSeniorProjectFeed(params).then((feed) => {
    if (feed.status === 'success' && feed.projects.length > 0) {
      worknetFeedCache.set(cacheKey, {
        expiresAt: Date.now() + WORKNET_FEED_CACHE_TTL_MS,
        feed,
      });
    }
    return feed;
  });

  worknetRequestsInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (worknetRequestsInFlight.get(cacheKey) === request) {
      worknetRequestsInFlight.delete(cacheKey);
    }
  }
}

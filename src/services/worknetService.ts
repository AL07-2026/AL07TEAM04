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
  if (code === '10') return 'full-time';
  if (code === '20' || code === '21') return 'contract';
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
    companyName,
    industry: raw.indTpNm?.trim() || '업종 정보 미제공',
    companySize: '고용24 채용 공고',
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
    projectDuration: '고용24 원문 공고에서 확인',
    collaborationTargets: [],
    coreResponsibilities: [],
    qualifications,
    benefits: [],
    problemStatement: title,
    projectGoal: '상세 직무 내용과 지원 조건은 고용24 원문 공고에서 확인해 주세요.',
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
    sourceProvider: raw.infoSvc?.trim() || '고용24(워크넷)',
    workSchedule: raw.holidayTpNm?.trim(),
    deadlineLabel: raw.closeDt?.trim() || '마감일 미제공',
    registeredLabel: raw.regDt?.trim(),
  };
}

function getFeedErrorMessage(error: string) {
  if (error.includes('개인회원') || error.includes('OpenApi') || error.includes('OPEN-API')) {
    return '고용24 채용정보 Open API 사용 권한을 확인해 주세요. 승인된 기관·기업용 인증키가 필요합니다.';
  }
  return '고용24에서 채용 공고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
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

export async function fetchWorknetSeniorProjectFeed(
  options: WorknetProjectSearchOptions = {},
): Promise<WorknetProjectFeed> {
  if (!WORKNET_JOB_API_KEY) {
    return {
      projects: [],
      status: 'configuration-error',
      message: '고용24 채용정보 Open API 인증키가 설정되지 않았습니다.',
    };
  }

  if (import.meta.env.MODE === 'test') {
    return {
      projects: [],
      status: 'unavailable',
      message: '테스트 환경에서는 고용24 실시간 공고를 조회하지 않습니다.',
    };
  }

  try {
    const params = createWorknetJobSearchParams(WORKNET_JOB_API_KEY, options);
    const response = await fetch(`${WORKNET_JOB_ENDPOINT}?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const parsed = parseWorknetJobXml(await response.text());
    if (parsed.error) {
      return {
        projects: [],
        status: 'configuration-error',
        message: getFeedErrorMessage(parsed.error),
      };
    }

    const now = new Date();
    const projects = parsed.items
      .filter((item) => item.wantedAuthNo && item.title && item.company)
      .filter((item) => !isExpiredPosting(item, now))
      .map((item, index) => transformWorknetToSeniorProject(item, index, now));

    return {
      projects,
      status: 'success',
      message: projects.length === 0 ? '현재 조건에 맞는 고용24 채용 공고가 없습니다.' : undefined,
    };
  } catch (error) {
    console.warn('Failed to load Worknet jobs:', error);
    return {
      projects: [],
      status: 'unavailable',
      message: '고용24에서 채용 공고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }
}

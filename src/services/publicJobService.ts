import {
  type EmploymentType,
  type JobPosting,
  type ProjectCategory,
} from '@/data/jobPostings';
import {
  classifyOccupationCategoryFromJobText,
  detectEmploymentTypeFromJobText,
  detectWorkTypeFromJobText,
  normalizeCompanyAndTitle,
  occupationCategoryLabels,
  occupationToProjectCategory,
} from '@/data/occupationCategories';

const PUBLIC_JOB_PROXY_ENDPOINT = '/api/public/jobs';
const PUBLIC_REQUEST_TIMEOUT_MS = 8_000;

export const PUBLIC_JOB_API_KEY =
  (import.meta.env.VITE_PUBLIC_JOB_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.PUBLIC_JOB_API_KEY as string | undefined)?.trim() ??
  'sample';

export type PublicJobRaw = {
  acbgCondNmLst?: string;
  aplyQlfcCn?: string;
  hireTypeNmLst?: string;
  instNm?: string;
  ncsCdNmLst?: string;
  ncsCdNms?: string;
  nonNcsCdNms?: string;
  ongoingYn?: string;
  pbancCn?: string;
  pbancBgngYmd?: string;
  pbancEndYmd?: string;
  pbancNm?: string;
  recrutPbancTtl?: string;
  recrutPblntSn?: number | string;
  recrumtSeNm?: string;
  srcUrl?: string;
  workRgnNmLst?: string;
  workRgnNms?: string;
};

type PublicApiResponse = {
  result?: PublicJobRaw[];
  resultCode?: string;
  resultMsg?: string;
};

export function transformPublicJobToPosting(raw: PublicJobRaw): JobPosting | null {
  const sourceId = String(raw.recrutPblntSn || '').trim();
  const rawTitle = String(raw.recrutPbancTtl || raw.pbancNm || '').trim();
  if (!sourceId || !rawTitle) return null;
  const rawCompany = (raw.instNm || '공공기관').trim();
  const { companyName, title } = normalizeCompanyAndTitle(rawCompany, rawTitle);
  const industry = (raw.ncsCdNmLst || raw.ncsCdNms || raw.nonNcsCdNms || '공공행정/경영').trim();
  const location = (raw.workRgnNmLst || raw.workRgnNms || '전국').trim();
  const sourceUrl = (raw.srcUrl || 'https://job.alio.go.kr').trim();
  const deadline = normalizePublicDate(raw.pbancEndYmd) || '채용 시 마감';
  const registeredAt = normalizePublicDate(raw.pbancBgngYmd) || '최근 등록';

  const occupationClassification = classifyOccupationCategoryFromJobText(
    title,
    `${industry} ${raw.pbancCn || ''}`,
  );
  const occupationCategory = occupationClassification.isConfident
    ? occupationClassification.category
    : undefined;
  const category: ProjectCategory = occupationCategory
    ? occupationToProjectCategory[occupationCategory] || 'operations'
    : 'operations';
  const categoryName = occupationCategory
    ? occupationCategoryLabels[occupationCategory]
    : '직무 확인 필요';

  const empTypeRaw = raw.hireTypeNmLst || raw.recrumtSeNm || '';
  const employmentType: EmploymentType = detectEmploymentTypeFromJobText(title, `${industry} ${empTypeRaw}`);
  const workType = detectWorkTypeFromJobText(title, `${industry} ${location}`);

  const indStr = industry && industry !== '공공행정/경영' ? `[${industry}] ` : '';
  const problemStatement = `${indStr}${companyName}의 '${title}' 주요 프로젝트: 공공 서비스 표준 규정 준수 및 사업 수행 파이프라인을 정립하고, 전문 인재의 리더십을 통해 기관 과제 목표를 완수하는 핵심 프로젝트입니다.`;
  const projectGoal = `${companyName} 공공 프로젝트 추진 및 ${categoryName} 분야 전문성 발휘`;

  return {
    id: `PUBLIC-${sourceId}`,
    companyName,
    industry,
    companySize: '공공기관/공기업',
    title,
    category,
    occupationCategory,
    occupationClassificationConfidence: occupationClassification.confidence,
    occupationClassificationMargin: occupationClassification.margin,
    occupationClassificationStatus: occupationCategory ? 'classified' : 'ambiguous',
    seniority: 'senior',
    employmentType,
    hiringStage: 'open',
    workType,
    location,
    experienceYears: '경력 우대',
    salaryRange: '공공기관 호봉/내규 기준',
    deadline,
    projectDuration: '장기 (정규/계약)',
    collaborationTargets: ['공공기관 사업 담당자', '부서 실무진'],
    coreResponsibilities: [
      `${title} 직무 수행 및 사업 관련 총괄`,
      `공공 표준 규정 준수 및 전문 과제 수행`,
      `부서 주요 목표 달성 및 대외 기관 협력`,
    ],
    qualifications: [
      `해당 직무 관련 전문 경력자 우대`,
      `공공기관 채용 결격사유가 없는 자`,
      `원활한 기획 및 문서 작성 능력 보유자`,
    ],
    benefits: ['4대 보험 적용', '주 5일 근무', '공공기관 복리후생'],
    problemStatement,
    projectGoal,
    successMetrics: ['사업 목표 달성률 100%', '기관 평가 우수'],
    requiredSkills: [industry, categoryName, '공공사업 관리'],
    preferredSkills: ['공공기관/지자체 사업 경험자', '관련 자격증 보유자'],
    matchingSignals: ['이어잡 검증 공고', categoryName, location],
    recommendedTalentType: `${categoryName} 전문 실무 프로젝트 인재`,
    matchingScoreCriteria: ['직무 연관성', '실무 경험', '근무지 적합도'],
    interviewFocus: ['직무 수행 능력 및 성과', '협업 태도'],
    seniorFitScore: 94,
    postedAt: registeredAt,
    source: 'public',
    sourceUrl,
    sourceProvider: '이어잡 공식 검증',
    workSchedule: '주 5일 근무 (09:00~18:00)',
    deadlineLabel: deadline,
    registeredLabel: registeredAt,
  };
}

function normalizePublicDate(value?: string) {
  if (!value) return '';
  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : value;
}

export async function fetchPublicJobFeed(): Promise<JobPosting[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PUBLIC_REQUEST_TIMEOUT_MS);

  try {
    const proxyUrl = `${PUBLIC_JOB_PROXY_ENDPOINT}?authKey=${encodeURIComponent(PUBLIC_JOB_API_KEY)}&numOfRows=500&_v=max`;
    const response = await fetch(proxyUrl, { signal: controller.signal });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as PublicApiResponse;
    const rows: PublicJobRaw[] = data.result || [];

    return rows
      .map((raw) => transformPublicJobToPosting(raw))
      .filter((posting): posting is JobPosting => posting !== null);
  } catch (error) {
    console.warn('Public Job API fetch skipped/failed, fallback gracefully:', error);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

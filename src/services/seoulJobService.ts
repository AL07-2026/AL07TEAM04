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

const SEOUL_JOB_PROXY_ENDPOINT = '/api/seoul/jobs';
const SEOUL_REQUEST_TIMEOUT_MS = 6_000;

export const SEOUL_JOB_API_KEY =
  (import.meta.env.VITE_SEOUL_JOB_API_KEY as string | undefined)?.trim() ??
  (import.meta.env.SEOUL_JOB_API_KEY as string | undefined)?.trim() ??
  'sample';

export type SeoulJobRaw = {
  ACDMCR_NM?: string;
  BSNS_SUMRY_CN?: string;
  CAREER_CND_NM?: string;
  CMPNY_NM?: string;
  DTL_NTRCN_NTCE_URL?: string;
  DTY_CN?: string;
  EMPLYM_STLE_CMMN_MM?: string;
  GUI_LN?: string;
  HOPE_WAGE?: string;
  JOBCODE?: string;
  JOBCODE_NM?: string;
  JO_REG_NO?: string;
  JO_REGIST_NO?: string;
  JO_REG_DT?: string;
  JO_REQST_NO?: string;
  JO_SJ?: string;
  RCEPT_CLOS_NM?: string;
  WORK_PARAR_BASS_ADRES_CN?: string;
  WORK_TIME_NM?: string;
};

type SeoulApiResponse = {
  GetJobInfo?: { row?: SeoulJobRaw[] };
  GetSeniorJobInfo?: { row?: SeoulJobRaw[] };
};

export function transformSeoulJobToPosting(raw: SeoulJobRaw): JobPosting | null {
  const sourceId = String(raw.JO_REQST_NO || raw.JO_REGIST_NO || raw.JO_REG_NO || '').trim();
  const rawTitle = String(raw.JO_SJ || '').trim();
  if (!sourceId || !rawTitle) return null;
  const rawCompany = (raw.CMPNY_NM || '서울시 협력 기업').trim();
  const { companyName, title } = normalizeCompanyAndTitle(rawCompany, rawTitle);
  const industry = (raw.JOBCODE_NM || '경영/일반').trim();
  const location = (raw.WORK_PARAR_BASS_ADRES_CN || '서울특별시').trim();
  const workSchedule = (raw.WORK_TIME_NM || '주 5일 근무').trim();
  const salaryRange = (raw.HOPE_WAGE || '회사 내규에 따름').trim();
  const deadlineLabel = (raw.RCEPT_CLOS_NM || '채용 시 마감').trim();
  const sourceUrl = (raw.GUI_LN || raw.DTL_NTRCN_NTCE_URL || 'https://job.seoul.go.kr').trim();

  const occupationClassification = classifyOccupationCategoryFromJobText(
    title,
    `${industry} ${raw.DTY_CN || ''}`,
    raw.JOBCODE,
    industry,
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

  const empTypeRaw = raw.EMPLYM_STLE_CMMN_MM || '';
  const employmentType: EmploymentType = detectEmploymentTypeFromJobText(title, `${industry} ${empTypeRaw}`);
  const workType = detectWorkTypeFromJobText(title, `${industry} ${location}`);

  const problemStatement = `[서울시 일자리 분석] ${companyName}의 ${title} 프로젝트 해결을 위한 전문 인재 채용입니다.`;
  const projectGoal = `${industry} 분야 업무 프로세스 고도화 및 ${categoryName} 실무 과제 해결`;

  return {
    id: `SEOUL-${sourceId}`,
    companyName,
    industry,
    companySize: '중소/중견기업',
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
    experienceYears: raw.CAREER_CND_NM?.trim() || '경력 정보 미제공',
    salaryRange,
    deadline: deadlineLabel,
    projectDuration: '장기 (정규/계약)',
    collaborationTargets: ['부서 실무진', '사업 담당자'],
    coreResponsibilities: [
      raw.DTY_CN?.trim() || `${title} 직무 수행 및 업무 총괄`,
      `${industry} 전문 업무 처리 및 실무 가이드 준수`,
      `주요 과제 해결 및 부서 내 성과 창출`,
    ],
    qualifications: [
      raw.ACDMCR_NM?.trim() || `관련 분야 경력 보유자 우대`,
      `서울시 및 수도권 출퇴근 가능자`,
      `책임감 있고 원활한 커뮤니케이션 능력 보유자`,
    ],
    benefits: ['4대 보험 적용', '퇴직금', workSchedule],
    problemStatement,
    projectGoal,
    successMetrics: ['업무 목표 달성률 95% 이상', '프로세스 효율화 실현'],
    requiredSkills: [industry, categoryName, '업무 수행력'],
    preferredSkills: ['시니어 경력 우대', '관련 자격증 보유자'],
    matchingSignals: ['서울시 공식 공고', categoryName, location],
    recommendedTalentType: `${categoryName} 전문 실무/경영 인재`,
    matchingScoreCriteria: ['직무 연관성', '근무지 적합도', '경력 보유 여부'],
    interviewFocus: ['관련 실무 경험 및 주요 성과', '팀 내 협업 및 커뮤니케이션'],
    seniorFitScore: 92,
    postedAt: raw.JO_REG_DT?.trim() || '최근 등록',
    source: 'seoul',
    sourceUrl,
    sourceProvider: '서울 열린데이터 광장 (서울시 일자리 API)',
    workSchedule,
    deadlineLabel,
    registeredLabel: raw.JO_REG_DT?.trim() || '서울시 공식 연동',
  };
}

export async function fetchSeoulJobFeed(): Promise<JobPosting[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEOUL_REQUEST_TIMEOUT_MS);

  try {
    const proxyUrl = `${SEOUL_JOB_PROXY_ENDPOINT}?authKey=${encodeURIComponent(SEOUL_JOB_API_KEY)}&startIndex=1&endIndex=1000&_v=max`;
    let response = await fetch(proxyUrl, { signal: controller.signal });

    if (!response.ok) {
      const directUrl = `http://openapi.seoul.go.kr:8088/${encodeURIComponent(SEOUL_JOB_API_KEY)}/json/GetJobInfo/1/1000/`;
      response = await fetch(directUrl, { signal: controller.signal });
    }

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as SeoulApiResponse;
    const rows: SeoulJobRaw[] = data.GetJobInfo?.row || data.GetSeniorJobInfo?.row || [];

    return rows
      .map((raw) => transformSeoulJobToPosting(raw))
      .filter((posting): posting is JobPosting => posting !== null);
  } catch (error) {
    console.warn('Seoul Job API fetch skipped/failed, fallback gracefully:', error);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

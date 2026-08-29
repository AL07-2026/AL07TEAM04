import type { JobPosting } from '@/data/jobPostings';
import { occupationCategoryLabels } from '@/data/occupationCategories';
import { extractCleanPositionTitle, formatSimpleLocation, formatSimpleSalary } from '@/services/dataSyncService';
import { getPostingOccupationCategory } from '@/services/recommendationEngine';

export type AIAnalyzedJobDetail = {
  // 1. AI 핵심 요약 & 채용 배경
  aiExecutiveSummary: {
    overview: string;
    keyChallenge: string;
    expectedImpact: string;
  };
  // 2. 기업이 원하는 인재유형 (경험 측면 심층 분석)
  talentPersona: {
    headline: string;
    experienceHighlights: string[];
    competencyTags: string[];
    interviewPrepFocus: string[];
  };
  // 3. 구직자가 꼭 알아야 할 핵심 직무 조건
  keyJobFacts: {
    roleTitle: string;
    workTypeLabel: string;
    salaryLabel: string;
    experienceRequired: string;
    locationLabel: string;
    employmentTypeLabel: string;
    deadlineLabel: string;
    sourceOrganization: string;
  };
  // 4. 주요 업무 태스크
  structuredDuties: string[];
  // 5. 자격 요건 및 복지/우대조건
  qualifications: string[];
  benefits: string[];
};

/**
 * Intelligent domain heuristic map for inferring experience highlights, competencies,
 * and duties when public/worknet postings have minimal or unstructured raw descriptions.
 */
const OCCUPATION_INFERENCE_MAP: Record<
  string,
  {
    defaultPersona: string;
    experienceHighlights: string[];
    competencies: string[];
    typicalDuties: string[];
    interviewFocus: string[];
  }
> = {
  'hr-recruiting': {
    defaultPersona: '10년 이상 인사/조직 전략 및 평가·보상 체계 수립을 총괄한 시니어 전문가',
    experienceHighlights: [
      '조직 성장 단계에 맞춘 인사/노무 제도 수립 및 평가 체계 개선 경험',
      '노사 및 경영진-구성원 간 갈등 진단과 조직문화 혁신 리딩',
      '시니어 및 핵심 인재 채용·육성 프로세스 구축 경험',
    ],
    competencies: ['인사 전략', '조직문화 혁신', '평가·보상 체계', '노무 관리', '임원 코칭'],
    typicalDuties: [
      '조직 진단 및 인사평가/보상 체계 개편안 수립',
      '조직 유연성 향상 및 시니어 인력 활용 가이드라인 마련',
      '경영진 및 실무진 소통을 통한 제도 안착 지원',
    ],
    interviewFocus: [
      '과거 유사 조직의 평가/인사 제도 개편 시 갈등 조율 경험',
      '실제 보상 연계 및 구성원 수용성 향상 성공 사례',
    ],
  },
  'planning-strategy': {
    defaultPersona: '10~15년 이상 사업 기획 및 신사업 런칭·프로세스 표준화를 주도한 시니어 전략가',
    experienceHighlights: [
      '중장기 사업 전략 수립 및 사업 타당성 검토 총괄 경험',
      '신규 프로젝트 PM 리딩 및 크로스 펑셔널 협업 체계 구축',
      '실행 가능한 KPI 지표 설계 및 리스크 관리 역량',
    ],
    competencies: ['사업 기획', '신사업 런칭', '전략 수립', 'KPI 관리', '프로세스 표준화'],
    typicalDuties: [
      '사업 목표 정의 및 실행 로드맵 수립',
      '핵심 비즈니스 모델(BM) 분석 및 운영 프로세스 최적화',
      '주요 이해관계자 커뮤니케이션 및 성과 관리',
    ],
    interviewFocus: [
      '신사업 기획 또는 운영 효율화 프로젝트 성공 사례',
      '예상치 못한 비즈니스 리스크를 극복한 구체적 접근 방식',
    ],
  },
  'finance-accounting': {
    defaultPersona: '10년 이상 재무 회계 총괄 및 결산·세무·자금 운용을 리드한 시니어 관리자',
    experienceHighlights: [
      '정기 결산, 세무 신고 및 회계 감사 대응 총괄 경험',
      '재무 건전성 분석 및 현금 흐름 최적화 관리',
      '경영진 의사결정을 위한 재무 리포팅 및 지표 관리',
    ],
    competencies: ['재무 전략', '회계 결산', '세무 리스크 관리', '자금 운용', '원가 절감'],
    typicalDuties: [
      '월/분기/연간 결산 검토 및 재무제표 작성 총괄',
      '세무 이슈 사전 진단 및 절세/규제 준수 체계 수립',
      '재무 데이터 기반 경영 지표 분석 및 자금 계획 수립',
    ],
    interviewFocus: [
      '세무 조사 대응 또는 회계 리스크 개선 경험',
      '자금 운용 효율화 및 비용 절감 달성 사례',
    ],
  },
  'marketing-sales': {
    defaultPersona: '10년 이상 마케팅/영업 채널 확장 및 매출 성장을 견인한 시니어 리더',
    experienceHighlights: [
      'B2B/B2C 영업 파이프라인 구축 및 대형 고객사 딜 클로징 경험',
      '브랜드 포지셔닝 및 퍼포먼스 마케팅 전략 수립',
      '영업 조직 코칭 및 매출 목표 초과 달성 레퍼런스',
    ],
    competencies: ['영업 전략', 'B2B 세일즈', '브랜드 마케팅', '고객 관계 관리(CRM)', '채널 제휴'],
    typicalDuties: [
      '타깃 시장 분석 및 신규 영업 기회 발굴',
      '핵심 파트너십 구축 및 세일즈 제안서 작성/협상',
      '마케팅 캠페인 기획 및 성과 분석 리포팅',
    ],
    interviewFocus: [
      '정체된 매출 파이프라인을 뚫어낸 세일즈 돌파 사례',
      '신규 고객 확보 및 계약 성사 시 발휘한 협상 노하우',
    ],
  },
  'dev-engineering': {
    defaultPersona: '10년 이상 소프트웨어 아키텍처 설계 및 기술 리딩을 수행한 시니어 엔지니어',
    experienceHighlights: [
      '대규모 트래픽 처리 및 확장 가능한 백엔드/프론트엔드 시스템 아키텍처 설계',
      '레거시 시스템 마이그레이션 및 성능 병목 현상 개선',
      '주니어/미들 개발자 코드 리뷰 및 기술 멘토링 경험',
    ],
    competencies: ['시스템 아키텍처', '클라우드 인프라', '성능 최적화', '코드 리뷰', '기술 리딩'],
    typicalDuties: [
      '핵심 서비스 모듈 설계 및 안정적인 API 개발',
      '기술 부채 해결 및 시스템 가용성(SLA) 개선',
      '개발 표준 가이드라인 수립 및 팀 테크 멘토링',
    ],
    interviewFocus: [
      '복잡한 장애 상황이나 기술적 난제를 해결한 아키텍처 개선 사례',
      '팀의 개발 생산성을 향상시킨 협업 및 멘토링 경험',
    ],
  },
  'design-ux': {
    defaultPersona: '10년 이상 사용자 경험(UX) 고도화 및 디자인 시스템을 구축한 시니어 디렉터',
    experienceHighlights: [
      '사용자 리서치 기반 직관적인 UX/UI 설계 및 전환율 개선',
      '전사 디자인 시스템 구축 및 개발팀과의 효율적 협업',
      '브랜드 비주얼 가이드라인 수립 및 일관성 관리',
    ],
    competencies: ['UX 리서치', 'UI 디자인', '디자인 시스템', '프로토타이핑', '사용자 경험 최적화'],
    typicalDuties: [
      '사용자 여정 분석 및 주요 인터랙션 UI 설계',
      '컴포넌트 기반 디자인 시스템 체계화 및 가이드 배포',
      '기획/개발팀과의 UX 개선 협업 및 사용성 검증',
    ],
    interviewFocus: [
      '정량적 지표(전환율/이탈률)를 개선한 UX 리디자인 성공 사례',
      '디자인 시스템 구축을 통한 협업 효율 증대 경험',
    ],
  },
};

const DEFAULT_GENERAL_INFERENCE = {
  defaultPersona: '10년 이상의 풍부한 현장 실무 경험과 문제 해결 노하우를 갖춘 시니어 전문가',
  experienceHighlights: [
    '해당 직무 영역 10년 이상의 실무 총괄 및 프로젝트 리딩 경험',
    '예상치 못한 현장 이슈 발생 시 유연한 문제 해결 및 대안 제시 역량',
    '동료 및 협력사와의 원활한 소통과 신뢰 기반 협업 능력',
  ],
  competencies: ['실무 총괄', '문제 해결', '프로세스 개선', '협업 소통', '성과 관리'],
  typicalDuties: [
    '직무 핵심 과제 수행 및 실무 프로세스 점검',
    '현장 운영 효율화 및 실행 가이드라인 수립',
    '팀원 및 유관 부서와의 협업을 통한 목표 달성',
  ],
  interviewFocus: [
    '직무 관련 가장 큰 성과를 거두었던 실제 업무 경험',
    '어려운 협업 상황에서 소통을 통해 문제를 해결한 사례',
  ],
};

/**
 * Parses, infers, and structures any job posting into an executive AI analysis view.
 * Guarantees zero empty blocks or generic error texts for all edge cases.
 */
export function analyzeJobPostingForDetail(posting: JobPosting): AIAnalyzedJobDetail {
  const cleanTitle = extractCleanPositionTitle(posting.title, posting.companyName);
  const occupationKey = getPostingOccupationCategory(posting);
  const occupationLabel = occupationCategoryLabels[occupationKey] || posting.industry || '전문 직무';
  const inference = OCCUPATION_INFERENCE_MAP[occupationKey] || DEFAULT_GENERAL_INFERENCE;

  // 1. Extract or infer structured duties
  let structuredDuties: string[] = [];
  if (posting.coreResponsibilities && posting.coreResponsibilities.length > 0) {
    structuredDuties = posting.coreResponsibilities
      .flatMap((r) => r.split(/\r?\n|•|·|-/))
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
  }
  if (structuredDuties.length === 0) {
    if (posting.problemStatement && posting.problemStatement.length > 10) {
      structuredDuties.push(posting.problemStatement);
    }
    if (posting.projectGoal && posting.projectGoal.length > 10 && posting.projectGoal !== posting.problemStatement) {
      structuredDuties.push(posting.projectGoal);
    }
  }
  if (structuredDuties.length === 0) {
    structuredDuties = [...inference.typicalDuties];
  }

  // 2. Build AI 3-Line Executive Summary
  const overview =
    posting.problemStatement && posting.problemStatement.length > 15
      ? posting.problemStatement
      : `[${posting.companyName}]에서 ${occupationLabel} 영역의 전문성을 바탕으로 핵심 과제를 완수할 시니어 인재를 영입합니다.`;

  const keyChallenge =
    posting.projectGoal && posting.projectGoal.length > 10
      ? posting.projectGoal
      : `${cleanTitle} 역할을 통해 현업 프로세스를 고도화하고 실질적인 성과를 창출하는 것이 주요 목표입니다.`;

  const expectedImpact =
    posting.successMetrics && posting.successMetrics.length > 0
      ? posting.successMetrics.join(' · ')
      : `시니어의 풍부한 실무 노하우를 바탕으로 ${occupationLabel} 분야의 업무 효율성과 실행 완성도를 극대화합니다.`;

  // 3. Build Talent Persona
  const headline =
    posting.recommendedTalentType && posting.recommendedTalentType.length > 8
      ? posting.recommendedTalentType
      : `${posting.experienceYears || '10년 이상'} ${occupationLabel} 실무 및 총괄 리딩 경험을 보유한 시니어 전문가`;

  const experienceHighlights: string[] = [];
  if (posting.qualifications && posting.qualifications.length > 0) {
    experienceHighlights.push(...posting.qualifications.slice(0, 3));
  }
  if (posting.matchingSignals && posting.matchingSignals.length > 0) {
    posting.matchingSignals.forEach((sig) => {
      if (experienceHighlights.length < 3 && !experienceHighlights.includes(sig)) {
        experienceHighlights.push(sig);
      }
    });
  }
  while (experienceHighlights.length < 3) {
    const fallbackExp = inference.experienceHighlights[experienceHighlights.length] || DEFAULT_GENERAL_INFERENCE.experienceHighlights[0]!;
    if (!experienceHighlights.includes(fallbackExp)) {
      experienceHighlights.push(fallbackExp);
    }
  }

  const competencyTags: string[] = [];
  if (posting.requiredSkills && posting.requiredSkills.length > 0) {
    competencyTags.push(...posting.requiredSkills);
  }
  if (posting.preferredSkills && posting.preferredSkills.length > 0) {
    competencyTags.push(...posting.preferredSkills);
  }
  inference.competencies.forEach((comp) => {
    if (competencyTags.length < 6 && !competencyTags.includes(comp)) {
      competencyTags.push(comp);
    }
  });

  const interviewPrepFocus: string[] = [];
  if (posting.interviewFocus && posting.interviewFocus.length > 0) {
    interviewPrepFocus.push(...posting.interviewFocus);
  } else {
    interviewPrepFocus.push(...inference.interviewFocus);
  }

  // 4. Clean Key Job Facts
  const workTypeLabel =
    posting.workType === 'remote'
      ? '재택·원격 근무 (전국 가능)'
      : posting.workType === 'hybrid'
        ? '하이브리드 (재택+출근 병행)'
        : '오피스 현장 상주';

  const employmentTypeLabel =
    posting.employmentType === 'part-time'
      ? '시간제·파트타임 (유연 근무)'
      : posting.employmentType === 'contract'
        ? '계약직·기간제'
        : posting.employmentType === 'project'
          ? '프로젝트·자문 계약'
          : '정규직';

  const sourceOrganization =
    posting.source === 'worknet'
      ? '고용노동부 워크넷 공식 검증'
      : posting.source === 'seoul'
        ? '서울시 일자리포털 공식 연동'
        : posting.source === 'public'
          ? '공공 채용 포털 검증'
          : '이어잡 공식 등록 기업';

  const deadlineLabel = posting.deadline
    ? `${posting.deadline} (마감 예정)`
    : posting.deadlineLabel || '채용 시 마감';

  // 5. Qualifications & Benefits
  const qualifications: string[] = [];
  if (posting.qualifications && posting.qualifications.length > 0) {
    qualifications.push(...posting.qualifications);
  } else {
    qualifications.push(
      `${posting.experienceYears || '관련 분야 10년 이상'} 실무 경험 보유자`,
      `${occupationLabel} 관련 프로젝트를 주도적으로 수행한 경험`,
      '원활한 커뮤니케이션 및 문제 해결 능력을 갖춘 분',
    );
  }

  const benefits: string[] = [];
  if (posting.benefits && posting.benefits.length > 0) {
    benefits.push(...posting.benefits);
  } else {
    benefits.push(
      posting.workSchedule || '유연한 근무 시간 및 근무 형태 협의 가능',
      '시니어 전문성에 맞춘 합리적 보수 지급',
      '자율적이고 수평적인 프로젝트 협업 환경',
    );
  }

  return {
    aiExecutiveSummary: {
      overview,
      keyChallenge,
      expectedImpact,
    },
    talentPersona: {
      headline,
      experienceHighlights,
      competencyTags: competencyTags.slice(0, 6),
      interviewPrepFocus,
    },
    keyJobFacts: {
      roleTitle: cleanTitle,
      workTypeLabel,
      salaryLabel: formatSimpleSalary(posting.salaryRange),
      experienceRequired: posting.experienceYears || '10년 이상 시니어 경력',
      locationLabel: formatSimpleLocation(posting.location),
      employmentTypeLabel,
      deadlineLabel,
      sourceOrganization,
    },
    structuredDuties,
    qualifications,
    benefits,
  };
}

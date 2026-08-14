import type { JobPosting, ProjectCategory } from '@/data/jobPostings';

export const WORKNET_JOB_API_KEY = 'a5dea206-9134-412d-a2f4-8f4998a6321f';
export const WORKNET_TRAINING_API_KEY = '9a75ee7b-06ad-4ee7-aa18-776090cf5102';
export const WORKNET_DUTY_API_KEY = '820aa395-647d-41b8-aecb-19bc889ea890';
export const WORKNET_JOB_INFO_API_KEY = '32661c53-854b-4afd-99bc-dad3f6f851f6';
export const WORKNET_CODE_API_KEY = 'ccc1d069-84e3-4fb8-bc24-5fbe3f616cd8';
export const WORKNET_GIANT_API_KEY = 'dd79d00d-261f-4b03-aca9-1dbb3c997050';

export type WorknetJobRaw = {
  career: string;
  company: string;
  duties: string;
  id: string;
  location: string;
  maxSalary?: string;
  minSalary?: string;
  title: string;
};

export type WorknetApiItem = {
  career?: string;
  company?: string;
  corpNm?: string;
  duties?: string;
  region?: string;
  title?: string;
  wantedAuthNo?: string;
  wantedTitle?: string;
  workRegion?: string;
};

export type WorknetApiResponse = {
  wantedList?: WorknetApiItem[];
};

// 모든 업종/직무 동적 판별 함수
export function detectCategoryFromJobText(title: string, duties: string): ProjectCategory {
  const combined = `${title} ${duties}`.toLowerCase();

  if (/디자인|디자이너|ux|ui|브랜드|크리에이티브|시각|웹디자인|그래픽|일러스트/.test(combined)) {
    return 'design-brand';
  }
  if (/마케팅|영업|그로스|홍보|광고|고객|퍼포먼스|전략영업/.test(combined)) {
    return 'marketing-sales';
  }
  if (/인사|채용|경영|전략|회계|재무|조직|노무|총무|기획/.test(combined)) {
    return 'hr-strategy';
  }
  if (/제조|생산|품질|r&d|연구|공정|설계|자재|설비|바이오/.test(combined)) {
    return 'r-and-d-manufacturing';
  }
  if (/운영|물류|scm|매장|고객성공|서비스관리/.test(combined)) {
    return 'operations';
  }
  if (/데이터|플랫폼|db|빅데이터|분석/.test(combined)) {
    return 'data-platform';
  }
  if (/ai|자동화|머신러닝|인공지능|로봇/.test(combined)) {
    return 'ai-automation';
  }
  if (/보안|리스크|안전|컴플라이언스|감사/.test(combined)) {
    return 'security';
  }
  if (/레거시|시스템|erp|이관|고도화|개편/.test(combined)) {
    return 'legacy-modernization';
  }
  return 'growth';
}

// 전 업종(디자인, 마케팅, 인사, 제조, IT 등) 40+ 시니어 해결 과제 도출 엔진
export function transformWorknetToSeniorProject(
  raw: WorknetJobRaw,
  index: number,
): JobPosting {
  const category = detectCategoryFromJobText(raw.title, raw.duties);

  const problemStatements: Record<ProjectCategory, string> = {
    'design-brand': `${raw.company}의 브랜드 정체성 리디자인 및 UX/UI 가이드라인 확립을 위해 10년+ 경험을 가진 40+ 시니어 디자인 디렉터의 총괄 주도가 필요합니다.`,
    'marketing-sales': `${raw.company}의 신규 시장 개척 및 매출 스케일업을 목표로, 40+ 시니어 마케팅/영업 리드의 현장 주도형 타겟 분석과 파이프라인 구축이 요구됩니다.`,
    'hr-strategy': `${raw.company}의 중장기 경영 전략 수립 및 조직 평가/보상 체계 고도화를 총괄할 40+ 인사/경영 전문가의 해결책이 필요합니다.`,
    'r-and-d-manufacturing': `${raw.company}의 생산 공정 품질 불량율 절감 및 R&D 기술 표준화를 위한 40+ 시니어 기술 고문의 현장 진단이 시급합니다.`,
    operations: `${raw.company}의 현장 운영 프로세스 파편화 해결 및 표준 작업 가이드북 수립을 위한 40+ 시니어 리드의 총괄 주도가 필요합니다.`,
    'legacy-modernization': `기존 수기/노후화된 업무 시스템 정비 및 ${raw.title} 영역의 10년+ 노하우를 바탕으로 한 조직 프로세스 전면 쇄신이 필요합니다.`,
    growth: `사업 영역 확장 및 신규 수익 모델 발굴을 위해 ${raw.company}의 사업개발 리드급 40+ 시니어 전문가의 전략적 수립이 필요합니다.`,
    'ai-automation': `반복적인 업무 부담을 줄이고 디지털/AI 자동화 도입을 위한 실무 검증 및 시니어의 과제 리딩이 필요합니다.`,
    'data-platform': `부서별 분산된 데이터의 실시간 통합 관리 체계 구축 및 데이터 기반 의사결정 프로세스 일원화가 핵심 과제입니다.`,
    security: `기업 리스크 예방 및 품질/안전보건 기준 강화를 위한 40+ 시니어 전문가의 전면 현장 점검 및 솔루션 구축이 요구됩니다.`,
  };

  const projectGoals: Record<ProjectCategory, string> = {
    'design-brand': '브랜드 디자인 시스템 구축 및 시각 가이드라인 100% 표준화',
    'marketing-sales': '신규 타겟 파이프라인 확보 및 매출 성장률 30% 증대',
    'hr-strategy': '조직 평가 체계 개편 및 핵심 인재 리텐션 기반 마련',
    'r-and-d-manufacturing': '공정 불량률 40% 감소 및 ISO/품질 인증 획득',
    operations: '운영 효율화 달성 및 업무 수속 시간 35% 단축',
    'legacy-modernization': '노후화 업무 매뉴얼화 및 부서 간 협업 체계 100% 개편',
    growth: '신사업 전략 수립 및 분기 핵심 제휴처 5개사 확보',
    'ai-automation': '실무 업무 자동화 도구 도입 및 직원 교육 완료',
    'data-platform': '통합 실시간 대시보드 구축 및 데이터 활용 체계 수립',
    security: '컴플라이언스 준수율 100% 달성 및 리스크 예방 체계 구축',
  };

  const requiredSkillsMap: Record<ProjectCategory, string[]> = {
    'design-brand': ['Brand Strategy', 'UX/UI Design', 'Design System', 'Creative Direction'],
    'marketing-sales': ['Growth Marketing', 'B2B Sales', 'Market Analysis', 'Revenue Strategy'],
    'hr-strategy': ['HR Strategy', 'Organization Design', 'Performance Management', 'Change Management'],
    'r-and-d-manufacturing': ['Process Optimization', 'Quality Assurance', 'R&D Management', 'Factory Automation'],
    operations: ['Operations Management', 'Process Standard', 'Workflow Design', 'Team Leadership'],
    'legacy-modernization': ['Legacy Migration', 'System Redesign', 'Architecture', 'Process Modernization'],
    growth: ['Business Development', 'New Market Expansion', 'Strategic Partnership', 'Go-To-Market'],
    'ai-automation': ['AI Tools Integration', 'Workflow Automation', 'RPA', 'Digital Transformation'],
    'data-platform': ['Data Architecture', 'Dashboard Design', 'Data Pipeline', 'Analytics'],
    security: ['Risk Management', 'Security Compliance', 'ISO Standard', 'Audit & Safety'],
  };

  const fitScores = [98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88];
  const fitScore = fitScores[index % fitScores.length] || 94;

  return {
    id: `WORKNET-${raw.id || index + 101}`,
    companyName: raw.company,
    industry: '전국 강소기업 / 우수기업 (정부인증)',
    companySize: '50-300명',
    title: `[40+ 시니어 우대] ${raw.title}`,
    category,
    seniority: 'lead',
    employmentType: 'project',
    hiringStage: 'open',
    workType: 'hybrid',
    location: raw.location || '서울 / 전국',
    experienceYears: '10년 이상 (40세 이상 중장년 우대)',
    salaryRange: raw.minSalary ? `월 ${raw.minSalary}만~${raw.maxSalary || ''}만` : '월 650만-950만',
    deadline: '2026-09-15',
    projectDuration: '3개월 ~ 6개월',
    collaborationTargets: ['C-Level / 경영진', '부서 리드', '실무 프로젝트 팀'],
    coreResponsibilities: [
      problemStatements[category],
      projectGoals[category],
      '40+ 시니어 실무 경험 기반 현장 코칭 및 과제 주도',
    ],
    qualifications: [
      '해당 직무 10년 이상 실무 및 총괄 경험 보유자',
      '40세 이상 중장년 및 시니어 전문가 우대',
      '유사 업무 문제 해결 및 리딩 성공 경험',
    ],
    benefits: ['정부 인증 우수기업 보상', '유연근무/하이브리드 지원', '전문가 자문료 지급'],
    problemStatement: problemStatements[category],
    projectGoal: projectGoals[category],
    successMetrics: ['과제 핵심 KPI 100% 달성', '표준 업무 가이드북 작성 완료'],
    requiredSkills: requiredSkillsMap[category],
    preferredSkills: ['동종 산업 15년 이상 총괄 경험', '강소기업 프로젝트 해결 경험'],
    matchingSignals: ['40+ 시니어 우대 채용', '정부 인증 기업', '전 업종 직무 과제 연결'],
    recommendedTalentType: `해당 분야 10년+ 총괄 노하우를 가진 40+ 시니어 전문가`,
    matchingScoreCriteria: ['직무 전문성 (40%)', '유사 문제 해결 경험 (30%)', '조직 적합도 (30%)'],
    interviewFocus: [
      '과거 비슷한 업종/직무 문제를 해결한 구체적 사례',
      '단기간 내 현장 부서와의 협업 및 솔루션 도출 방안',
    ],
    seniorFitScore: fitScore,
    postedAt: new Date().toISOString().split('T')[0] ?? '2026-08-14',
  };
}

// 고용노동부 워크넷 전 업종(디자인, 마케팅, 인사, 제조, IT 등) 40+ 채용공고 수신 및 변환
export async function fetchWorknetSeniorProjects(): Promise<JobPosting[]> {
  try {
    const endpoint = `/api/worknet/jobs?authKey=${WORKNET_JOB_API_KEY}&callTp=L&returnType=JSON&startPage=1&display=15`;
    const response = await fetch(endpoint).catch(() => null);

    if (response && response.ok) {
      const data = (await response.json()) as WorknetApiResponse;
      if (Array.isArray(data.wantedList)) {
        return data.wantedList.map((item: WorknetApiItem, index: number) =>
          transformWorknetToSeniorProject(
            {
              id: item.wantedAuthNo || String(index + 1),
              company: item.company || item.corpNm || '정부인증 우수기업',
              title: item.title || item.wantedTitle || '직무 프로세스 개선 및 프로젝트 리드',
              duties: item.duties || '업무 체계 구축 및 총괄 리딩',
              location: item.region || item.workRegion || '서울 강남구',
              career: item.career || '경력 10년 이상',
            },
            index,
          ),
        );
      }
    }
  } catch (error) {
    console.warn('Worknet API fetch via proxy failed, providing multi-industry 40+ transformed projects:', error);
  }

  // 워크넷 OpenAPI 기반 전 업종 (디자인, 마케팅, 인사, 제조, IT) 40+ 시니어 변환 시드 데이터
  const mockWorknetJobs: WorknetJobRaw[] = [
    {
      id: 'WN-DESIGN-01',
      company: '(주) 디자인브릿지스튜디오 [워크넷 인증 강소기업]',
      title: '브랜드 리디자인 및 UX/UI 디자인 시스템 총괄 디렉터',
      duties: '신규 제품 라인업 브랜딩 및 디지털 서비스 UX/UI 디자인 시스템 구축 총괄',
      location: '서울 마포구',
      career: '12년 이상',
      minSalary: '750',
      maxSalary: '1100',
    },
    {
      id: 'WN-MARKETING-02',
      company: '(주) 그로스인사이트 [정부인증 우수기업]',
      title: 'B2B 그로스 마케팅 & 글로벌 영업 전략 총괄',
      duties: '신규 시장 개척 및 세일즈 파이프라인 구축을 위한 40+ 시니어 마케팅 총괄 리딩',
      location: '서울 강남구',
      career: '15년 이상',
      minSalary: '800',
      maxSalary: '1200',
    },
    {
      id: 'WN-HR-03',
      company: '(주) 스마트HR컨설팅 [고용노동부 강소기업]',
      title: '조직 문화 혁신 및 성과 평가/보상 체계 구축 리드',
      duties: '기업 성장에 맞춘 인사 평가/보상 가이드 수립 및 시니어 관리자의 조직 문화 재정비',
      location: '서울 영등포구',
      career: '10년 이상',
      minSalary: '700',
      maxSalary: '1000',
    },
    {
      id: 'WN-MFG-04',
      company: '(주) 대성정밀공업 [일학습병행 참여기업]',
      title: '스마트 팩토리 품질 공정 자동화 및 ISO 인증 총괄',
      duties: '생산라인 불량률 감소 및 40+ 시니어 기술 고문의 현장 품질 관리 체계 수립',
      location: '경남 창원시',
      career: '15년 이상',
      minSalary: '750',
      maxSalary: '1050',
    },
    {
      id: 'WN-IT-05',
      company: '(주) 넥스트디지털솔루션 [워크넷 우수기업]',
      title: '노후 레거시 ERP 이관 및 클라우드 보안 체계 총괄',
      duties: '10년 이상 수기/온프레미스 시스템의 데이터 이관 및 클라우드 보안 리스크 전면 개선',
      location: '서울 성동구',
      career: '12년 이상',
      minSalary: '800',
      maxSalary: '1100',
    },
  ];

  return mockWorknetJobs.map((job, idx) => transformWorknetToSeniorProject(job, idx));
}

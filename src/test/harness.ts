import type { JobPosting } from '@/data/jobPostings';
import type { CompanyProfileData, SeniorProfileData } from '@/services/profileService';

export function createMockSeniorProfile(
  overrides?: Partial<SeniorProfileData>,
): SeniorProfileData {
  return {
    desiredCategory: 'design',
    desiredCategory2: 'it-development',
    desiredCategory3: undefined,
    desiredOccupationText: 'UX/UI 리드 디자이너',
    desiredLocation: '서울 마포구',
    desiredWorkType: '시간제·파트타임 (오전/오후)',
    field: 'UX/UI 및 브랜딩 디자인',
    keySkills: 'Figma, Design System, UX Research',
    period: '12년',
    certifications: '시각디자인기사',
    experience: '글로벌 브랜드 리디자인 및 디자인 시스템 수립',
    solvedExperiences: 'UX/UI 시스템을 표준화하여 생산성을 높인 프로젝트입니다.',
    phone: '010-1234-5678',
    email: 'senior@example.com',
    ...overrides,
  };
}

export function createMockCompanyProfile(
  overrides?: Partial<CompanyProfileData>,
): CompanyProfileData {
  return {
    companyName: '(주) 디자인브릿지스튜디오',
    companyAddress: '서울 마포구 월드컵북로 123',
    managerName: '김대표',
    email: 'company@example.com',
    phone: '02-987-6543',
    ...overrides,
  };
}

export function createMockJobPosting(overrides?: Partial<JobPosting>): JobPosting {
  return {
    id: 'HARNESS-TEST-001',
    title: 'UX/UI 디자인 시스템 총괄 디렉터',
    companyName: '(주) 디자인브릿지스튜디오',
    industry: '디자인/글로벌 브랜딩',
    companySize: '중소기업 (50인 미만)',
    category: 'design-brand',
    seniority: 'lead',
    employmentType: 'full-time',
    hiringStage: 'open',
    workType: 'hybrid',
    location: '서울 마포구',
    experienceYears: '10년 이상',
    salaryRange: '연 4,500만원 ~ 6,000만원',
    deadline: '2026-09-30',
    projectDuration: '6개월',
    collaborationTargets: ['프로덕트 팀', '디자인팀'],
    coreResponsibilities: ['디자인 시스템 설계', 'UX 리서치'],
    qualifications: ['10년 이상의 디자인 경력'],
    benefits: ['4대 보험', '유연 근무제'],
    problemStatement: '디지털 UX/UI 디자인 시스템 구축 및 사용자 경험 모델을 설계하여 제품 완성도를 높이는 프로젝트입니다.',
    projectGoal: '디자인 시스템 체계 정립',
    successMetrics: ['디자인 생산성 30% 향상'],
    requiredSkills: ['Figma', 'UX/UI'],
    preferredSkills: ['Design System'],
    matchingSignals: ['Design', 'UX'],
    recommendedTalentType: '디자인 시스템 리드',
    matchingScoreCriteria: ['경력 10년 이상', 'UX/UI 전공'],
    interviewFocus: ['디자인 시스템 수립 경험'],
    seniorFitScore: 96,
    postedAt: '2026-08-19',
    source: 'worknet',
    ...overrides,
  };
}

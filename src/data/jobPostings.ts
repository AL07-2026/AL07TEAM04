import type { OccupationCategory } from '@/data/occupationCategories';

export type ProjectCategory =
  | 'dev-engineering'
  | 'design-brand'
  | 'marketing-sales'
  | 'hr-strategy'
  | 'r-and-d-manufacturing'
  | 'legacy-modernization'
  | 'ai-automation'
  | 'data-platform'
  | 'security'
  | 'growth'
  | 'operations';

export type WorkType = 'remote' | 'hybrid' | 'onsite';
export type Seniority = 'senior' | 'lead' | 'principal';
export type EmploymentType = 'full-time' | 'contract' | 'part-time' | 'advisory' | 'project';
export type HiringStage = 'open' | 'screening' | 'interviewing' | 'closing' | 'closed';
export type PostingDetailProvenance = 'source' | 'synthetic' | 'unknown';
export type PostingDetailProvenanceMap = Partial<
  Record<'coreResponsibilities' | 'problemStatement' | 'projectGoal' | 'requiredSkills', PostingDetailProvenance>
>;

export type ProjectAttachment = {
  name: string;
  type: string;
  size: number;
  url?: string;
  storagePath?: string;
};

export type JobPosting = {
  id: string;
  ownerId?: string;
  companyName: string;
  industry: string;
  companySize: string;
  title: string;
  category: ProjectCategory;
  occupationCategory?: OccupationCategory;
  occupationClassificationConfidence?: number;
  occupationClassificationMargin?: number;
  occupationClassificationStatus?: 'classified' | 'ambiguous';
  seniority: Seniority;
  employmentType: EmploymentType;
  hiringStage: HiringStage;
  isPublic?: boolean;
  workType: WorkType;
  location: string;
  experienceYears: string;
  salaryRange: string;
  attachments?: ProjectAttachment[];
  deadline: string;
  projectDuration: string;
  collaborationTargets: string[];
  coreResponsibilities: string[];
  qualifications: string[];
  benefits: string[];
  problemStatement: string;
  projectGoal: string;
  successMetrics: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  matchingSignals: string[];
  recommendedTalentType: string;
  matchingScoreCriteria: string[];
  interviewFocus: string[];
  sourceDetailProvenance?: PostingDetailProvenanceMap;
  seniorFitScore: number;
  recommendationReasons?: string[];
  experienceRecommendationApplied?: boolean;
  postedAt: string;
  source?: 'internal' | 'worknet' | 'seoul' | 'public';
  sourceUrl?: string;
  sourceProvider?: string;
  workSchedule?: string;
  deadlineLabel?: string;
  registeredLabel?: string;
  contactEmail?: string;
  contentHash?: string;
  isSeniorTarget?: boolean;
  analysisStatus?: 'READY' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  analyzedAt?: string;
  aiExecutiveSummary?: {
    overview: string;
    keyChallenge: string;
    expectedImpact: string;
  };
  talentPersona?: {
    headline: string;
    experienceHighlights: string[];
    competencyTags: string[];
    interviewPrepFocus: string[];
  };
};

export const categoryLabels: Record<ProjectCategory, string> = {
  'dev-engineering': '개발/엔지니어링',
  'design-brand': '디자인/브랜딩',
  'marketing-sales': '마케팅/영업',
  'hr-strategy': '인사/경영전략',
  'r-and-d-manufacturing': '제조/R&D',
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

export const employmentTypeLabels: Record<EmploymentType, string> = {
  'full-time': '정규직',
  contract: '계약직',
  'part-time': '시간제(파트타임)',
  advisory: '자문',
  project: '프로젝트',
};

export const hiringStageLabels: Record<HiringStage, string> = {
  open: '모집 중',
  screening: '지원서 검토 중',
  interviewing: '담당자 인터뷰 중',
  closing: '마감 임박',
  closed: '모집 마감',
};

export const jobPostings: JobPosting[] = [];

export const databaseSummary = {
  totalPostings: 0,
  averageSeniorFitScore: 95,
  remoteFriendlyCount: 0,
  closingSoonCount: 0,
  categories: (Object.keys(categoryLabels) as ProjectCategory[]).map((id) => ({
    id,
    label: categoryLabels[id],
    count: 0,
  })),
};

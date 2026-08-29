import { describe, expect, it } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import { analyzeJobPostingForDetail } from './aiJobDetailAnalyzer';

function createMockPosting(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'mock-posting-1',
    companyName: '(주) 스마트HR랩',
    industry: '인사 / 조직컨설팅',
    companySize: '중소기업',
    title: '40+ 시니어 기반 조직 문화 혁신 및 인사평가 체계 개편',
    category: 'operations',
    seniority: 'lead',
    employmentType: 'project',
    hiringStage: 'open',
    workType: 'remote',
    location: '서울 영등포구',
    experienceYears: '15년 이상',
    salaryRange: '월 800만-1,200만',
    deadline: '2026-09-30',
    projectDuration: '4개월',
    collaborationTargets: [],
    coreResponsibilities: [],
    qualifications: [],
    benefits: [],
    problemStatement: '',
    projectGoal: '',
    successMetrics: [],
    requiredSkills: [],
    preferredSkills: [],
    matchingSignals: [],
    recommendedTalentType: '',
    matchingScoreCriteria: [],
    interviewFocus: [],
    seniorFitScore: 94,
    postedAt: '2026-08-20',
    source: 'worknet',
    ...overrides,
  };
}

describe('aiJobDetailAnalyzer', () => {
  it('correctly analyzes and infers details for sparse public postings without throwing', () => {
    const posting = createMockPosting();
    const result = analyzeJobPostingForDetail(posting);

    expect(result.aiExecutiveSummary.overview).toBeTruthy();
    expect(result.aiExecutiveSummary.keyChallenge).toBeTruthy();
    expect(result.aiExecutiveSummary.expectedImpact).toBeTruthy();

    expect(result.talentPersona.headline).toBeTruthy();
    expect(result.talentPersona.experienceHighlights.length).toBeGreaterThanOrEqual(3);
    expect(result.talentPersona.competencyTags.length).toBeGreaterThanOrEqual(3);
    expect(result.talentPersona.interviewPrepFocus.length).toBeGreaterThanOrEqual(2);

    expect(result.keyJobFacts.roleTitle).toBeTruthy();
    expect(result.keyJobFacts.salaryLabel).toContain('800만');
    expect(result.keyJobFacts.locationLabel).toContain('서울 영등포구');

    expect(result.structuredDuties.length).toBeGreaterThan(0);
    expect(result.qualifications.length).toBeGreaterThan(0);
    expect(result.benefits.length).toBeGreaterThan(0);
  });

  it('preserves and honors explicit source-backed responsibilities and requirements when present', () => {
    const posting = createMockPosting({
      coreResponsibilities: ['조직문화 진단 리포트 작성', '인사평가제도 신규 수립'],
      qualifications: ['15년 이상 HR 실무 총괄', 'C-Level 자문 경험'],
      benefits: ['원격 자문 지원', '자문료 지급'],
      recommendedTalentType: '15년 이상 HR CHRO 출신 시니어',
    });

    const result = analyzeJobPostingForDetail(posting);

    expect(result.structuredDuties).toContain('조직문화 진단 리포트 작성');
    expect(result.structuredDuties).toContain('인사평가제도 신규 수립');
    expect(result.qualifications).toContain('15년 이상 HR 실무 총괄');
    expect(result.benefits).toContain('원격 자문 지원');
    expect(result.talentPersona.headline).toBe('15년 이상 HR CHRO 출신 시니어');
  });
});

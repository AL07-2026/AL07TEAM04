import { describe, expect, it } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import { getPostingWorkSummary } from '@/services/postingWorkSummary';
import { fallbackWorknetJobs, transformWorknetToSeniorProject } from '@/services/worknetService';

function createPosting(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'summary-test',
    companyName: '테스트 기업',
    industry: '유통업',
    companySize: '중소기업',
    title: '상품기획 PM',
    category: 'marketing-sales',
    seniority: 'senior',
    employmentType: 'full-time',
    hiringStage: 'open',
    workType: 'onsite',
    location: '서울',
    experienceYears: '경력 10년',
    salaryRange: '연봉 6,000만원',
    deadline: '2026-09-30',
    projectDuration: '',
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
    seniorFitScore: 0,
    postedAt: '2026-08-19',
    source: 'worknet',
    ...overrides,
  };
}

describe('posting work summary provenance guard', () => {
  it('상품기획 공고의 synthetic 마케팅·세일즈 문구를 업무 요약으로 노출하지 않는다', () => {
    const summary = getPostingWorkSummary(
      createPosting({
        problemStatement: '신규 타깃 마케팅 전략 및 세일즈 파이프라인 구축',
        sourceDetailProvenance: { problemStatement: 'synthetic' },
      }),
    );

    expect(summary.hasSourceBackedWork).toBe(false);
    expect(summary.items.join(' ')).not.toMatch(/마케팅|세일즈|파이프라인/);
    expect(summary.facts).toContainEqual({ label: '모집 역할', value: '상품기획 PM' });
  });

  it('IT 공고의 synthetic AI/RPA·레거시 문구를 업무 요약으로 노출하지 않는다', () => {
    const summary = getPostingWorkSummary(
      createPosting({
        category: 'dev-engineering',
        title: '백엔드 개발자',
        problemStatement: 'AI/RPA 자동화와 레거시 개선을 수행합니다.',
        sourceDetailProvenance: { problemStatement: 'synthetic' },
      }),
    );

    expect(summary.hasSourceBackedWork).toBe(false);
    expect(summary.items).toEqual([]);
  });

  it('source-backed 상세 업무는 최대 세 개까지 원문 그대로 보여준다', () => {
    const summary = getPostingWorkSummary(
      createPosting({
        coreResponsibilities: ['상품 발주 데이터를 분석합니다.', '협력사와 출시 일정을 조율합니다.'],
        sourceDetailProvenance: { coreResponsibilities: 'source' },
      }),
    );

    expect(summary.hasSourceBackedWork).toBe(true);
    expect(summary.items).toEqual(['상품 발주 데이터를 분석합니다.', '협력사와 출시 일정을 조율합니다.']);
    expect(summary.roleLabel).toBe('상품기획 PM');
    expect(summary.evidenceLabel).toBe('공고에 명시된 업무를 바탕으로 정리했어요.');
  });

  it('source로 표시된 문제와 목표만 역할 해석의 근거에 포함한다', () => {
    const summary = getPostingWorkSummary(
      createPosting({
        coreResponsibilities: ['synthetic 업무'],
        problemStatement: '반품 데이터를 줄일 운영 방안을 마련합니다.',
        projectGoal: '반품률 개선',
        sourceDetailProvenance: {
          coreResponsibilities: 'synthetic',
          problemStatement: 'source',
          projectGoal: 'source',
        },
      }),
    );

    expect(summary.items).toEqual(['반품 데이터를 줄일 운영 방안을 마련합니다.', '반품률 개선']);
    expect(summary.items.join(' ')).not.toContain('synthetic 업무');
  });

  it('상세 업무 provenance가 없으면 확인 가능한 공고 조건만 fallback facts로 제공한다', () => {
    const summary = getPostingWorkSummary(createPosting({ workSchedule: '주 5일 근무' }));

    expect(summary.hasSourceBackedWork).toBe(false);
    expect(summary.items).toEqual([]);
    expect(summary.evidenceLabel).toBe('공고에 명시된 역할과 근무 조건만 안내합니다.');
    expect(summary.facts).toEqual(
      expect.arrayContaining([
        { label: '모집 역할', value: '상품기획 PM' },
        { label: '경력 조건', value: '경력 10년' },
        { label: '근무 지역', value: '서울' },
      ]),
    );
  });

  it('서로 다른 세 개의 현재 Worknet source fixture도 원문 조건만 fallback으로 제공한다', () => {
    const sourceIds = ['WN-DEV-01', 'WN-CS-12', 'WN-CON-17'];
    const postings = sourceIds.map((sourceId, index) => {
      const raw = fallbackWorknetJobs.find((item) => item.wantedAuthNo === sourceId);
      if (!raw) throw new Error(`${sourceId} source fixture가 없습니다.`);
      return transformWorknetToSeniorProject(raw, index, new Date('2026-08-19T12:00:00'));
    });

    postings.forEach((posting) => {
      const summary = getPostingWorkSummary(posting);
      expect(summary.hasSourceBackedWork).toBe(false);
      expect(summary.items).toEqual([]);
      expect(summary.facts).toContainEqual({ label: '모집 역할', value: posting.title });
    });
  });
});

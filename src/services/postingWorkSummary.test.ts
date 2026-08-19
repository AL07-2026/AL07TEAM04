import { describe, expect, it } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import { composeGroundedRoleSummary, getPostingWorkSummary, splitSourceDuties } from '@/services/postingWorkSummary';
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

  it('엘레오스처럼 하나의 원문 줄에 연결된 실제 업무는 독립 RoleFact로 분해한다', () => {
    const summary = getPostingWorkSummary(
      createPosting({
        companyName: '엘레오스',
        coreResponsibilities: ['수제비누 제조 - 수제비누 제조기록서 작성 - 포장'],
        sourceDetailProvenance: { coreResponsibilities: 'source' },
      }),
    );

    expect(summary.hasSourceBackedWork).toBe(true);
    expect(summary.duties).toEqual(['수제비누 제조', '수제비누 제조기록서 작성', '포장']);
    expect(summary.summary).not.toBe('수제비누 제조 - 수제비누 제조기록서 작성 - 포장');
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

    expect(summary.duties).toEqual(['반품 데이터를 줄일 운영 방안을 마련합니다.']);
    expect(summary.duties.join(' ')).not.toContain('synthetic 업무');
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

  it('업무 evidence를 제거하면 요약과 duties에서도 같은 의미가 함께 제거된다', () => {
    const withPacking = getPostingWorkSummary(
      createPosting({
        coreResponsibilities: ['제조 - 포장 - 출고'],
        sourceDetailProvenance: { coreResponsibilities: 'source' },
      }),
    );
    const withoutPacking = getPostingWorkSummary(
      createPosting({
        coreResponsibilities: ['제조 - 출고'],
        sourceDetailProvenance: { coreResponsibilities: 'source' },
      }),
    );

    expect(withPacking.summary).toContain('포장');
    expect(withoutPacking.summary).not.toContain('포장');
    expect(withoutPacking.duties).not.toContain('포장');
  });

  it('서로 다른 실제 업무 유형도 결정론적으로 source 범위 안에서만 통역한다', () => {
    const fixtures = [
      '고객 상담 - 문의 기록 작성',
      '운영 일정 기획 - 협력사 조율',
      'API 개발 - 배포 문서 작성',
      '영업 제안서 작성 - 고객 미팅',
      '현장 안전 점검 - 돌봄 기록 작성',
    ];

    fixtures.forEach((source) => {
      const duties = splitSourceDuties(source);
      const first = composeGroundedRoleSummary(duties);
      expect(composeGroundedRoleSummary(duties)).toBe(first);
      expect(first).not.toMatch(/AI|RPA|레거시 개선|혁신|효율화|비용 절감|매출 향상|고객 만족 향상|성장/);
      duties.forEach((duty) => expect(first).toContain(duty));
    });
  });

  it('실제 Preview grammar fixtures를 조사 placeholder나 깨진 연결 없이 통역한다', () => {
    const outputs = {
      elleos: composeGroundedRoleSummary(['수제비누 제조', '수제비누 제조기록서 작성', '포장']),
      homeProtector: composeGroundedRoleSummary([
        '힘든 나날들을 보내고 있는 직장인에게 집청소, 밥을 해주고 고민을 들어주는 역할',
      ]),
      operatingSystem: composeGroundedRoleSummary([
        '업무 흐름을 정리합니다.',
        '운영 체계 만들기',
      ]),
    };

    expect(outputs.elleos).toBe('수제비누 제조에 더해 수제비누 제조기록서 작성과 포장까지 맡아요.');
    expect(outputs.homeProtector).toBe(
      '힘든 나날들을 보내고 있는 직장인에게 집청소, 밥을 해주고 고민을 들어주는 역할이에요.',
    );
    expect(outputs.operatingSystem).toBe('업무 흐름을 정리하는 일과 운영 체계 만들기를 함께 맡아요.');
    Object.values(outputs).forEach((summary) => {
      expect(summary).not.toMatch(/을\(를\)|\(을\)를|이\(가\)|은\(는\)|와\(과\)|합니다\.부터|역할을 맡는 역할/);
    });
  });

  it('지원하지 않는 문장형은 깨진 connector 대신 안전한 fallback으로 내려간다', () => {
    expect(composeGroundedRoleSummary(['프로젝트는 안정적으로 운영됩니다.'])).toBe(
      '이 역할에서 맡게 될 일은 아래처럼 정리돼 있어요.',
    );
  });
});

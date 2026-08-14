import { describe, expect, it } from 'vitest';

import type { JobPosting, ProjectCategory } from '@/data/jobPostings';
import type { SeniorProfileData } from '@/services/profileService';
import {
  calculatePersonalizedMatch,
  getProfileExperienceMonths,
  getProfileMatchedRankedProjects,
  getProfileWorknetKeywords,
  hasProfileRecommendationCriteria,
} from '@/services/recommendationEngine';

const profile: SeniorProfileData = {
  desiredCategory: 'it-development-data',
  desiredCategory2: 'service',
  email: 'senior@example.com',
  experience: '소프트웨어 개발과 서비스 운영 프로세스 개선 경험',
  field: '소프트웨어 개발',
  keySkills: '개발, 자동화, 프로세스 개선',
  period: '15년',
  phone: '010-0000-0000',
  solvedExperiences: '개발 프로세스를 표준화하고 운영 업무를 자동화함',
};

function createPosting(id: string, category: ProjectCategory, title: string): JobPosting {
  return {
    id,
    companyName: '테스트 기업',
    industry: '소프트웨어 개발업',
    companySize: '고용24 채용 공고',
    title,
    category,
    seniority: 'senior',
    employmentType: 'full-time',
    hiringStage: 'open',
    workType: 'onsite',
    location: '서울',
    experienceYears: '경력 10년 이상',
    salaryRange: '연봉 5,000만원',
    deadline: '2026-09-30',
    projectDuration: '원문 확인',
    collaborationTargets: [],
    coreResponsibilities: [],
    qualifications: [],
    benefits: [],
    problemStatement: title,
    projectGoal: `${title} 업무 수행`,
    successMetrics: [],
    requiredSkills: ['개발', '프로세스'],
    preferredSkills: [],
    matchingSignals: [],
    recommendedTalentType: '경력자',
    matchingScoreCriteria: [],
    interviewFocus: [],
    seniorFitScore: 0,
    postedAt: '2026-08-14',
  };
}

describe('profile-based recommendations', () => {
  it('희망 직종과 핵심 경력 정보가 있어야 추천을 시작한다', () => {
    expect(hasProfileRecommendationCriteria(profile)).toBe(true);
    expect(hasProfileRecommendationCriteria(null)).toBe(false);
    expect(
      hasProfileRecommendationCriteria({
        ...profile,
        desiredCategory: undefined,
        desiredCategory2: undefined,
        desiredCategory3: undefined,
      }),
    ).toBe(false);
  });

  it('희망 직종에 포함된 공고만 남기고 1순위를 먼저 배치한다', () => {
    const ranked = getProfileMatchedRankedProjects(
      [
        createPosting('hr', 'hr-strategy', '인사 제도 설계'),
        createPosting('operations', 'operations', '서비스 운영 개선'),
        createPosting('development', 'dev-engineering', '소프트웨어 개발 리드'),
      ],
      profile,
    );

    expect(ranked.map(({ posting }) => posting.id)).toEqual(['development', 'operations']);
    expect(ranked[0]?.matchResult.primaryCategoryMatch).toBe(true);
    expect(ranked[0]?.matchResult.personalizedScore).toBeGreaterThan(
      ranked[1]?.matchResult.personalizedScore ?? 0,
    );
  });

  it('프로필이 명시적으로 제공되지 않아도 시니어 공고 피드를 기본 제공한다', () => {
    const posting = createPosting('development', 'dev-engineering', '소프트웨어 개발 리드');

    expect(getProfileMatchedRankedProjects([posting], null)).toHaveLength(1);
    expect(calculatePersonalizedMatch(posting, null).personalizedScore).toBe(0);
  });

  it('희망 직종을 고용24 키워드 검색 조건으로 변환한다', () => {
    expect(getProfileWorknetKeywords(profile)).toEqual([
      '개발자',
      '데이터',
      '정보보안',
      '서비스',
      '매장',
      '시설관리',
    ]);
    expect(getProfileExperienceMonths(profile)).toBe(180);
  });

  it('같은 희망 직종을 여러 순위에 선택해도 검색 조건은 중복하지 않는다', () => {
    expect(
      getProfileWorknetKeywords({
        ...profile,
        desiredCategory2: 'it-development-data',
        desiredCategory3: 'it-development-data',
      }),
    ).toEqual(['개발자', '데이터', '정보보안']);
  });

  it('선택한 21개 직종과 일치하는 공고가 없으면 다른 직종을 섞지 않는다', () => {
    const unmatchedProfile = {
      ...profile,
      desiredCategory: 'medical',
      desiredCategory2: undefined,
    };
    const posting = createPosting('development', 'dev-engineering', '소프트웨어 개발 리드');

    expect(getProfileMatchedRankedProjects([posting], unmatchedProfile)).toEqual([]);
  });

  it('희망 근무 지역에 따라 적합도 점수와 사유를 반영한다', () => {
    const seoulPosting = createPosting('seoul', 'dev-engineering', '서울 개발 리드');
    seoulPosting.location = '서울 마포구';

    const busanPosting = createPosting('busan', 'dev-engineering', '부산 개발 리드');
    busanPosting.location = '부산 해운대구';

    const matchSeoul = calculatePersonalizedMatch(seoulPosting, {
      ...profile,
      desiredLocation: '서울',
    });
    const matchBusan = calculatePersonalizedMatch(busanPosting, {
      ...profile,
      desiredLocation: '서울',
    });

    expect(matchSeoul.personalizedScore).toBeGreaterThan(matchBusan.personalizedScore);
    expect(matchSeoul.matchReasons.some((r) => r.includes('희망 근무 지역 서울'))).toBe(true);
  });
});

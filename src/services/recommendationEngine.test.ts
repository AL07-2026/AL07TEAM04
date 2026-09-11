import { describe, expect, it } from 'vitest';

import type { JobPosting, ProjectCategory } from '@/data/jobPostings';
import type { SeniorProfileData } from '@/services/profileService';
import {
  calculatePersonalizedMatch,
  getPostingOccupationCategory,
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

  it('기타 희망 직종은 구체적인 직무명을 입력한 경우에만 해당 공고와 매칭한다', () => {
    const otherOccupationProfile: SeniorProfileData = {
      ...profile,
      desiredCategory: 'other',
      desiredCategory2: undefined,
      desiredOccupationText: 'UX 리서처',
    };
    const matchingPosting = createPosting(
      'ux-researcher',
      'design-brand',
      '시니어 UX 리서처 채용',
    );
    matchingPosting.coreResponsibilities = ['사용자 인터뷰와 사용성 조사'];
    const unrelatedPosting = createPosting(
      'office-manager',
      'hr-strategy',
      '총무 사무 관리자 채용',
    );

    expect(hasProfileRecommendationCriteria(otherOccupationProfile)).toBe(true);
    expect(
      hasProfileRecommendationCriteria({
        ...otherOccupationProfile,
        desiredOccupationText: '',
      }),
    ).toBe(false);
    const ranked = getProfileMatchedRankedProjects(
      [unrelatedPosting, matchingPosting],
      otherOccupationProfile,
    );
    expect(ranked.map(({ posting }) => posting.id)).toEqual(['ux-researcher']);
    expect(ranked[0]?.matchResult.matchReasons[0]).toContain('UX 리서처');
    expect(
      calculatePersonalizedMatch(
        unrelatedPosting,
        otherOccupationProfile,
        'custom-match',
      ).primaryCategoryMatch,
    ).toBe(false);
  });

  it('맞춤 프로젝트에는 내 정보의 1순위 직종 공고만 남긴다', () => {
    const ranked = getProfileMatchedRankedProjects(
      [
        createPosting('hr', 'hr-strategy', '인사 제도 설계'),
        createPosting('operations', 'operations', '서비스 운영 개선'),
        createPosting('development', 'dev-engineering', '소프트웨어 개발 리드'),
      ],
      profile,
    );

    expect(ranked.map(({ posting }) => posting.id)).toEqual(['development']);
    expect(ranked[0]?.matchResult.primaryCategoryMatch).toBe(true);
    expect(ranked[0]?.matchResult.matchReasons[0]).toContain('선택한 직종');
  });

  it('AI 경험 인터뷰의 역할·행동·성과가 맞는 공고를 더 높게 추천한다', () => {
    const matchingPosting = createPosting(
      'automation',
      'dev-engineering',
      '운영 자동화 프로세스 구축 리드',
    );
    matchingPosting.problemStatement = '수작업 운영 프로세스를 자동화하고 데이터 품질을 개선합니다.';
    matchingPosting.requiredSkills = ['자동화', '프로세스', '데이터'];
    const genericPosting = createPosting('generic', 'dev-engineering', '소프트웨어 개발 리드');
    genericPosting.problemStatement = '신규 서비스 개발을 담당합니다.';
    genericPosting.requiredSkills = ['개발'];

    const experienceCard = {
      action: '수작업 운영 프로세스를 자동화하고 데이터 검증 체계를 구축했습니다.',
      category: 'dev-engineering' as const,
      problem: '반복 업무와 데이터 품질 문제가 있었습니다.',
      result: '처리 시간을 단축하고 오류를 줄였습니다.',
      role: '자동화 구축 리드',
      title: '운영 자동화 경험',
    };
    const ranked = getProfileMatchedRankedProjects(
      [genericPosting, matchingPosting],
      profile,
      undefined,
      experienceCard,
    );

    expect(ranked.map(({ posting }) => posting.id)).toEqual(['automation', 'generic']);
    expect(ranked[0]?.matchResult.experienceRecommendationApplied).toBe(true);
    expect(
      ranked[0]?.matchResult.matchReasons.some((reason) => reason.includes('AI 경험 인터뷰')),
    ).toBe(true);
  });

  it('같은 희망 직종 안에서는 자격증과 원하는 근무 형태가 맞는 공고를 더 높게 평가한다', () => {
    const detailedProfile: SeniorProfileData = {
      ...profile,
      certifications: '정보처리기사',
      desiredWorkType: '시간제·파트타임 (오전/오후)',
    };
    const genericPosting = createPosting('generic-full-time', 'dev-engineering', '백엔드 개발자');
    const matchedPosting = createPosting('matched-part-time', 'dev-engineering', '시간제 백엔드 개발자');
    matchedPosting.employmentType = 'part-time';
    matchedPosting.qualifications = ['정보처리기사 자격증'];

    const genericMatch = calculatePersonalizedMatch(genericPosting, detailedProfile);
    const detailedMatch = calculatePersonalizedMatch(matchedPosting, detailedProfile);

    expect(detailedMatch.personalizedScore).toBeGreaterThan(genericMatch.personalizedScore);
    expect(detailedMatch.matchReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('정보처리기사'),
        expect.stringContaining('근무 형태'),
      ]),
    );
  });

  it('프로필의 UX/UI·브랜딩 전문 분야가 일치하는 디자인 공고를 먼저 추천한다', () => {
    const designProfile: SeniorProfileData = {
      ...profile,
      desiredCategory: 'design',
      desiredCategory2: 'marketing-pr-research',
      field: 'UX/UI 및 브랜딩',
      keySkills: 'UX/UI 디자인 설계 및 서비스 런칭, 브랜드 자료 고도화',
      solvedExperiences: '글로벌 브랜딩과 UX/UI 디자인 시스템 구축',
    };
    const genericPosting = createPosting(
      'generic-design',
      'design-brand',
      '편집 디자이너 인쇄물 제작',
    );
    genericPosting.industry = '시각 디자인';
    const uxPosting = createPosting(
      'ux-senior-design',
      'design-brand',
      '기업 글로벌 브랜드 리디자인 및 UX/UI 디자인 시스템 총괄 디렉터',
    );
    uxPosting.industry = '디자인/글로벌 브랜딩';
    uxPosting.requiredSkills = ['UX/UI 디자인', '글로벌 브랜딩', '디자인 시스템'];

    const ranked = getProfileMatchedRankedProjects(
      [genericPosting, uxPosting],
      designProfile,
    );

    expect(ranked.map(({ posting }) => posting.id)).toEqual([
      'ux-senior-design',
      'generic-design',
    ]);
    expect(
      ranked[0]?.matchResult.matchReasons.some((reason) => reason.includes('전문 분야')),
    ).toBe(true);
  });

  it('대분류만 같은 영상·인테리어 공고에는 UX/UI 경력 고득점을 부여하지 않는다', () => {
    const designProfile: SeniorProfileData = {
      ...profile,
      desiredCategory: 'design',
      desiredCategory2: 'marketing-pr-research',
      desiredCategory3: 'planning-strategy',
      desiredWorkType: '전체 무관 (시간제/계약직/정규직)',
      experience: '',
      field: 'UX/UI 및 브랜딩',
      keySkills: '다수 브랜딩 시각관련 자료 고도화, UX/UI디자인 설계 및 서비스 런칭',
      period: '12년',
      solvedExperiences: '다수 브랜딩 시각관련 자료 고도화, UX/UI디자인 설계 및 서비스 런칭',
    };
    const uxPosting = createPosting(
      'ux-ui-director',
      'design-brand',
      'UX/UI 디자인 시스템 총괄 디렉터',
    );
    uxPosting.industry = '디자인/글로벌 브랜딩';
    uxPosting.occupationCategory = 'design';
    uxPosting.requiredSkills = ['UX/UI', '브랜딩', '디자인 시스템'];

    const videoPosting = createPosting(
      'video-poster-designer',
      'design-brand',
      '영화 드라마 광고 포스터 그래픽 영상 디자이너',
    );
    videoPosting.industry = '영상 디자인';
    videoPosting.occupationCategory = 'design';
    videoPosting.problemStatement =
      '영화·드라마·광고 영상의 모션그래픽 연출과 시각 콘텐츠를 제작합니다.';
    videoPosting.coreResponsibilities = [
      '영화·드라마·OTT 홍보영상 모션그래픽과 VFX·CG를 제작하며 타이틀, 모니터 UI/UX, 자막 효과를 일부 다룹니다.',
    ];
    videoPosting.requiredSkills = ['그래픽', '영상 편집'];

    const interiorPosting = createPosting(
      'interior-designer',
      'design-brand',
      '인테리어 디자이너',
    );
    interiorPosting.industry = '실내 인테리어';
    interiorPosting.occupationCategory = 'design';
    interiorPosting.problemStatement = '인테리어 도면 설계와 현장 시공 품질을 관리합니다.';
    interiorPosting.requiredSkills = ['CAD', '3D', '공간 설계'];

    const ranked = getProfileMatchedRankedProjects(
      [videoPosting, interiorPosting, uxPosting],
      designProfile,
    );
    const scores = Object.fromEntries(
      ranked.map(({ matchResult, posting }) => [posting.id, matchResult.personalizedScore]),
    );

    expect(ranked[0]?.posting.id).toBe('ux-ui-director');
    expect(scores).toMatchObject({
      'interior-designer': 53,
      'ux-ui-director': 85,
      'video-poster-designer': 62,
    });
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

    expect(matchSeoul.rankingScore).toBeGreaterThan(matchBusan.rankingScore);
    expect(matchSeoul.matchReasons.some((r) => r.includes('희망 근무 지역 서울'))).toBe(true);
  });

  it('필터에서 특정 직종을 선택하면 해당 직종이 1순위 전용으로 동적 승격 평가된다', () => {
    const servicePosting = createPosting('service_job', 'operations', '매장 서비스 운영 리드');
    servicePosting.occupationCategory = 'service';

    const defaultMatch = calculatePersonalizedMatch(servicePosting, profile);
    expect(defaultMatch.matchReasons[0]).toContain('2순위 희망 직종');

    const promotedMatch = calculatePersonalizedMatch(servicePosting, profile, 'service');
    expect(promotedMatch.matchReasons[0]).toContain('선택한 직종');
    expect(promotedMatch.rankingScore).toBeGreaterThan(defaultMatch.rankingScore);
  });

  it('본문에 직종 단어만 포함된 다른 직무를 희망 직종으로 승격하지 않는다', () => {
    const accountingPosting = createPosting(
      'design_company_accounting',
      'design-brand',
      '디자인 회사 회계 담당자',
    );
    accountingPosting.industry = '디자인 서비스업';
    accountingPosting.occupationCategory = 'design';
    accountingPosting.requiredSkills = ['회계', '세무', '재무'];

    expect(getPostingOccupationCategory(accountingPosting)).toBe('accounting-tax-finance');
    expect(calculatePersonalizedMatch(accountingPosting, profile, 'design').primaryCategoryMatch).toBe(
      false,
    );
  });

  it('서버가 신뢰도 검증한 직무는 브라우저에서 다른 직무로 다시 덮어쓰지 않는다', () => {
    const serverClassifiedPosting = createPosting(
      'server_classified_planning',
      'growth',
      'AI Product Lead 채용',
    );
    serverClassifiedPosting.occupationCategory = 'planning-strategy';
    serverClassifiedPosting.occupationClassificationStatus = 'classified';
    serverClassifiedPosting.coreResponsibilities = ['AI 플랫폼 개발자와 협업'];

    expect(getPostingOccupationCategory(serverClassifiedPosting)).toBe('planning-strategy');
  });
});

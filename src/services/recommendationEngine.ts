import { categoryLabels, type JobPosting } from '@/data/jobPostings';
import type { SeniorProfileData } from '@/services/profileService';

export interface PersonalizedMatchResult {
  matchReasons: string[];
  personalizedScore: number;
  posting: JobPosting;
  primaryCategoryMatch: boolean;
}

const DEFAULT_SENIOR_PROFILE: SeniorProfileData = {
  desiredCategory: 'operations',
  desiredCategory2: 'ai-automation',
  desiredCategory3: 'dev-engineering',
  email: 'sehddnr2@gmail.com',
  experience: '신규 운영 체계 구축, 프로세스 표준화, 부서 간 협업 조율 및 팀 교육 리딩 경험 12년',
  field: '서비스 운영 / 프로세스 개선',
  keySkills: '0→1 프로세스 정립, VOC 분석, SLA 관리, AI 자동화 툴 도입, 팀 리더십',
  period: '12년',
  phone: '010-1234-5678',
  solvedExperiences: '신규 서비스 출시 후 파편화된 운영 기준을 매뉴얼로 표준화하고 리드타임 30% 단축',
};

export function getActiveSeniorProfile(): SeniorProfileData {
  if (typeof window !== 'undefined') {
    const savedLocal = localStorage.getItem('eojob_senior_profile');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal) as SeniorProfileData;
        return {
          ...DEFAULT_SENIOR_PROFILE,
          ...parsed,
        };
      } catch {
        // fallback
      }
    }
  }
  return DEFAULT_SENIOR_PROFILE;
}

export function calculatePersonalizedMatch(
  posting: JobPosting,
  profile?: SeniorProfileData,
): PersonalizedMatchResult {
  const activeProfile = profile || getActiveSeniorProfile();

  const userDesired1 = (activeProfile.desiredCategory || '').toLowerCase();
  const userDesired2 = (activeProfile.desiredCategory2 || '').toLowerCase();
  const userDesired3 = (activeProfile.desiredCategory3 || '').toLowerCase();
  const userExpText = (activeProfile.experience + ' ' + (activeProfile.solvedExperiences || '') + ' ' + (activeProfile.keySkills || '')).toLowerCase();
  const userFieldText = (activeProfile.field || '').toLowerCase();
  const userSkillsText = (activeProfile.keySkills || '').toLowerCase();

  const postingCatLabel = (categoryLabels[posting.category] || posting.category).toLowerCase();
  const postingTitle = posting.title.toLowerCase();
  const postingProblem = posting.problemStatement.toLowerCase();
  const postingGoal = posting.projectGoal.toLowerCase();
  const postingSkills = (posting.requiredSkills || []).join(' ').toLowerCase();

  const matchReasons: string[] = [];

  // 1. Category Priority Base Score (1차/2차/3차 희망 직종 연동)
  const cat1Match = Boolean(
    userDesired1 &&
      (userDesired1.includes(posting.category) ||
        posting.category.includes(userDesired1) ||
        postingCatLabel.includes(userDesired1) ||
        userDesired1.includes(postingCatLabel) ||
        postingTitle.includes(userDesired1)),
  );
  const cat2Match = Boolean(
    userDesired2 &&
      (userDesired2.includes(posting.category) ||
        posting.category.includes(userDesired2) ||
        postingCatLabel.includes(userDesired2) ||
        userDesired2.includes(postingCatLabel) ||
        postingTitle.includes(userDesired2)),
  );
  const cat3Match = Boolean(
    userDesired3 &&
      (userDesired3.includes(posting.category) ||
        posting.category.includes(userDesired3) ||
        postingCatLabel.includes(userDesired3) ||
        userDesired3.includes(postingCatLabel) ||
        postingTitle.includes(userDesired3)),
  );
  const fieldMatch = Boolean(
    userFieldText &&
      (userFieldText.includes(postingCatLabel) ||
        postingCatLabel.includes(userFieldText) ||
        postingTitle.includes(userFieldText)),
  );

  let baseScore: number;

  if (cat1Match) {
    baseScore = 95;
    const catName = categoryLabels[posting.category] || posting.category;
    matchReasons.push(`🎯 1순위 희망 직종 일치: [${catName}] 분야 최우선 맞춤 프로젝트`);
  } else if (cat2Match) {
    baseScore = 92;
    const catName = categoryLabels[posting.category] || posting.category;
    matchReasons.push(`🎯 2순위 희망 직종 부합: [${catName}] 분야 2순위 맞춤 프로젝트`);
  } else if (cat3Match) {
    baseScore = 89;
    const catName = categoryLabels[posting.category] || posting.category;
    matchReasons.push(`🎯 3순위 희망 직종 부합: [${catName}] 분야 3순위 맞춤 프로젝트`);
  } else if (fieldMatch) {
    baseScore = 86;
    matchReasons.push(`💼 경력 분야 일치: [${categoryLabels[posting.category] || posting.category}] 실무 노하우 직접 활용 가능`);
  } else {
    baseScore = 80;
    matchReasons.push(`💼 전문 분야 매칭: [${categoryLabels[posting.category] || posting.category}] 직무 경험 확장 가능`);
  }

  // 2. Key Skills & Solved Problem Experience Keyword Matching (+0 to +3 points)
  const solvedKeywords = [
    '프로세스',
    '운영',
    '자동화',
    '개선',
    '영업',
    '품질',
    '아키텍처',
    '전환',
    '데이터',
    '인사',
    '컴플라이언스',
    '리드',
    '구축',
    '표준화',
    '디자인',
    '개발',
    '전략',
    'b2b',
    'cs',
  ];
  let keywordHits = 0;
  for (const kw of solvedKeywords) {
    if (
      (userExpText.includes(kw) || userSkillsText.includes(kw)) &&
      (postingProblem.includes(kw) || postingGoal.includes(kw) || postingSkills.includes(kw) || postingTitle.includes(kw))
    ) {
      keywordHits++;
    }
  }

  if (keywordHits >= 2) {
    baseScore += 3;
    matchReasons.push(`💡 세부 강점 & 과제 부합: 과거 성과/강점 노하우와 기업 과제(${posting.companyName}) 96%+ 강력 매칭`);
  } else if (keywordHits >= 1) {
    baseScore += 2;
    matchReasons.push(`⚡ 실무 강점 부합: 가입자 세부 강점 기반 즉시 문제 해결 투입 가능`);
  } else {
    matchReasons.push(`⚡ 실무 역량 보유: 10년+ 베테랑 책임 리더십 조건 충족`);
  }

  // 3. Seniority Years Matching (+1 point)
  const userYearsNum = parseInt(activeProfile.period || '12', 10) || 12;
  if (userYearsNum >= 10) {
    baseScore += 1;
  }
  matchReasons.push(`🏆 40+ 경력 부합: ${userYearsNum}년 차 전문성 및 책임 리더십 조건 충족`);

  // Cap final score between 80 and 99
  const finalScore = Math.min(99, Math.max(80, baseScore));

  return {
    personalizedScore: finalScore,
    matchReasons,
    posting,
    primaryCategoryMatch: Boolean(cat1Match || cat2Match || cat3Match || fieldMatch),
  };
}

export function getPersonalizedRankedProjects(
  postings: JobPosting[],
  profile?: SeniorProfileData,
): { matchResult: PersonalizedMatchResult; posting: JobPosting }[] {
  const activeProfile = profile || getActiveSeniorProfile();

  const ranked = postings.map((posting) => {
    const matchResult = calculatePersonalizedMatch(posting, activeProfile);
    return {
      posting: {
        ...posting,
        seniorFitScore: matchResult.personalizedScore,
      },
      matchResult,
    };
  });

  // Sort descending by personalizedScore
  ranked.sort((a, b) => b.matchResult.personalizedScore - a.matchResult.personalizedScore);

  return ranked;
}

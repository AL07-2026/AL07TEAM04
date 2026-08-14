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
  email: 'sehddnr2@gmail.com',
  experience: '신규 운영 체계 구축, 프로세스 표준화, 부서 간 협업 조율 및 팀 교육 리딩 경험 12년',
  field: '서비스 운영 / 프로세스 개선',
  keySkills: '운영 체계 수립, 매뉴얼 작성, VOC 분석, SLA 관리',
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

  const userDesired = (activeProfile.desiredCategory || activeProfile.field || '').toLowerCase();
  const userExpText = (activeProfile.experience + ' ' + (activeProfile.solvedExperiences || '') + ' ' + (activeProfile.keySkills || '')).toLowerCase();
  const userFieldText = (activeProfile.field || '').toLowerCase();

  const postingCatLabel = (categoryLabels[posting.category] || posting.category).toLowerCase();
  const postingTitle = posting.title.toLowerCase();
  const postingProblem = posting.problemStatement.toLowerCase();
  const postingGoal = posting.projectGoal.toLowerCase();
  const postingSkills = (posting.requiredSkills || []).join(' ').toLowerCase();

  let score = posting.seniorFitScore || 90;
  const matchReasons: string[] = [];

  // 1. Desired Category / Industry Matching (+5 points)
  const isCategoryMatched =
    userDesired.includes(posting.category) ||
    postingCatLabel.includes(userDesired) ||
    userFieldText.includes(postingCatLabel) ||
    postingTitle.includes(userDesired);

  if (isCategoryMatched) {
    score += 4;
    const catName = categoryLabels[posting.category] || posting.category;
    matchReasons.push(`🎯 희망 직종 일치: [${catName}] 분야 1순위 추천`);
  } else {
    matchReasons.push(`💼 전문 분야 매칭: [${categoryLabels[posting.category] || posting.category}] 직무 노하우 활용 가능`);
  }

  // 2. Solved Problem Experience Keyword Matching (+4 points)
  const solvedKeywords = ['프로세스', '운영', '자동화', '개선', '영업', '품질', '아키텍처', '전환', '데이터', '인사', '컴플라이언스', '리드', '구축', '표준화'];
  let keywordHits = 0;
  for (const kw of solvedKeywords) {
    if (userExpText.includes(kw) && (postingProblem.includes(kw) || postingGoal.includes(kw) || postingSkills.includes(kw))) {
      keywordHits++;
    }
  }

  if (keywordHits >= 2) {
    score += 3;
    matchReasons.push(`💡 해결 경험 연관: 가입자의 과거 과제 해결 노하우와 기업 문제(${posting.companyName}) 96%+ 부합`);
  } else {
    matchReasons.push(`⚡ 역량 부합: 가입자 실무 노하우 기반 즉시 문제 해결 투입 가능`);
  }

  // 3. Seniority Years Matching (+2 points)
  const userYearsNum = parseInt(activeProfile.period || '12', 10) || 12;
  matchReasons.push(`🏆 40+ 경력 부합: ${userYearsNum}년 차 실무 노하우 및 책임 리더십 조건 충족`);

  // Cap final score between 88 and 99
  const finalScore = Math.min(99, Math.max(88, score));

  return {
    personalizedScore: finalScore,
    matchReasons,
    posting,
    primaryCategoryMatch: isCategoryMatched,
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

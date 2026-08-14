import { categoryLabels, type JobPosting, type ProjectCategory } from '@/data/jobPostings';
import type { SeniorProfileData } from '@/services/profileService';

export interface PersonalizedMatchResult {
  matchReasons: string[];
  personalizedScore: number;
  posting: JobPosting;
  primaryCategoryMatch: boolean;
}

const categorySearchKeywords: Record<ProjectCategory, string[]> = {
  'dev-engineering': ['개발자', '소프트웨어', '엔지니어'],
  'design-brand': ['디자인', 'UX', '브랜드'],
  'marketing-sales': ['마케팅', '영업', 'B2B'],
  'hr-strategy': ['인사', '경영기획', '조직'],
  'r-and-d-manufacturing': ['제조', '생산', '품질'],
  'legacy-modernization': ['ERP', '시스템 고도화', '전환'],
  'ai-automation': ['AI', '자동화', 'RPA'],
  'data-platform': ['데이터', 'DB', '분석'],
  security: ['보안', '리스크', '컴플라이언스'],
  growth: ['사업개발', '성장', '전략'],
  operations: ['운영', '프로세스', '서비스'],
};

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

function toProjectCategory(value?: string): ProjectCategory | null {
  return value && value in categoryLabels ? (value as ProjectCategory) : null;
}

export function getProfilePreferredCategories(profile?: SeniorProfileData | null) {
  const categories = [
    profile?.desiredCategory,
    profile?.desiredCategory2,
    profile?.desiredCategory3,
  ]
    .map(toProjectCategory)
    .filter((category): category is ProjectCategory => Boolean(category));
  return [...new Set(categories)];
}

export function hasProfileRecommendationCriteria(profile?: SeniorProfileData | null) {
  return Boolean(
    profile &&
    getProfilePreferredCategories(profile).length > 0 &&
    profile.field.trim() &&
    profile.period.trim() &&
    profile.experience.trim(),
  );
}

export function getProfileWorknetKeywords(profile?: SeniorProfileData | null) {
  const keywords = getProfilePreferredCategories(profile).flatMap(
    (category) => categorySearchKeywords[category],
  );
  return [...new Set(keywords)].slice(0, 9);
}

export function getProfileExperienceMonths(profile?: SeniorProfileData | null) {
  const years = Number.parseInt(profile?.period ?? '', 10);
  return Number.isFinite(years) && years > 0 ? years * 12 : undefined;
}

export function calculatePersonalizedMatch(
  posting: JobPosting,
  profile?: SeniorProfileData | null,
): PersonalizedMatchResult {
  if (!hasProfileRecommendationCriteria(profile)) {
    return {
      personalizedScore: 0,
      matchReasons: ['내 정보의 희망 직종과 경력 정보를 입력하면 적합도를 계산할 수 있습니다.'],
      posting,
      primaryCategoryMatch: false,
    };
  }

  const activeProfile = profile!;
  const desiredCategories = getProfilePreferredCategories(activeProfile);
  const categoryPriority = desiredCategories.indexOf(posting.category);
  const userExperienceText = [
    activeProfile.field,
    activeProfile.experience,
    activeProfile.solvedExperiences,
    activeProfile.keySkills,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const postingText = [
    posting.title,
    posting.industry,
    posting.problemStatement,
    posting.projectGoal,
    ...posting.requiredSkills,
    ...posting.preferredSkills,
    ...posting.matchingSignals,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchReasons: string[] = [];
  let baseScore = 70;

  if (categoryPriority === 0) {
    baseScore = 94;
    matchReasons.push(`1순위 희망 직종 ${categoryLabels[posting.category]}과 일치합니다.`);
  } else if (categoryPriority === 1) {
    baseScore = 87;
    matchReasons.push(`2순위 희망 직종 ${categoryLabels[posting.category]}과 일치합니다.`);
  } else if (categoryPriority === 2) {
    baseScore = 82;
    matchReasons.push(`3순위 희망 직종 ${categoryLabels[posting.category]}과 일치합니다.`);
  } else {
    matchReasons.push('선택한 희망 직종과 직접 일치하지 않아 참고 공고로 분류됩니다.');
  }

  const matchedKeywords = solvedKeywords.filter(
    (keyword) => userExperienceText.includes(keyword) && postingText.includes(keyword),
  );
  if (matchedKeywords.length >= 3) {
    baseScore += 4;
    matchReasons.push(`핵심 역량 ${matchedKeywords.slice(0, 3).join(', ')}이 공고와 일치합니다.`);
  } else if (matchedKeywords.length > 0) {
    baseScore += 2;
    matchReasons.push(`경력 키워드 ${matchedKeywords.join(', ')}가 공고와 연결됩니다.`);
  }

  const experienceYears = Number.parseInt(activeProfile.period, 10) || 0;
  if (experienceYears >= 10) {
    baseScore += 1;
    matchReasons.push(`입력한 경력 ${experienceYears}년을 반영했습니다.`);
  }

  const desiredLocation = activeProfile.desiredLocation?.trim();
  if (desiredLocation && desiredLocation !== '전국' && desiredLocation !== '전체') {
    const postingLoc = posting.location || '';
    const locKeyword = desiredLocation.replace(/(특별시|광역시|특별자치도|도|시)$/, '');
    if (postingLoc.includes(locKeyword) || postingLoc.includes(desiredLocation)) {
      baseScore += 2;
      matchReasons.push(`희망 근무 지역 ${desiredLocation}과 공고 위치(${postingLoc})가 일치합니다.`);
    } else {
      baseScore -= 3;
      matchReasons.push(`공고 위치(${postingLoc})가 희망 지역(${desiredLocation})과 다릅니다.`);
    }
  } else if (desiredLocation === '전국' || desiredLocation === '전체') {
    matchReasons.push('전국 희망 근무 지역 조건이 적용되었습니다.');
  }

  return {
    personalizedScore: Math.min(99, Math.max(0, baseScore)),
    matchReasons,
    posting,
    primaryCategoryMatch: categoryPriority >= 0,
  };
}

export function getPersonalizedRankedProjects(
  postings: JobPosting[],
  profile?: SeniorProfileData | null,
): { matchResult: PersonalizedMatchResult; posting: JobPosting }[] {
  return postings
    .map((posting) => {
      const matchResult = calculatePersonalizedMatch(posting, profile);
      return {
        posting: {
          ...posting,
          seniorFitScore: matchResult.personalizedScore,
        },
        matchResult,
      };
    })
    .sort(
      (first, second) => second.matchResult.personalizedScore - first.matchResult.personalizedScore,
    );
}

export function getProfileMatchedRankedProjects(
  postings: JobPosting[],
  profile?: SeniorProfileData | null,
) {
  if (!hasProfileRecommendationCriteria(profile)) return [];
  const preferredCategories = new Set(getProfilePreferredCategories(profile));
  const matchedPostings = postings.filter((posting) => preferredCategories.has(posting.category));
  return getPersonalizedRankedProjects(matchedPostings, profile);
}

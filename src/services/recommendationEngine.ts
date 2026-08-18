import type { JobPosting, ProjectCategory } from '@/data/jobPostings';
import {
  classifyOccupationCategoryFromJobText,
  mapOccupationCategoryToProject,
  mapProjectCategoryToOccupation,
  normalizeOccupationCategory,
  normalizeOccupationPreferenceValues,
  occupationCategoryLabels,
  occupationCategorySearchKeywords,
  OTHER_OCCUPATION_PREFERENCE,
  type OccupationCategory,
  type OccupationPreference,
} from '@/data/occupationCategories';
import type { SeniorProfileData } from '@/services/profileService';

export interface PersonalizedMatchResult {
  experienceRecommendationApplied: boolean;
  matchReasons: string[];
  personalizedScore: number;
  posting: JobPosting;
  primaryCategoryMatch: boolean;
  rankingScore: number;
}

export type RecommendationExperienceCard = {
  action: string;
  category?: ProjectCategory;
  problem: string;
  result: string;
  role: string;
  title: string;
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

const recommendationStopWords = new Set([
  '경력',
  '업무',
  '경험',
  '관련',
  '담당',
  '위한',
  '통한',
  '프로젝트',
  '채용',
  '지원',
  '있습니다',
  '합니다',
]);

function tokenizeRecommendationText(value: string) {
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(/[^0-9a-z가-힣+#.]+/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !recommendationStopWords.has(token)),
    ),
  ];
}

export function getExperienceCardRecommendationText(
  experienceCard?: RecommendationExperienceCard | null,
) {
  if (!experienceCard) return '';
  return [
    experienceCard.title,
    experienceCard.problem,
    experienceCard.role,
    experienceCard.action,
    experienceCard.result,
  ]
    .filter(Boolean)
    .join(' ');
}

export function getProfilePreferredCategories(profile?: SeniorProfileData | null) {
  return getProfilePreferredPreferences(profile).filter(
    (preference): preference is OccupationCategory =>
      preference !== OTHER_OCCUPATION_PREFERENCE,
  );
}

export function getProfilePreferredPreferences(
  profile?: SeniorProfileData | null,
): OccupationPreference[] {
  return normalizeOccupationPreferenceValues([
    profile?.desiredCategory,
    profile?.desiredCategory2,
    profile?.desiredCategory3,
  ]);
}

export function getProfilePrimaryCategory(profile?: SeniorProfileData | null) {
  return getProfilePreferredCategories(profile)[0];
}

export function getProfilePrimaryPreference(profile?: SeniorProfileData | null) {
  return getProfilePreferredPreferences(profile)[0];
}

export function getProfilePreferredProjectCategories(
  profile?: SeniorProfileData | null,
): ProjectCategory[] {
  return [
    ...new Set(
      getProfilePreferredCategories(profile)
        .map(mapOccupationCategoryToProject)
        .filter((category): category is ProjectCategory => Boolean(category)),
    ),
  ];
}

export function getPostingOccupationCategory(posting: JobPosting): OccupationCategory {
  const storedOccupationCategory = normalizeOccupationCategory(posting.occupationCategory);
  if (
    posting.occupationClassificationStatus === 'classified' &&
    storedOccupationCategory
  ) {
    return storedOccupationCategory;
  }

  const details = [
    posting.industry,
    ...(posting.coreResponsibilities || []),
    ...(posting.requiredSkills || []),
    ...(posting.qualifications || []),
  ].join(' ');
  const classification = classifyOccupationCategoryFromJobText(posting.title, details);
  if (classification.isConfident) {
    return classification.category;
  }
  return (
    storedOccupationCategory ??
    mapProjectCategoryToOccupation(posting.category) ??
    'general-legal-office'
  );
}

export function hasProfileRecommendationCriteria(profile?: SeniorProfileData | null) {
  const preferences = getProfilePreferredPreferences(profile);
  const hasUsableOccupationPreference = preferences.some(
    (preference) =>
      preference !== OTHER_OCCUPATION_PREFERENCE ||
      (profile?.desiredOccupationText?.trim().length ?? 0) >= 2,
  );
  return Boolean(
    profile &&
    hasUsableOccupationPreference &&
    profile.field.trim() &&
    profile.period.trim() &&
    profile.experience.trim(),
  );
}

export function getProfileWorknetKeywords(profile?: SeniorProfileData | null) {
  const keywords = getProfilePreferredCategories(profile).flatMap(
    (category) => occupationCategorySearchKeywords[category],
  );
  const otherOccupationKeywords = tokenizeRecommendationText(
    profile?.desiredOccupationText || '',
  );
  return [...new Set([...otherOccupationKeywords, ...keywords])].slice(0, 9);
}

export function doesPostingMatchDesiredOccupationText(
  posting: JobPosting,
  desiredOccupationText?: string | null,
) {
  const desiredTokens = tokenizeRecommendationText(desiredOccupationText || '');
  if (desiredTokens.length === 0) return false;
  const postingOccupationText = [
    posting.title,
    posting.industry,
    ...(posting.coreResponsibilities || []),
    ...(posting.requiredSkills || []),
    ...(posting.qualifications || []),
  ]
    .filter(Boolean)
    .join(' ');
  const postingTokens = new Set(tokenizeRecommendationText(postingOccupationText));
  if (desiredTokens.every((token) => postingTokens.has(token))) return true;
  const compactDesiredText = (desiredOccupationText || '')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣+#]+/g, '');
  const compactPostingText = postingOccupationText
    .toLowerCase()
    .replace(/[^0-9a-z가-힣+#]+/g, '');
  return compactDesiredText.length >= 3 && compactPostingText.includes(compactDesiredText);
}

export function getProfileExperienceMonths(profile?: SeniorProfileData | null) {
  const years = Number.parseInt(profile?.period ?? '', 10);
  return Number.isFinite(years) && years > 0 ? years * 12 : undefined;
}

export function calculatePersonalizedMatch(
  posting: JobPosting,
  profile?: SeniorProfileData | null,
  activePrimaryCategory?: string | null,
  experienceCard?: RecommendationExperienceCard | null,
): PersonalizedMatchResult {
  if (!hasProfileRecommendationCriteria(profile)) {
    return {
      personalizedScore: 0,
      experienceRecommendationApplied: false,
      matchReasons: ['내 정보의 희망 직종과 경력 정보를 입력하면 적합도를 계산할 수 있습니다.'],
      posting,
      primaryCategoryMatch: false,
      rankingScore: 0,
    };
  }

  const activeProfile = profile!;
  const desiredPreferences = getProfilePreferredPreferences(activeProfile);
  const postingOccupationCategory = getPostingOccupationCategory(posting);

  const normalizedPrimary = normalizeOccupationCategory(activePrimaryCategory);
  const isCustomOccupationActive = activePrimaryCategory === 'custom-match';
  const isSpecificCategoryActive = Boolean(
    normalizedPrimary && normalizedPrimary !== ('all' as unknown as OccupationCategory),
  );
  const otherOccupationMatch = doesPostingMatchDesiredOccupationText(
    posting,
    activeProfile.desiredOccupationText,
  );
  let categoryPriority: number;
  let matchedPreference: OccupationPreference | null;
  if (isCustomOccupationActive) {
    categoryPriority = otherOccupationMatch ? 0 : -1;
    matchedPreference = categoryPriority === 0 ? OTHER_OCCUPATION_PREFERENCE : null;
  } else if (isSpecificCategoryActive) {
    categoryPriority = normalizedPrimary === postingOccupationCategory ? 0 : -1;
    matchedPreference = categoryPriority === 0 ? normalizedPrimary : null;
  } else {
    const categoryPreferenceIndex = desiredPreferences.indexOf(postingOccupationCategory);
    const otherPreferenceIndex = desiredPreferences.indexOf(OTHER_OCCUPATION_PREFERENCE);
    const matchedOtherIndex = otherOccupationMatch ? otherPreferenceIndex : -1;
    const matchedIndexes = [categoryPreferenceIndex, matchedOtherIndex].filter((index) => index >= 0);
    categoryPriority = matchedIndexes.length > 0 ? Math.min(...matchedIndexes) : -1;
    matchedPreference = categoryPriority >= 0 ? desiredPreferences[categoryPriority] ?? null : null;
  }

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
    ...(posting.requiredSkills || []),
    ...(posting.preferredSkills || []),
    ...(posting.matchingSignals || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchReasons: string[] = [];
  let experienceRecommendationApplied = false;
  let baseScore: number;
  const categoryLabel =
    matchedPreference === OTHER_OCCUPATION_PREFERENCE
      ? activeProfile.desiredOccupationText?.trim() || '기타 직종'
      : matchedPreference
        ? occupationCategoryLabels[matchedPreference]
        : occupationCategoryLabels[postingOccupationCategory] || '선택 직종';

  if (isSpecificCategoryActive || isCustomOccupationActive) {
    if (categoryPriority >= 0) {
      baseScore = 94;
      matchReasons.push(
        `선택한 직종 ${categoryLabel}과(와) 공고 내용이 일치합니다.`,
      );
    } else {
      baseScore = 40;
      matchReasons.push(`선택한 직종과 다른 직종 공고입니다.`);
    }
  } else {
    if (categoryPriority === 0) {
      baseScore = 94;
      matchReasons.push(
        `1순위 희망 직종 ${categoryLabel}과 일치합니다.`,
      );
    } else if (categoryPriority === 1) {
      baseScore = 87;
      matchReasons.push(
        `2순위 희망 직종 ${categoryLabel}과 일치합니다.`,
      );
    } else if (categoryPriority === 2) {
      baseScore = 82;
      matchReasons.push(
        `3순위 희망 직종 ${categoryLabel}과 일치합니다.`,
      );
    } else {
      baseScore = 40;
      matchReasons.push('등록한 희망 직종과 직접 일치하지 않아 참고 공고로 분류됩니다.');
    }
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

  const profileSpecialtyText = [
    activeProfile.field,
    activeProfile.solvedExperiences,
    activeProfile.keySkills,
  ]
    .filter(Boolean)
    .join(' ');
  const profileSpecialtyTokens = tokenizeRecommendationText(profileSpecialtyText);
  const postingTokens = new Set(tokenizeRecommendationText(postingText));
  const sharedProfileTokens = profileSpecialtyTokens.filter((token) => postingTokens.has(token));
  if (sharedProfileTokens.length >= 3) {
    baseScore += 7;
    matchReasons.push(
      `내 정보의 ${sharedProfileTokens.slice(0, 3).join(', ')} 전문 분야가 공고와 밀접하게 일치합니다.`,
    );
  } else if (sharedProfileTokens.length === 2) {
    baseScore += 5;
    matchReasons.push(`내 정보의 ${sharedProfileTokens.join(', ')} 전문 분야가 공고와 일치합니다.`);
  } else if (sharedProfileTokens.length === 1) {
    baseScore += 1;
    matchReasons.push(`내 정보의 ${sharedProfileTokens[0]} 관련 경험을 반영했습니다.`);
  }

  const experienceCardText = getExperienceCardRecommendationText(experienceCard);
  if (experienceCardText) {
    const experienceOccupationCategory = experienceCard?.category
      ? mapProjectCategoryToOccupation(experienceCard.category)
      : undefined;
    const experienceTokens = tokenizeRecommendationText(experienceCardText);
    const matchedExperienceTokens = experienceTokens.filter((token) => postingText.includes(token));

    if (experienceOccupationCategory === postingOccupationCategory) {
      baseScore += 3;
      experienceRecommendationApplied = true;
      matchReasons.push('AI 경험 인터뷰의 직무 분야가 이 공고와 일치합니다.');
    }

    if (matchedExperienceTokens.length >= 3) {
      baseScore += 5;
      experienceRecommendationApplied = true;
      matchReasons.push(
        `AI 경험 인터뷰의 ${matchedExperienceTokens.slice(0, 3).join(', ')} 경험이 공고와 연결됩니다.`,
      );
    } else if (matchedExperienceTokens.length > 0) {
      baseScore += 2;
      experienceRecommendationApplied = true;
      matchReasons.push(
        `AI 경험 인터뷰의 ${matchedExperienceTokens.slice(0, 2).join(', ')} 경험을 반영했습니다.`,
      );
    }
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
      matchReasons.push(
        `희망 근무 지역 ${desiredLocation}과 공고 위치(${postingLoc})가 일치합니다.`,
      );
    } else {
      baseScore -= 3;
      matchReasons.push(`공고 위치(${postingLoc})가 희망 지역(${desiredLocation})과 다릅니다.`);
    }
  } else if (desiredLocation === '전국' || desiredLocation === '전체') {
    matchReasons.push('전국 희망 근무 지역 조건이 적용되었습니다.');
  }

  return {
    personalizedScore: Math.min(99, Math.max(0, baseScore)),
    experienceRecommendationApplied,
    matchReasons,
    posting,
    primaryCategoryMatch: categoryPriority >= 0,
    rankingScore: baseScore,
  };
}

export function getPersonalizedRankedProjects(
  postings: JobPosting[],
  profile?: SeniorProfileData | null,
  activePrimaryCategory?: string | null,
  experienceCard?: RecommendationExperienceCard | null,
): { matchResult: PersonalizedMatchResult; posting: JobPosting }[] {
  return postings
    .map((posting) => {
      const matchResult = calculatePersonalizedMatch(
        posting,
        profile,
        activePrimaryCategory,
        experienceCard,
      );
      return {
        posting: {
          ...posting,
          seniorFitScore: matchResult.personalizedScore,
          recommendationReasons: matchResult.matchReasons,
          experienceRecommendationApplied: matchResult.experienceRecommendationApplied,
        },
        matchResult,
      };
    })
    .sort((first, second) => {
      if (first.matchResult.primaryCategoryMatch !== second.matchResult.primaryCategoryMatch) {
        return first.matchResult.primaryCategoryMatch ? -1 : 1;
      }
      return second.matchResult.rankingScore - first.matchResult.rankingScore;
    });
}

export function getProfileMatchedRankedProjects(
  postings: JobPosting[],
  profile?: SeniorProfileData | null,
  activePrimaryCategory?: string | null,
  experienceCard?: RecommendationExperienceCard | null,
) {
  if (!hasProfileRecommendationCriteria(profile)) {
    return getPersonalizedRankedProjects(postings, profile, activePrimaryCategory, experienceCard);
  }

  const targetCategory =
    normalizeOccupationCategory(activePrimaryCategory) ?? getProfilePrimaryCategory(profile);
  const targetPreference =
    activePrimaryCategory === 'custom-match'
      ? OTHER_OCCUPATION_PREFERENCE
      : targetCategory ?? getProfilePrimaryPreference(profile);

  const matchedPostings = postings.filter((posting) => {
    if (targetPreference === OTHER_OCCUPATION_PREFERENCE) {
      return doesPostingMatchDesiredOccupationText(posting, profile?.desiredOccupationText);
    }
    return targetPreference
      ? getPostingOccupationCategory(posting) === targetPreference
      : false;
  });
  return getPersonalizedRankedProjects(
    matchedPostings,
    profile,
    targetPreference === OTHER_OCCUPATION_PREFERENCE
      ? 'custom-match'
      : targetCategory,
    experienceCard,
  );
}

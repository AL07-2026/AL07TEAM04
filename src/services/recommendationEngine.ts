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

const recommendationStopWords = new Set([
  '경력',
  '업무',
  '경험',
  '결과',
  '문제',
  '역할',
  '실행',
  '진행',
  '관련',
  '담당',
  '위해',
  '위한',
  '통해',
  '통한',
  '대한',
  '프로젝트',
  '채용',
  '공고',
  '지원',
  '있습니다',
  '합니다',
]);
const specialtyGenericTokens = new Set([
  ...recommendationStopWords,
  '경력',
  '관련',
  '다수',
  '디자인',
  '설계',
  '개발',
  '기획',
  '관리',
  '운영',
  '전략',
  '자료',
  '고도화',
  '서비스',
  '프로세스',
  '구축',
  '표준화',
  '개선',
  '전문',
  '분야',
  '핵심',
  '강점',
  '총괄',
  '수립',
  '제작',
  '품질',
  '활용',
  '기반',
  '리드',
  '디렉터',
  '전문가',
  '성과',
  '사례',
]);
const specialtyAliasTokens = new Set([
  'ux',
  'ui',
  'uxui',
  'ux디자인',
  'ui디자인',
  '브랜드',
  '브랜딩',
  '리브랜딩',
  '아이덴티티',
  '시각',
  '시각관련',
  '그래픽',
  '비주얼',
  '영상',
  '모션',
  '비디오',
  '인테리어',
  '실내',
  '런칭',
  '론칭',
  '출시',
  'cad',
  '캐드',
]);
const specialtyConceptPatterns: ReadonlyArray<readonly [string, RegExp]> = [
  ['ux', /\bux\b|사용자\s*경험|프로덕트\s*디자|product\s*design/i],
  ['ui', /\bui\b|사용자\s*인터페이스|프로덕트\s*디자|product\s*design/i],
  ['branding', /브랜[드딩]|리브랜딩|아이덴티티|\b(?:bi|ci)\b/i],
  ['design-system', /디자인\s*시스템|design\s*system/i],
  ['service-launch', /(?:서비스|제품)\s*(?:런칭|론칭|출시)|\blaunch/i],
  ['visual-design', /시각|그래픽|비주얼|편집\s*디자인/i],
  ['motion-video', /영상|모션|비디오|영화|드라마|포스터/i],
  ['interior-space', /인테리어|실내|공간\s*디자인|가구\s*설계/i],
  ['cad-drawing', /\bcad\b|캐드|3d\s*도면/i],
];
const specialtyConceptLabels: Readonly<Record<string, string>> = {
  ux: 'UX',
  ui: 'UI',
  branding: '브랜딩',
  'design-system': '디자인 시스템',
  'service-launch': '서비스 런칭',
  'visual-design': '시각 디자인',
  'motion-video': '영상 디자인',
  'interior-space': '인테리어',
  'cad-drawing': 'CAD 도면',
};

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

function getSpecialtyTokens(value: string): string[] {
  const normalized = value.toLowerCase();
  const tokens = tokenizeRecommendationText(normalized).filter(
    (token) => !specialtyGenericTokens.has(token) && !specialtyAliasTokens.has(token),
  );
  for (const [concept, pattern] of specialtyConceptPatterns) {
    if (pattern.test(normalized)) tokens.push(concept);
  }
  return [...new Set(tokens)];
}

function formatSpecialtyTokens(tokens: string[]): string[] {
  return tokens.map((token) => specialtyConceptLabels[token] ?? token);
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
    profile.period.trim(),
  );
}

export function getProfileWorknetKeywords(profile?: SeniorProfileData | null) {
  const keywords = getProfilePreferredCategories(profile).flatMap(
    (category) => occupationCategorySearchKeywords[category],
  );
  const otherOccupationKeywords = tokenizeRecommendationText(
    profile?.desiredOccupationText || '',
  );
  const certificationKeywords = tokenizeRecommendationText(profile?.certifications || '');
  return [...new Set([...otherOccupationKeywords, ...certificationKeywords, ...keywords])].slice(
    0,
    9,
  );
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

function matchesDesiredWorkType(posting: JobPosting, desiredWorkType?: string | null) {
  const preference = desiredWorkType?.trim() || '';
  if (!preference || preference.includes('전체 무관')) return null;
  const workText = [
    posting.employmentType,
    posting.title,
    posting.workSchedule,
    posting.projectDuration,
  ]
    .filter(Boolean)
    .join(' ');

  if (/시간제|파트타임|오전|오후/.test(preference)) {
    return posting.employmentType === 'part-time' || /시간제|파트타임|오전|오후/.test(workText);
  }
  if (/계약직|기간제/.test(preference)) {
    return posting.employmentType === 'contract' || /계약직|기간제/.test(workText);
  }
  if (/정규직/.test(preference)) {
    return posting.employmentType === 'full-time' || /정규직/.test(workText);
  }
  if (/자문|프로젝트/.test(preference)) {
    return ['contract', 'project'].includes(posting.employmentType) || /자문|프로젝트/.test(workText);
  }
  return null;
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

  const postingPrimaryText = [posting.title, posting.industry]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const postingDetailText = [
    ...(posting.coreResponsibilities || []),
    ...(posting.qualifications || []),
    ...(posting.requiredSkills || []),
    ...(posting.preferredSkills || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const postingEvidenceText = `${postingPrimaryText} ${postingDetailText}`.trim();

  const matchReasons: string[] = [];
  let experienceRecommendationApplied = false;
  let baseScore: number;
  const categoryLabel =
    matchedPreference === OTHER_OCCUPATION_PREFERENCE
      ? activeProfile.desiredOccupationText?.trim() || '기타 직종'
      : matchedPreference
        ? occupationCategoryLabels[matchedPreference]
        : occupationCategoryLabels[postingOccupationCategory] || '선택 직종';

  const profileSpecialtyText = [
    activeProfile.field,
    activeProfile.experience === activeProfile.desiredWorkType ? '' : activeProfile.experience,
    activeProfile.solvedExperiences,
    activeProfile.keySkills,
  ]
    .filter(Boolean)
    .join(' ');
  const profileFieldTokens = getSpecialtyTokens(activeProfile.field);
  const profileSpecialtyTokens = getSpecialtyTokens(profileSpecialtyText);
  const postingTokens = new Set(tokenizeRecommendationText(postingEvidenceText));
  const primarySpecialtyTokens = new Set(getSpecialtyTokens(postingPrimaryText));
  const detailSpecialtyTokens = new Set(getSpecialtyTokens(postingDetailText));
  const sharedPrimaryFieldTokens = profileFieldTokens.filter((token) =>
    primarySpecialtyTokens.has(token),
  );
  const sharedPrimaryFieldTokenSet = new Set(sharedPrimaryFieldTokens);
  const sharedDetailFieldTokens = profileFieldTokens.filter(
    (token) => detailSpecialtyTokens.has(token) && !sharedPrimaryFieldTokenSet.has(token),
  );
  const sharedFieldTokenSet = new Set([
    ...sharedPrimaryFieldTokens,
    ...sharedDetailFieldTokens,
  ]);
  const sharedPrimaryEvidenceTokens = profileSpecialtyTokens.filter(
    (token) => primarySpecialtyTokens.has(token) && !sharedFieldTokenSet.has(token),
  );
  const sharedPrimaryEvidenceTokenSet = new Set(sharedPrimaryEvidenceTokens);
  const sharedDetailEvidenceTokens = profileSpecialtyTokens.filter(
    (token) =>
      detailSpecialtyTokens.has(token) &&
      !sharedFieldTokenSet.has(token) &&
      !sharedPrimaryEvidenceTokenSet.has(token),
  );

  if (isSpecificCategoryActive || isCustomOccupationActive) {
    if (categoryPriority >= 0) {
      baseScore = 52;
      matchReasons.push(
        `선택한 직종 ${categoryLabel}과(와) 공고 내용이 일치합니다.`,
      );
    } else {
      baseScore = 20;
      matchReasons.push(`선택한 직종과 다른 직종 공고입니다.`);
    }
  } else {
    if (categoryPriority === 0) {
      baseScore = 52;
      matchReasons.push(
        `1순위 희망 직종 ${categoryLabel}과 일치합니다.`,
      );
    } else if (categoryPriority === 1) {
      baseScore = 40;
      matchReasons.push(
        `2순위 희망 직종 ${categoryLabel}과 일치합니다.`,
      );
    } else if (categoryPriority === 2) {
      baseScore = 30;
      matchReasons.push(
        `3순위 희망 직종 ${categoryLabel}과 일치합니다.`,
      );
    } else {
      baseScore = 20;
      matchReasons.push('등록한 희망 직종과 직접 일치하지 않아 참고 공고로 분류됩니다.');
    }
  }

  if (sharedPrimaryFieldTokens.length > 0) {
    baseScore += Math.min(24, sharedPrimaryFieldTokens.length * 8);
    const fieldCoverage =
      profileFieldTokens.length > 0
        ? sharedPrimaryFieldTokens.length / profileFieldTokens.length
        : 0;
    if (fieldCoverage >= 0.75) baseScore += 8;
    else if (fieldCoverage >= 0.5) baseScore += 4;
    matchReasons.push(
      `내 정보의 ${formatSpecialtyTokens(sharedPrimaryFieldTokens.slice(0, 3)).join(', ')} 전문 분야가 공고 제목·업종과 일치합니다.`,
    );
  }
  if (sharedDetailFieldTokens.length > 0) {
    baseScore += Math.min(6, sharedDetailFieldTokens.length * 2);
    matchReasons.push(
      `상세 업무 일부에서 ${formatSpecialtyTokens(sharedDetailFieldTokens.slice(0, 3)).join(', ')} 연관 요소를 확인했습니다.`,
    );
  }
  if (sharedPrimaryEvidenceTokens.length > 0) {
    baseScore += Math.min(15, sharedPrimaryEvidenceTokens.length * 5);
    matchReasons.push(
      `세부 경력의 ${formatSpecialtyTokens(sharedPrimaryEvidenceTokens.slice(0, 3)).join(', ')} 맥락이 공고 제목·업종과 일치합니다.`,
    );
  }
  if (sharedDetailEvidenceTokens.length > 0) {
    baseScore += Math.min(6, sharedDetailEvidenceTokens.length * 2);
    matchReasons.push(
      `상세 업무에서 세부 경력의 ${formatSpecialtyTokens(sharedDetailEvidenceTokens.slice(0, 3)).join(', ')} 연관성을 확인했습니다.`,
    );
  }

  const certificationTokens = tokenizeRecommendationText(activeProfile.certifications || '');
  const matchedCertificationTokens = certificationTokens.filter((token) =>
    postingTokens.has(token),
  );
  if (matchedCertificationTokens.length > 0) {
    baseScore += Math.min(4, matchedCertificationTokens.length + 2);
    matchReasons.push(
      `보유 자격증 ${matchedCertificationTokens.slice(0, 2).join(', ')}이 공고 조건과 일치합니다.`,
    );
  }

  const experienceCardText = getExperienceCardRecommendationText(experienceCard);
  if (experienceCardText) {
    const experienceOccupationCategory = experienceCard?.category
      ? mapProjectCategoryToOccupation(experienceCard.category)
      : undefined;
    const experienceTokens = tokenizeRecommendationText(experienceCardText);
    const matchedExperienceTokens = experienceTokens.filter((token) =>
      postingTokens.has(token),
    );

    if (experienceOccupationCategory === postingOccupationCategory) {
      baseScore += 3;
      experienceRecommendationApplied = true;
      matchReasons.push('AI 경험 인터뷰의 직무 분야가 이 공고와 일치합니다.');
    }

    if (matchedExperienceTokens.length >= 3) {
      baseScore += 4;
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

  const desiredWorkTypeMatch = matchesDesiredWorkType(posting, activeProfile.desiredWorkType);
  if (desiredWorkTypeMatch === true) {
    baseScore += 3;
    matchReasons.push(`원하는 근무 형태 ‘${activeProfile.desiredWorkType}’와 공고 조건이 일치합니다.`);
  } else if (desiredWorkTypeMatch === false) {
    baseScore -= 2;
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
      baseScore -= 5;
      matchReasons.push(`공고 위치(${postingLoc})가 희망 지역(${desiredLocation})과 다릅니다.`);
    }
  } else if (desiredLocation === '전국' || desiredLocation === '전체') {
    matchReasons.push('전국 희망 근무 지역 조건이 적용되었습니다.');
  }

  let finalScore = baseScore;
  if (categoryPriority < 0) {
    finalScore = Math.min(45, Math.max(15, finalScore));
  } else if (categoryPriority === 0) {
    finalScore = Math.min(98, Math.max(15, finalScore));
  } else if (categoryPriority === 1) {
    finalScore = Math.min(90, Math.max(15, finalScore));
  } else if (categoryPriority === 2) {
    finalScore = Math.min(82, Math.max(15, finalScore));
  }

  return {
    personalizedScore: Math.round(finalScore),
    experienceRecommendationApplied,
    matchReasons,
    posting,
    primaryCategoryMatch: categoryPriority >= 0,
    rankingScore: Math.round(baseScore),
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
      return (
        second.matchResult.personalizedScore - first.matchResult.personalizedScore ||
        second.matchResult.rankingScore - first.matchResult.rankingScore ||
        (new Date(second.posting.postedAt).getTime() || 0) - (new Date(first.posting.postedAt).getTime() || 0) ||
        first.posting.id.localeCompare(second.posting.id)
      );
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

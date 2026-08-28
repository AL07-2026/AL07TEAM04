import { createHash } from 'node:crypto';

import { adminDb } from './firestoreAdmin.mjs';
import { classifyOccupationCategoryFromJobText, normalizeCompanyAndTitle } from './backendAccumulator.mjs';
import { containsUtf8Replacement } from './httpEncoding.mjs';
import { deduplicateJobCatalog } from './jobDeduplication.mjs';

const GLOBAL_COLLECTION = 'global_job_postings';
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_RESULT_CACHE_TTL_MS = 60 * 1000;
const MAX_SEARCH_RESULT_CACHE_ENTRIES = 100;
const MAX_PAGE_SIZE = 24;
const UNCLASSIFIED_OCCUPATION_FILTER = 'unclassified';
const OTHER_OCCUPATION_PREFERENCE = 'other';
const occupationCategoryIds = new Set([
  'planning-strategy',
  'marketing-pr-research',
  'accounting-tax-finance',
  'hr-labor-hrd',
  'general-legal-office',
  'it-development-data',
  'design',
  'sales-retail-trade',
  'customer-service-tm',
  'procurement-materials-logistics',
  'product-planning-md',
  'driving-transport-delivery',
  'service',
  'production',
  'construction-architecture',
  'medical',
  'research-rd',
  'education',
  'media-culture-sports',
  'finance-insurance',
  'public-welfare',
]);

const legacyProjectCategoryMap = {
  'dev-engineering': 'it-development-data',
  'design-brand': 'design',
  'marketing-sales': 'marketing-pr-research',
  'hr-strategy': 'hr-labor-hrd',
  'r-and-d-manufacturing': 'research-rd',
  'legacy-modernization': 'it-development-data',
  'ai-automation': 'it-development-data',
  'data-platform': 'it-development-data',
  security: 'it-development-data',
  growth: 'planning-strategy',
  operations: 'service',
};
const projectCategoryIds = new Set(Object.keys(legacyProjectCategoryMap));

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
  '경험',
  '결과',
  '문제',
  '업무',
  '역할',
  '실행',
  '진행',
  '프로젝트',
  '채용',
  '공고',
  '담당',
  '통해',
  '위해',
  '대한',
]);

let catalogCache = null;
let catalogLoadPromise = null;
const searchResultCache = new Map();

export function clearJobCatalogCache() {
  catalogCache = null;
  catalogLoadPromise = null;
  searchResultCache.clear();
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function positiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function parseDateValue(value, fallback) {
  const timestamp = new Date(asString(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function isPostingExpired(posting, now) {
  const deadline = asString(posting.deadline).match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!deadline) return false;
  const deadlineTime = new Date(`${deadline}T23:59:59+09:00`).getTime();
  return Number.isFinite(deadlineTime) && deadlineTime < now.getTime();
}

function resolveOccupationClassification(posting) {
  const details = [
    posting.industry,
    ...asStringArray(posting.coreResponsibilities),
    ...asStringArray(posting.requiredSkills),
    ...asStringArray(posting.qualifications),
  ].join(' ');
  const structuredOccupation = posting.source === 'seoul' ? asString(posting.industry) : '';
  const classification = classifyOccupationCategoryFromJobText(
    posting.title || '',
    details,
    structuredOccupation,
  );
  if (classification.isConfident) return classification;

  const storedCategory = asString(posting.occupationCategory);
  const canTrustStoredCategory =
    !['public', 'seoul'].includes(asString(posting.source)) &&
    occupationCategoryIds.has(storedCategory);
  if (canTrustStoredCategory) {
    return {
      ...classification,
      category: storedCategory,
      confidence: Math.max(classification.confidence, 0.85),
      isConfident: true,
      source: 'stored',
    };
  }

  const legacyCategory = legacyProjectCategoryMap[posting.category];
  if (!posting.source && legacyCategory) {
    return {
      ...classification,
      category: legacyCategory,
      confidence: Math.max(classification.confidence, 0.8),
      isConfident: true,
      source: 'legacy',
    };
  }

  return classification;
}

function matchesEmploymentType(posting, employmentType) {
  if (!employmentType || employmentType === 'all') return true;
  const title = asString(posting.title);
  const schedule = asString(posting.workSchedule);
  const experience = asString(posting.experienceYears);
  if (employmentType === 'part-time') {
    return (
      posting.employmentType === 'part-time' ||
      /시간제|파트타임|오전|오후/.test(`${title} ${schedule} ${experience}`)
    );
  }
  if (employmentType === 'contract') {
    return posting.employmentType === 'contract' || /계약직|기간제/.test(`${title} ${experience}`);
  }
  return posting.employmentType === employmentType;
}

function searchableText(posting) {
  return [
    posting.companyName,
    posting.title,
    posting.industry,
    posting.location,
    posting.problemStatement,
    posting.projectGoal,
    posting.recommendedTalentType,
    ...asStringArray(posting.coreResponsibilities),
    ...asStringArray(posting.qualifications),
    ...asStringArray(posting.requiredSkills),
    ...asStringArray(posting.preferredSkills),
    ...asStringArray(posting.matchingSignals),
    ...asStringArray(posting.interviewFocus),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function occupationMatchText(posting) {
  return [
    posting.title,
    posting.industry,
    ...asStringArray(posting.coreResponsibilities),
    ...asStringArray(posting.requiredSkills),
    ...asStringArray(posting.qualifications),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function tokenizeRecommendationText(value) {
  return new Set(
    asString(value)
      .toLowerCase()
      .split(/[^0-9a-zA-Z가-힣+#]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !recommendationStopWords.has(token)),
  );
}

function createFitContext(options) {
  return {
    desiredOccupationCompact: asString(options.desiredOccupationText)
      .toLowerCase()
      .replace(/[^0-9a-zA-Z가-힣+#]+/g, ''),
    desiredOccupationTokens: tokenizeRecommendationText(options.desiredOccupationText),
    experienceOccupationCategory: legacyProjectCategoryMap[options.experienceCardCategory],
    experienceTokens: tokenizeRecommendationText(options.experienceCardText),
    profileText: options.profileText.toLowerCase(),
    profileTokens: tokenizeRecommendationText(options.profileText),
  };
}

function matchesDesiredOccupationText(entry, context) {
  if (context.desiredOccupationTokens.size === 0) return false;
  const postingTokens = tokenizeRecommendationText(entry.occupationMatchText);
  const tokensMatch = [...context.desiredOccupationTokens].every((token) =>
    postingTokens.has(token),
  );
  if (tokensMatch) return true;
  const compactPostingText = entry.occupationMatchText.replace(
    /[^0-9a-zA-Z가-힣+#]+/g,
    '',
  );
  return (
    context.desiredOccupationCompact.length >= 3 &&
    compactPostingText.includes(context.desiredOccupationCompact)
  );
}

function calculateFitMatch(entry, options, context) {
  const { occupationCategory, posting, searchText: postingText } = entry;
  let categoryPriority = options.desiredCategories.indexOf(occupationCategory);
  const desiredOccupationMatch = matchesDesiredOccupationText(entry, context);
  const desiredOccupationPriority =
    desiredOccupationMatch && options.desiredOccupationRank > 0
      ? options.desiredOccupationRank - 1
      : -1;
  const directOccupationMatchApplied =
    desiredOccupationPriority >= 0 &&
    (categoryPriority < 0 || desiredOccupationPriority < categoryPriority);
  if (directOccupationMatchApplied) categoryPriority = desiredOccupationPriority;
  const postingTokens = tokenizeRecommendationText(postingText);
  const sharedProfileTokens = [...context.profileTokens].filter((token) => postingTokens.has(token));
  const matchingKeywords = solvedKeywords.filter(
    (keyword) => context.profileText.includes(keyword) && postingText.includes(keyword),
  );

  const specialtyDomainStopWords = new Set([
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
    '경험',
    '경력',
    '업무',
    '프로젝트',
    '채용',
    '지원',
  ]);

  const domainSpecificProfileTokens = sharedProfileTokens.filter(
    (token) => !specialtyDomainStopWords.has(token),
  );
  const domainSpecificKeywords = matchingKeywords.filter(
    (keyword) => !specialtyDomainStopWords.has(keyword),
  );

  const hasStrongSubSpecialtyMatch =
    domainSpecificProfileTokens.length >= 2 ||
    (domainSpecificProfileTokens.length >= 1 && domainSpecificKeywords.length >= 1);

  let score = categoryPriority === 0 ? (hasStrongSubSpecialtyMatch ? 88 : 78) : categoryPriority === 1 ? (hasStrongSubSpecialtyMatch ? 74 : 66) : categoryPriority === 2 ? (hasStrongSubSpecialtyMatch ? 60 : 54) : 28;
  const reasons = [];
  if (directOccupationMatchApplied) {
    reasons.push(
      `내 정보의 ${options.desiredOccupationRank}순위 기타 희망 직종 ‘${options.desiredOccupationText}’과 공고 내용이 일치합니다.`,
    );
  } else if (categoryPriority === 0) reasons.push('1순위 희망 직종과 일치합니다.');
  else if (categoryPriority === 1) reasons.push('2순위 희망 직종과 일치합니다.');
  else if (categoryPriority === 2) reasons.push('3순위 희망 직종과 일치합니다.');

  if (matchingKeywords.length >= 3) {
    score += 6;
    reasons.push(`핵심 역량 ${matchingKeywords.slice(0, 3).join(', ')}이 공고와 일치합니다.`);
  } else if (matchingKeywords.length > 0) {
    score += 3;
    reasons.push(`경력 키워드 ${matchingKeywords.join(', ')}가 공고와 연결됩니다.`);
  }

  if (sharedProfileTokens.length >= 3) {
    score += 6;
    reasons.push(
      `내 정보의 ${sharedProfileTokens.slice(0, 3).join(', ')} 전문 분야가 공고와 밀접하게 일치합니다.`,
    );
  } else if (sharedProfileTokens.length === 2) {
    score += 4;
    reasons.push(`내 정보의 ${sharedProfileTokens.join(', ')} 전문 분야가 공고와 일치합니다.`);
  } else if (sharedProfileTokens.length === 1) {
    score += 2;
    reasons.push(`내 정보의 ${sharedProfileTokens[0]} 관련 경험을 반영했습니다.`);
  }

  let experienceRecommendationApplied = false;
  if (context.experienceOccupationCategory === occupationCategory) {
    score += 3;
    experienceRecommendationApplied = true;
    reasons.push('AI 경험 인터뷰의 직무 분야가 이 공고와 일치합니다.');
  }

  if (context.experienceTokens.size > 0) {
    const sharedExperienceTokens = [...context.experienceTokens].filter((token) =>
      postingTokens.has(token),
    );
    if (sharedExperienceTokens.length >= 3) {
      score += 4;
      experienceRecommendationApplied = true;
      reasons.push(
        `AI 경험 인터뷰의 ${sharedExperienceTokens.slice(0, 3).join(', ')} 경험이 공고와 연결됩니다.`,
      );
    } else if (sharedExperienceTokens.length > 0) {
      score += 2;
      experienceRecommendationApplied = true;
      reasons.push(`AI 경험 인터뷰의 ${sharedExperienceTokens.slice(0, 2).join(', ')} 경험을 반영했습니다.`);
    }
  }

  if (options.experienceYears >= 10) score += 2;

  if (options.desiredLocation && !['전국', '전체'].includes(options.desiredLocation)) {
    const locationKeyword = options.desiredLocation.replace(/(특별시|광역시|특별자치도|도|시)$/, '');
    const postingLocation = asString(posting.location);
    score +=
      postingLocation.includes(locationKeyword) || postingLocation.includes(options.desiredLocation)
        ? 2
        : -5;
  }

  let finalScore = score;
  if (categoryPriority < 0) {
    finalScore = Math.min(45, Math.max(15, finalScore));
  } else if (categoryPriority === 0) {
    if (hasStrongSubSpecialtyMatch) {
      finalScore = Math.min(98, Math.max(90, finalScore));
    } else {
      finalScore = Math.min(85, Math.max(75, finalScore));
    }
  } else if (categoryPriority === 1) {
    finalScore = Math.min(84, Math.max(65, finalScore));
  } else if (categoryPriority === 2) {
    finalScore = Math.min(72, Math.max(50, finalScore));
  }

  return {
    experienceRecommendationApplied,
    rankScore: Math.round(score),
    reasons,
    score: Math.round(finalScore),
  };
}

export function normalizeJobSearchOptions(raw = {}) {
  const categories = asString(raw.categories)
    .split(',')
    .map((value) => value.trim())
    .filter(
      (value) =>
        occupationCategoryIds.has(value) || value === UNCLASSIFIED_OCCUPATION_FILTER,
    );
  const desiredCategories = asString(raw.desiredCategories)
    .split(',')
    .map((value) => value.trim())
    .filter(
      (value) =>
        occupationCategoryIds.has(value) || value === OTHER_OCCUPATION_PREFERENCE,
    );

  return {
    categories: [...new Set(categories)],
    desiredCategories: [...new Set(desiredCategories)],
    desiredLocation: asString(raw.desiredLocation).slice(0, 50),
    desiredOccupationRank: positiveInteger(raw.desiredOccupationRank, 0, 3),
    desiredOccupationText: asString(raw.desiredOccupationText).slice(0, 120),
    employmentType: asString(raw.employmentType),
    experienceCardCategory: projectCategoryIds.has(asString(raw.experienceCardCategory))
      ? asString(raw.experienceCardCategory)
      : '',
    experienceCardText: asString(raw.experienceCardText).slice(0, 4000),
    experienceYears: positiveInteger(raw.experienceYears, 0, 80),
    hiringStage: asString(raw.hiringStage),
    page: positiveInteger(raw.page, 1, 100_000),
    pageSize: positiveInteger(raw.pageSize, 12, MAX_PAGE_SIZE),
    profileText: asString(raw.profileText).slice(0, 2000),
    query: asString(raw.q).toLowerCase().slice(0, 120),
    requireDesiredOccupationMatch: asString(raw.requireDesiredOccupationMatch) === 'true',
    sortBy: ['fit-desc', 'deadline-asc', 'latest-desc'].includes(raw.sortBy)
      ? raw.sortBy
      : 'fit-desc',
    workType: asString(raw.workType),
  };
}

function sanitizeAndEnhanceProblemStatement(posting) {
  let ps = typeof posting?.problemStatement === 'string' ? posting.problemStatement.trim() : '';

  ps = ps.replace(/^\[(?:서울시 일자리(?: 분석)?|공공기관 채용(?: 분석)?|시니어 맞춤 채용|시니어 맞춤)\]\s*/g, '').trim();
  ps = ps.replace(/^\[[^\]]+\]\s*/g, '').trim();
  ps = ps.replace(/\s*공개채용(?:\s*프로젝트입니다\.?)?$/gi, '').trim();
  ps = ps.replace(/\s*경력직(?:\s*프로젝트입니다\.?)?$/gi, '').trim();
  ps = ps.replace(/\s*채용\s*채용$/gi, '').trim();
  ps = ps.replace(/\s*채용입니다\.?$/gi, '').trim();
  ps = ps.replace(/\s*모집합니다\.?\s*(?:채용)?\s*(?:프로젝트입니다\.?)?$/gi, '').trim();
  ps = ps.replace(/\s*채용\s*프로젝트입니다\.?$/gi, '').trim();

  // Clean leading grammar fragments
  ps = ps.replace(/^(?:에서|으로|의|과|와|을|를)\s+/g, '').trim();

  const title = typeof posting?.title === 'string' ? posting.title.trim() : '';
  const companyName = typeof posting?.companyName === 'string' ? posting.companyName.trim() : '';
  const industry = typeof posting?.industry === 'string' ? posting.industry.trim() : '';
  const category = posting?.category || legacyProjectCategoryMap[posting?.occupationCategory] || 'operations';

  // Strip company name prefix if present
  if (companyName) {
    const safeComp = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ps = ps.replace(new RegExp(`^(?:\\(주\\)\\s*)?${safeComp}(?:의|에서|\\s+)+`, 'i'), '').trim();
    ps = ps.replace(new RegExp(`^${safeComp}\\s*`, 'i'), '').trim();
  }

  // Strip title prefix or quote prefix if present
  if (title) {
    const safeTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ps = ps.replace(new RegExp(`^['"‘“]?${safeTitle}['"’”]?\\s*(?:주요\\s*과제|과제|프로젝트)?[:\\s]*`, 'i'), '').trim();
    ps = ps.replace(/^주요\s*과제[:\\s]*/i, '').trim();
    ps = ps.replace(/\s*과제\s*해결입니다\.?$/i, '').trim();
    ps = ps.replace(/\s*프로젝트입니다\.?$/i, '').trim();
  }

  // Clean remaining slogan fragments or recruitment junk
  ps = ps
    .replace(/함께\s*성장하세요!?/gi, '')
    .replace(/캐드\s*,\s*3D\s*,\s*스케치업\s*외\s*\(.*?\)/gi, '')
    .replace(/HC\s*공개/gi, '')
    .trim();

  ps = ps.replace(/^(?:에서|으로|의|과|와|을|를)\s+/g, '').trim();
  ps = ps.replace(/(?:에서|으로|의|과|와|을|를|로|가|이|는|은)\s*$/g, '').trim();

  // Public feeds must remain evidence-only. Never invent a category template
  // when the source posting did not provide a usable problem statement.
  if (posting?.source !== 'internal') return ps;

  const titleLower = `${title} ${industry} ${ps}`.toLowerCase();

  // If ps is dry boilerplate, empty, fragment, or lacks real action verbs, mark for regeneration
  const hasActionVerb = /개선|구축|설계|정립|개발|운영|제작|고도화|최적화|분석|관리|수립|검수/.test(ps);
  const isDryBoilerplate =
    !ps ||
    ps.length < 12 ||
    !hasActionVerb ||
    ps === title ||
    ps === `${companyName}의 ${title}` ||
    (companyName && title && ps.includes(companyName) && ps.includes(title));

  if (!isDryBoilerplate) {
    if (!ps.endsWith('.') && !ps.endsWith('다')) {
      ps += ' 프로젝트입니다.';
    } else if (ps.endsWith('다')) {
      if (!ps.endsWith('.')) ps += '.';
    }
    return ps;
  }

  // Handle specific high-priority domain keyword matches first
  if (/야외\s*운동기구|운동기구/.test(titleLower)) {
    return '야외 운동기구 메커니즘 설계 고도화 및 도면 표준화를 통해 구조 안정성과 생산성을 높이는 프로젝트입니다.';
  }
  if (/수원광교|한샘디자인|매장|쇼룸|디스플레이|hc\b/.test(titleLower)) {
    return '한샘디자인파크 쇼룸 방문 고객을 대상으로 공간 인테리어 상담, 스타일링 제안 및 견적 프로세스를 총괄하는 프로젝트입니다.';
  }
  if (/주거|커뮤니티|모델하우스|주택전시관/.test(titleLower)) {
    return '주거·커뮤니티 공간 및 모델하우스 인테리어 설계와 현장 시공 프로세스를 최적화하는 프로젝트입니다.';
  }
  if (/실내\s*인테리어|스케치업|3d|cad|캐드/.test(titleLower)) {
    return '실내 공간 CAD/3D 도면 설계 및 상업·공공 시설 인테리어 마감 품질을 고도화하는 프로젝트입니다.';
  }
  if (/인테리어\s*디자인\s*설계|설계팀/.test(titleLower)) {
    return '인테리어 디자인 도면 설계, 3D 랜더링 검수 및 현장 시공 기술 지원을 총괄하는 프로젝트입니다.';
  }

  switch (category) {
    case 'dev-engineering':
    case 'legacy-modernization':
      return '기존 시스템 고도화, 레거시 개선 및 개발 환경 표준화를 통해 시스템 안정성 및 생산성을 극대화하는 엔지니어링 프로젝트입니다.';

    case 'design-brand':
      if (/모션그래픽|모션|영상|광고\s*영상|미디어|애니메이션|pd|비디오|youtube|유튜브|방송/.test(titleLower)) {
        return '영화·드라마·광고 영상의 모션그래픽 연출 및 시각적 완성도가 높은 비주얼 미디어 콘텐츠를 제작하는 프로젝트입니다.';
      }
      if (/인테리어|공간|건축|시공|전시|무대|리하우스|가구\s*설계/.test(titleLower)) {
        return '주거 및 공간 인테리어 설계, 3D 도면 작성 및 시공 품질 관리 프로세스를 표준화하는 프로젝트입니다.';
      }
      if (/ux|ui|웹|앱|인터랙티브|프로덕트|디자인\s*시스템|플랫폼/.test(titleLower)) {
        return '디지털 UX/UI 디자인 시스템 구축 및 사용자 경험 모델을 설계하여 제품 완성도를 높이는 프로젝트입니다.';
      }
      if (/편집|인쇄|출판|패키지|시각|그래픽|디지털인쇄|디지털 인쇄/.test(titleLower)) {
        return '시각 및 인쇄 디자인 표준 가이드라인 정립과 가공·제작 결과물의 품질을 고도화하는 프로젝트입니다.';
      }
      return '기업 브랜드 아이덴티티 수립 및 실무 디자인 시스템의 완성도를 강화하는 브랜드 리디자인 프로젝트입니다.';

    case 'marketing-sales':
    case 'growth':
      return '신규 타깃 마케팅 전략 수립 및 세일즈 파이프라인 개척을 통해 지속 가능한 매출 성장을 달성하는 마케팅 프로젝트입니다.';

    case 'hr-strategy':
      return '전사 조직 체계 정비, 평가·보상 시스템 고도화 및 시니어 경험 기반의 조직 문화를 정립하는 경영지원 프로젝트입니다.';

    case 'r-and-d-manufacturing':
      if (/기구|설계|기계|cad|3d|도면/.test(titleLower)) {
        return '제품 메커니즘 설계 고도화 및 도면 표준화를 통해 구조 안정성과 생산 효율성을 높이는 설계 프로젝트입니다.';
      }
      return '스마트 팩토리 공정 자동화, 생산 수율 향상 및 기술 인프라 표준화를 정립하는 생산 공정 최적화 프로젝트입니다.';

    case 'ai-automation':
    case 'data-platform':
      return '사내 반복 업무의 AI/RPA 자동화 도입 및 데이터 분석 파이프라인 수립을 통한 데이터 기반 의사결정 체계 구축 프로젝트입니다.';

    case 'security':
      return '정보보호 컴플라이언스 준수, 보안 위험 진단 및 사내 인프라 보안 관리 체계를 고도화하는 보안 프로젝트입니다.';

    case 'operations':
    default:
      if (/총무|자산|시설/.test(titleLower)) {
        return '전사 총무·시설 관리 프로세스 표준화 및 자산 운영 효율성을 극대화하는 프로젝트입니다.';
      }
      if (/인테리어|설계|시공|가구/.test(titleLower)) {
        return '공간 인테리어 설계 및 시공 운영 품질 프로세스를 표준화하는 프로젝트입니다.';
      }
      return '전사 운영 프로세스 리드타임 단축 및 병목 구간 개선을 통한 고효율 운영 체계 최적화 프로젝트입니다.';
  }
}

export function prepareJobCatalog(postings, now = new Date()) {
  const { duplicateCount, postings: uniquePostings } = deduplicateJobCatalog(postings);
  const entries = uniquePostings
    .filter(
      (posting) =>
        posting?.id &&
        posting?.title &&
        !containsUtf8Replacement(posting) &&
        !isPostingExpired(posting, now),
    )
    .map((posting) => {
      const { companyName, title } = normalizeCompanyAndTitle(posting.companyName, posting.title);
      const occupationClassification = resolveOccupationClassification({ ...posting, companyName, title });
      const occupationCategory = occupationClassification.isConfident
        ? occupationClassification.category
        : null;
      const normalizedPosting = {
        ...posting,
        companyName,
        title,
        problemStatement: sanitizeAndEnhanceProblemStatement({ ...posting, companyName, title }),
        occupationCategory: occupationCategory || undefined,
        occupationClassificationConfidence: occupationClassification.confidence,
        occupationClassificationMargin: occupationClassification.margin,
        occupationClassificationStatus: occupationCategory ? 'classified' : 'ambiguous',
      };
      return {
        occupationCategory,
        occupationMatchText: occupationMatchText(normalizedPosting),
        deadlineTime: parseDateValue(posting.deadline, Number.MAX_SAFE_INTEGER),
        isPartTime: matchesEmploymentType(normalizedPosting, 'part-time'),
        postedAtTime: parseDateValue(posting.postedAt, 0),
        posting: normalizedPosting,
        searchText: searchableText(normalizedPosting),
      };
    });

  const categoryTotals = new Map();
  let closingSoonTotal = 0;
  let partTimeTotal = 0;
  for (const entry of entries) {
    if (entry.occupationCategory) {
      categoryTotals.set(
        entry.occupationCategory,
        (categoryTotals.get(entry.occupationCategory) || 0) + 1,
      );
    }
    if (entry.posting.hiringStage === 'closing') closingSoonTotal++;
    if (entry.isPartTime) partTimeTotal++;
  }

  return {
    catalogTotal: entries.length,
    categoryTotals,
    closingSoonTotal,
    duplicateExcludedTotal: duplicateCount,
    entries,
    loadedAt: new Date().toISOString(),
    partTimeTotal,
  };
}

function hasPersonalizedFitRanking(options) {
  return Boolean(
    options.desiredCategories.length > 0 ||
      options.desiredOccupationText ||
      options.desiredLocation ||
      options.experienceCardCategory ||
      options.experienceCardText ||
      options.profileText,
  );
}

function comparePreparedEntries(first, second, sortBy) {
  if (sortBy === 'title-asc' || sortBy === 'alphabetical-asc') {
    return (
      first.posting.title.localeCompare(second.posting.title, 'ko') ||
      first.posting.id.localeCompare(second.posting.id)
    );
  }
  if (sortBy === 'deadline-asc') {
    return (
      first.deadlineTime - second.deadlineTime ||
      first.posting.id.localeCompare(second.posting.id)
    );
  }
  return (
    second.postedAtTime - first.postedAtTime ||
    first.posting.id.localeCompare(second.posting.id)
  );
}

function filterPreparedJobCatalog(catalog, options) {
  const queryTokens = options.query.split(/\s+/).filter(Boolean);
  const fitContext = createFitContext(options);
  const preferredTotal =
    options.desiredCategories.length > 0 || fitContext.desiredOccupationTokens.size > 0
      ? catalog.entries.filter(
          (entry) =>
            options.desiredCategories.includes(entry.occupationCategory) ||
            matchesDesiredOccupationText(entry, fitContext),
        ).length
      : 0;

  const matches = catalog.entries.filter((entry) => {
    const { occupationCategory, posting, searchText } = entry;
    if (
      options.categories.length > 0 &&
      !options.categories.some((category) =>
        category === UNCLASSIFIED_OCCUPATION_FILTER
          ? occupationCategory === null
          : occupationCategory === category,
      )
    ) {
      return false;
    }
    if (
      options.requireDesiredOccupationMatch &&
      !matchesDesiredOccupationText(entry, fitContext)
    ) {
      return false;
    }
    if (options.workType && options.workType !== 'all' && posting.workType !== options.workType) return false;
    if (!matchesEmploymentType(posting, options.employmentType)) return false;
    if (
      options.hiringStage &&
      options.hiringStage !== 'all' &&
      posting.hiringStage !== options.hiringStage
    ) {
      return false;
    }
    if (queryTokens.length > 0) {
      if (!queryTokens.every((token) => searchText.includes(token))) return false;
    }
    return true;
  });

  const shouldRankByFit = options.sortBy === 'fit-desc' && hasPersonalizedFitRanking(options);
  const orderedMatches = shouldRankByFit
    ? matches
        .map((entry) => ({ entry, fitMatch: calculateFitMatch(entry, options, fitContext) }))
        .sort((first, second) => {
          return (
            second.fitMatch.score - first.fitMatch.score ||
            second.fitMatch.rankScore - first.fitMatch.rankScore ||
            comparePreparedEntries(first.entry, second.entry, 'latest-desc')
          );
        })
    : [...matches]
        .sort((first, second) =>
          comparePreparedEntries(
            first,
            second,
            options.sortBy === 'deadline-asc' ? 'deadline-asc' : 'latest-desc',
          ),
        )
        .map((entry) => ({ entry, fitMatch: null }));

  const total = orderedMatches.length;
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(options.page, totalPages);
  const start = (page - 1) * options.pageSize;

  return {
    catalogTotal: catalog.catalogTotal,
    closingSoonTotal: catalog.closingSoonTotal,
    duplicateExcludedTotal: catalog.duplicateExcludedTotal,
    items: orderedMatches.slice(start, start + options.pageSize).map(({ entry, fitMatch }) => {
      const resolvedFitMatch = fitMatch || calculateFitMatch(entry, options, fitContext);
      return (
        {
          ...entry.posting,
          experienceRecommendationApplied: resolvedFitMatch.experienceRecommendationApplied,
          recommendationReasons: resolvedFitMatch.reasons,
          seniorFitScore: resolvedFitMatch.score,
        }
      );
    }),
    page,
    pageSize: options.pageSize,
    partTimeTotal: catalog.partTimeTotal,
    preferredTotal,
    total,
    totalPages,
  };
}

export function filterAndPaginateJobPostings(postings, rawOptions = {}, now = new Date()) {
  return filterPreparedJobCatalog(
    prepareJobCatalog(postings, now),
    normalizeJobSearchOptions(rawOptions),
  );
}

export function filterAndPaginatePreparedJobCatalog(catalog, rawOptions = {}) {
  return filterPreparedJobCatalog(catalog, normalizeJobSearchOptions(rawOptions));
}

async function loadJobCatalog() {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) return catalogCache.catalog;
  if (catalogLoadPromise) return catalogLoadPromise;

  catalogLoadPromise = adminDb
    .collection(GLOBAL_COLLECTION)
    .get()
    .then((snapshot) => {
      const postings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const catalog = prepareJobCatalog(postings);
      catalogCache = { catalog, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS };
      searchResultCache.clear();
      return catalog;
    })
    .finally(() => {
      catalogLoadPromise = null;
    });

  return catalogLoadPromise;
}

function getSearchResultCacheKey(catalog, options) {
  const optionsDigest = createHash('sha256').update(JSON.stringify(options)).digest('base64url');
  return `${catalog.loadedAt}:${optionsDigest}`;
}

function getCachedSearchResult(cacheKey) {
  const cached = searchResultCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    searchResultCache.delete(cacheKey);
    return null;
  }
  searchResultCache.delete(cacheKey);
  searchResultCache.set(cacheKey, cached);
  return cached.result;
}

function cacheSearchResult(cacheKey, result) {
  if (searchResultCache.size >= MAX_SEARCH_RESULT_CACHE_ENTRIES) {
    const oldestKey = searchResultCache.keys().next().value;
    if (oldestKey) searchResultCache.delete(oldestKey);
  }
  searchResultCache.set(cacheKey, {
    expiresAt: Date.now() + SEARCH_RESULT_CACHE_TTL_MS,
    result,
  });
}

export async function searchAccumulatedJobPostings(rawOptions = {}) {
  const catalog = await loadJobCatalog();
  const options = normalizeJobSearchOptions(rawOptions);
  const cacheKey = getSearchResultCacheKey(catalog, options);
  const cachedResult = getCachedSearchResult(cacheKey);
  if (cachedResult) return cachedResult;

  const result = {
    ...filterPreparedJobCatalog(catalog, options),
    catalogRefreshedAt: catalog.loadedAt,
  };
  cacheSearchResult(cacheKey, result);
  return result;
}

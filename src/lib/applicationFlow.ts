import {
  getScopedStorageKey,
  readVersionedStorage,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { categoryLabels, type JobPosting, type ProjectCategory } from '@/data/jobPostings';

export const EXPERIENCE_CARD_STORAGE_KEY = 'eojob_experience_card';

const PENDING_APPLICATION_INTERVIEW_KEY = 'eojob_pending_application_interview';
const PENDING_EXPERIENCE_CARD_KEY = 'eojob_pending_experience_card';
const PENDING_EXPERIENCE_FOLLOW_UP_KEY = 'eojob_pending_experience_follow_up';
const RESUME_APPLICATION_KEY = 'eojob_resume_application';
const EXPERIENCE_PROFILE_DRAFT_KEY = 'eojob_experience_profile_draft';

export type StoredExperienceCard = {
  action: string;
  category?: ProjectCategory;
  completedAt: string;
  facts?: string[];
  id?: string;
  inferredSkills?: ExperienceInferredSkill[];
  informationQuality?: ExperienceInformationQuality;
  jobKeywords?: string[];
  missingInformation?: ExperienceMissingInformation[];
  problem: string;
  recruiterHighlight?: string;
  result: string;
  role: string;
  targetTitle?: string;
  strengthInsight?: string;
  summary?: string;
  skills?: string[];
  title: string;
  version: 1;
};

export type ExperienceInformationQualityValue = 'complete' | 'weak' | 'missing';

export type ExperienceInformationQuality = {
  action: ExperienceInformationQualityValue;
  problem: ExperienceInformationQualityValue;
  result: ExperienceInformationQualityValue;
  role: ExperienceInformationQualityValue;
};

export type ExperienceInferredSkill = {
  reason: string;
  skill: string;
};

export type ExperienceMissingInformation = {
  field: string;
  followUpQuestion: string;
  reason: string;
};

export type ExperienceCardInput = Omit<StoredExperienceCard, 'completedAt' | 'version'>;

export type ExperienceInterviewAnswers = {
  action: string;
  problem: string;
  result: string;
  role: string;
};

export type ExperienceFollowUpQuestion = {
  field: keyof ExperienceInterviewAnswers;
  prompt: string;
  reason: string;
};

export type PendingExperienceFollowUp = {
  baseCard: ExperienceCardInput;
  questions: ExperienceFollowUpQuestion[];
  version: 1;
};

export type ExperienceProfileDraft = {
  facts?: string[];
  workedOn: string;
  accomplished: string;
  inferredSkills?: ExperienceInferredSkill[];
  informationQuality?: ExperienceInformationQuality;
  jobKeywords?: string[];
  missingInformation?: ExperienceMissingInformation[];
  recruiterHighlight?: string;
  strengths: string[];
  strengthInsight?: string;
  summary?: string;
  version: 1;
  generatedAt: string;
};

export type ExperienceCardMatch = {
  cardCategoryLabel: string;
  message: string;
  postingCategoryLabel: string;
  status: 'matched' | 'mismatch' | 'unknown';
};

type ApplicationInterviewReturn = {
  path: string;
  projectId: string;
  targetCategory?: ProjectCategory;
  targetTitle?: string;
  version: 1;
};

type ApplicationDraft = {
  files: File[];
  note: string;
  projectId: string;
};

let applicationDraft: ApplicationDraft | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function hasValidExperienceCardFields(value: Partial<ExperienceCardInput> | null) {
  return Boolean(value?.title && value.problem && value.role && value.action && value.result);
}

function isValidExperienceCard(value: Partial<StoredExperienceCard> | null) {
  return Boolean(value?.version === 1 && value.completedAt && hasValidExperienceCardFields(value));
}

const categoryKeywords: Record<ProjectCategory, string[]> = {
  'dev-engineering': ['개발', '엔지니어링', '코드', '소프트웨어', '시스템', '백엔드', '프론트'],
  'design-brand': ['디자인', '브랜드', '브랜딩', 'ux', 'ui', '사용자 경험'],
  'marketing-sales': ['마케팅', '영업', '세일즈', '캠페인', '고객 획득', 'b2b'],
  'hr-strategy': ['인사', '채용', '조직', '경영 전략', '인재', '평가 제도'],
  'r-and-d-manufacturing': ['제조', '생산', '공정', '납기', '품질', '연구개발', 'r&d'],
  'legacy-modernization': ['레거시', '마이그레이션', '현대화', '전환', '리팩터링'],
  'ai-automation': ['ai', '인공지능', '자동화', '생성형', 'llm', '머신러닝'],
  'data-platform': ['데이터', '분석', '플랫폼', '파이프라인', 'bi', '데이터베이스'],
  security: ['보안', '리스크', '컴플라이언스', '감사', '취약점', '개인정보'],
  growth: ['그로스', '성장', '전환율', '리텐션', '퍼널', '실험'],
  operations: ['운영', '프로세스', '서비스', '고객 대응', '업무 효율', '표준화', 'voc', 'sla'],
};

const matchStopWords = new Set([
  '경험',
  '결과',
  '문제',
  '방식',
  '업무',
  '역할',
  '이번',
  '주도',
  '진행',
  '프로젝트',
  '향상',
  '해결',
  '개선',
]);

function getCardText(card: ExperienceCardInput) {
  return [card.title, card.problem, card.role, card.action, card.result].join(' ').toLowerCase();
}

function tokenize(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^0-9a-zA-Z가-힣]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !matchStopWords.has(token)),
  );
}

function detectCardCategories(card: ExperienceCardInput) {
  const cardText = getCardText(card);
  return (Object.keys(categoryKeywords) as ProjectCategory[]).filter((category) =>
    categoryKeywords[category].some((keyword) => cardText.includes(keyword)),
  );
}

export function buildExperienceCardFromAnswers(
  answers: ExperienceInterviewAnswers,
  options?: { category?: ProjectCategory; targetTitle?: string },
): ExperienceCardInput {
  const normalized = Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, value.trim()]),
  ) as ExperienceInterviewAnswers;

  if (!hasValidExperienceCardFields({ title: normalized.problem, ...normalized })) {
    throw new Error('경험 카드 생성을 위한 인터뷰 답변이 부족합니다.');
  }

  const titleSource = normalized.problem.replace(/[.!?]+$/u, '').trim();
  const title = titleSource.length > 42 ? `${titleSource.slice(0, 42).trim()}…` : titleSource;

  return {
    ...normalized,
    category: options?.category,
    targetTitle: options?.targetTitle?.trim() || undefined,
    title,
  };
}

export function getExperienceCardCategoryLabel(card: ExperienceCardInput) {
  if (card.category) return categoryLabels[card.category];
  const detected = detectCardCategories(card);
  return detected.length > 0
    ? detected
        .slice(0, 2)
        .map((category) => categoryLabels[category])
        .join(' · ')
    : '직종 정보 없음';
}

export function evaluateExperienceCardMatch(
  card: ExperienceCardInput,
  posting: Pick<
    JobPosting,
    'category' | 'problemStatement' | 'projectGoal' | 'requiredSkills' | 'title'
  >,
): ExperienceCardMatch {
  const postingCategoryLabel = categoryLabels[posting.category];
  const cardCategoryLabel = getExperienceCardCategoryLabel(card);

  if (card.category) {
    return card.category === posting.category
      ? {
          cardCategoryLabel,
          postingCategoryLabel,
          status: 'matched',
          message: `${postingCategoryLabel} 직종에 맞춰 확인한 인터뷰 결과입니다.`,
        }
      : {
          cardCategoryLabel,
          postingCategoryLabel,
          status: 'mismatch',
          message: `현재 카드는 ${cardCategoryLabel} 경험입니다. ${postingCategoryLabel} 지원용 인터뷰를 다시 진행해 주세요.`,
        };
  }

  const detectedCategories = detectCardCategories(card);
  if (detectedCategories.includes(posting.category)) {
    return {
      cardCategoryLabel: postingCategoryLabel,
      postingCategoryLabel,
      status: 'matched',
      message: `저장된 인터뷰 내용에서 ${postingCategoryLabel} 관련 경험을 확인했습니다.`,
    };
  }

  if (detectedCategories.length > 0) {
    return {
      cardCategoryLabel,
      postingCategoryLabel,
      status: 'mismatch',
      message: `저장된 인터뷰는 ${cardCategoryLabel} 중심입니다. ${postingCategoryLabel} 직종에 맞게 다시 진행해 주세요.`,
    };
  }

  const cardTokens = tokenize(getCardText(card));
  const postingTokens = tokenize(
    [posting.title, posting.problemStatement, posting.projectGoal, ...posting.requiredSkills].join(
      ' ',
    ),
  );
  const sharedTokenCount = Array.from(cardTokens).filter((token) =>
    postingTokens.has(token),
  ).length;

  if (sharedTokenCount >= 2) {
    return {
      cardCategoryLabel: '내용 기반 확인',
      postingCategoryLabel,
      status: 'matched',
      message: '저장된 인터뷰와 지원 프로젝트에서 공통된 실무 경험을 확인했습니다.',
    };
  }

  return {
    cardCategoryLabel,
    postingCategoryLabel,
    status: 'unknown',
    message: `${postingCategoryLabel} 직종과의 관련성을 확인하기 어렵습니다. 지원 전에 맞춤 인터뷰를 진행해 주세요.`,
  };
}

export function readStoredExperienceCard(ownerId?: string): StoredExperienceCard | null {
  const scopedKey = getScopedStorageKey(EXPERIENCE_CARD_STORAGE_KEY, ownerId);
  const scoped = readVersionedStorage<StoredExperienceCard>(scopedKey);
  if (isValidExperienceCard(scoped)) return scoped;

  const legacy = readVersionedStorage<StoredExperienceCard>(EXPERIENCE_CARD_STORAGE_KEY);
  if (!isValidExperienceCard(legacy)) return null;
  writeVersionedStorage(scopedKey, legacy);
  if (isBrowser()) localStorage.removeItem(EXPERIENCE_CARD_STORAGE_KEY);
  return legacy;
}

export function saveStoredExperienceCard(card: ExperienceCardInput, ownerId?: string) {
  if (!isBrowser()) return null;

  const storedCard: StoredExperienceCard = {
    ...card,
    completedAt: new Date().toISOString(),
    version: 1,
  };
  writeVersionedStorage(getScopedStorageKey(EXPERIENCE_CARD_STORAGE_KEY, ownerId), storedCard);
  window.dispatchEvent(new CustomEvent('eojob_experience_card_updated'));
  return storedCard;
}

export function cacheStoredExperienceCard(card: StoredExperienceCard, ownerId?: string) {
  if (!isBrowser() || !isValidExperienceCard(card)) return;
  writeVersionedStorage(getScopedStorageKey(EXPERIENCE_CARD_STORAGE_KEY, ownerId), card);
  window.dispatchEvent(new CustomEvent('eojob_experience_card_updated'));
}

export function savePendingExperienceCard(card: ExperienceCardInput) {
  if (!isBrowser() || !hasValidExperienceCardFields(card)) return;
  sessionStorage.setItem(PENDING_EXPERIENCE_CARD_KEY, JSON.stringify(card));
}

export function readPendingExperienceCard(): ExperienceCardInput | null {
  if (!isBrowser()) return null;
  try {
    const value = JSON.parse(
      sessionStorage.getItem(PENDING_EXPERIENCE_CARD_KEY) || 'null',
    ) as Partial<ExperienceCardInput> | null;
    return hasValidExperienceCardFields(value) ? (value as ExperienceCardInput) : null;
  } catch {
    return null;
  }
}

export function clearPendingExperienceCard() {
  if (isBrowser()) sessionStorage.removeItem(PENDING_EXPERIENCE_CARD_KEY);
}

function normalizeInterviewField(value: unknown): keyof ExperienceInterviewAnswers | null {
  return value === 'problem' || value === 'role' || value === 'action' || value === 'result'
    ? value
    : null;
}

function normalizeExperienceFollowUpQuestion(value: unknown): ExperienceFollowUpQuestion | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const field = normalizeInterviewField(source.field);
  const prompt =
    typeof source.prompt === 'string' && source.prompt.trim() ? source.prompt.trim() : '';
  const reason =
    typeof source.reason === 'string' && source.reason.trim() ? source.reason.trim() : '';
  if (!field || !prompt) return null;
  return { field, prompt, reason };
}

function normalizePendingExperienceFollowUp(value: unknown): PendingExperienceFollowUp | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<PendingExperienceFollowUp>;
  const questions = Array.isArray(source.questions)
    ? source.questions
        .map((item) => normalizeExperienceFollowUpQuestion(item))
        .filter((item): item is ExperienceFollowUpQuestion => Boolean(item))
    : [];
  if (
    source.version !== 1 ||
    !hasValidExperienceCardFields(source.baseCard ?? null) ||
    !questions.length
  ) {
    return null;
  }
  return {
    baseCard: source.baseCard as ExperienceCardInput,
    questions: questions.slice(0, 4),
    version: 1,
  };
}

export function beginExperienceFollowUp(
  card: ExperienceCardInput,
  missingInformation: ExperienceMissingInformation[],
) {
  if (!isBrowser() || !hasValidExperienceCardFields(card)) return false;
  const questions = missingInformation
    .map((item) =>
      normalizeExperienceFollowUpQuestion({
        field: item.field,
        prompt: item.followUpQuestion,
        reason: item.reason,
      }),
    )
    .filter((item): item is ExperienceFollowUpQuestion => Boolean(item))
    .slice(0, 4);
  if (!questions.length) return false;

  sessionStorage.setItem(
    PENDING_EXPERIENCE_FOLLOW_UP_KEY,
    JSON.stringify({
      baseCard: card,
      questions,
      version: 1,
    }),
  );
  return true;
}

export function readPendingExperienceFollowUp(): PendingExperienceFollowUp | null {
  if (!isBrowser()) return null;
  try {
    return normalizePendingExperienceFollowUp(
      JSON.parse(sessionStorage.getItem(PENDING_EXPERIENCE_FOLLOW_UP_KEY) || 'null'),
    );
  } catch {
    return null;
  }
}

export function clearPendingExperienceFollowUp() {
  if (isBrowser()) sessionStorage.removeItem(PENDING_EXPERIENCE_FOLLOW_UP_KEY);
}

function normalizeExperienceProfileDraft(value: unknown): ExperienceProfileDraft | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<ExperienceProfileDraft>;
  const workedOn = typeof source.workedOn === 'string' ? source.workedOn.trim() : '';
  const accomplished = typeof source.accomplished === 'string' ? source.accomplished.trim() : '';
  const strengths = Array.isArray(source.strengths)
    ? source.strengths
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  if (!workedOn && !accomplished && strengths.length === 0) return null;
  return {
    facts: normalizeStringArray(source.facts, 8),
    workedOn,
    accomplished,
    inferredSkills: normalizeInferredSkills(source.inferredSkills),
    informationQuality: normalizeInformationQuality(source.informationQuality),
    jobKeywords: normalizeStringArray(source.jobKeywords, 5),
    missingInformation: normalizeMissingInformation(source.missingInformation),
    recruiterHighlight:
      typeof source.recruiterHighlight === 'string' && source.recruiterHighlight.trim()
        ? source.recruiterHighlight.trim()
        : undefined,
    strengths,
    strengthInsight:
      typeof source.strengthInsight === 'string' && source.strengthInsight.trim()
        ? source.strengthInsight.trim()
        : undefined,
    summary:
      typeof source.summary === 'string' && source.summary.trim()
        ? source.summary.trim()
        : undefined,
    version: 1,
    generatedAt:
      typeof source.generatedAt === 'string' ? source.generatedAt : new Date().toISOString(),
  };
}

function normalizeStringArray(value: unknown, maxLength: number) {
  if (!Array.isArray(value)) return undefined;
  const normalized = [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, maxLength);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeInferredSkills(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      skill: typeof item.skill === 'string' ? item.skill.trim() : '',
      reason: typeof item.reason === 'string' ? item.reason.trim() : '',
    }))
    .filter((item) => item.skill && item.reason)
    .slice(0, 6);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeQualityValue(value: unknown) {
  return value === 'complete' || value === 'weak' || value === 'missing' ? value : undefined;
}

function normalizeInformationQuality(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const normalized = {
    problem: normalizeQualityValue(source.problem),
    role: normalizeQualityValue(source.role),
    action: normalizeQualityValue(source.action),
    result: normalizeQualityValue(source.result),
  };
  return normalized.problem && normalized.role && normalized.action && normalized.result
    ? (normalized as ExperienceInformationQuality)
    : undefined;
}

function normalizeMissingInformation(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      field: typeof item.field === 'string' ? item.field.trim() : '',
      reason: typeof item.reason === 'string' ? item.reason.trim() : '',
      followUpQuestion:
        typeof item.followUpQuestion === 'string' ? item.followUpQuestion.trim() : '',
    }))
    .filter((item) => item.field && item.reason && item.followUpQuestion)
    .slice(0, 4);
  return normalized.length > 0 ? normalized : undefined;
}

export function saveExperienceProfileDraft(draft: ExperienceProfileDraft, ownerId?: string) {
  if (!isBrowser()) return;
  const normalized = normalizeExperienceProfileDraft(draft);
  if (normalized)
    sessionStorage.setItem(
      getScopedStorageKey(EXPERIENCE_PROFILE_DRAFT_KEY, ownerId),
      JSON.stringify(normalized),
    );
}

export function readExperienceProfileDraft(ownerId?: string): ExperienceProfileDraft | null {
  if (!isBrowser()) return null;
  try {
    return normalizeExperienceProfileDraft(
      JSON.parse(
        sessionStorage.getItem(getScopedStorageKey(EXPERIENCE_PROFILE_DRAFT_KEY, ownerId)) ||
          'null',
      ),
    );
  } catch {
    return null;
  }
}

export function clearExperienceProfileDraft(ownerId?: string) {
  if (isBrowser())
    sessionStorage.removeItem(getScopedStorageKey(EXPERIENCE_PROFILE_DRAFT_KEY, ownerId));
}

function readApplicationReturn(key: string): ApplicationInterviewReturn | null {
  if (!isBrowser()) return null;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ApplicationInterviewReturn>;
    if (value.version !== 1 || !value.projectId || !value.path) return null;
    if (value.targetCategory && !(value.targetCategory in categoryLabels)) return null;
    return value as ApplicationInterviewReturn;
  } catch {
    return null;
  }
}

export function beginApplicationInterview(
  projectId: string,
  path: string,
  options?: { targetCategory?: ProjectCategory; targetTitle?: string },
) {
  if (!isBrowser()) return;
  const returnState: ApplicationInterviewReturn = {
    path,
    projectId,
    targetCategory: options?.targetCategory,
    targetTitle: options?.targetTitle,
    version: 1,
  };
  sessionStorage.setItem(PENDING_APPLICATION_INTERVIEW_KEY, JSON.stringify(returnState));
}

export function preserveApplicationDraft(projectId: string, files: File[], note: string) {
  applicationDraft = { files, note, projectId };
}

export function consumeApplicationDraft(projectId: string) {
  if (applicationDraft?.projectId !== projectId) return null;
  const draft = applicationDraft;
  applicationDraft = null;
  return draft;
}

export function getPendingApplicationInterview() {
  return readApplicationReturn(PENDING_APPLICATION_INTERVIEW_KEY);
}

export function cancelApplicationInterview() {
  if (!isBrowser()) return;
  applicationDraft = null;
  sessionStorage.removeItem(PENDING_APPLICATION_INTERVIEW_KEY);
  sessionStorage.removeItem(RESUME_APPLICATION_KEY);
  sessionStorage.removeItem(PENDING_EXPERIENCE_CARD_KEY);
}

export function completeApplicationInterview() {
  if (!isBrowser()) return null;

  const returnState = readApplicationReturn(PENDING_APPLICATION_INTERVIEW_KEY);
  if (!returnState) return null;

  sessionStorage.setItem(RESUME_APPLICATION_KEY, JSON.stringify(returnState));
  sessionStorage.removeItem(PENDING_APPLICATION_INTERVIEW_KEY);
  return returnState;
}

export function consumeApplicationResume() {
  if (!isBrowser()) return null;

  const returnState = readApplicationReturn(RESUME_APPLICATION_KEY);
  sessionStorage.removeItem(RESUME_APPLICATION_KEY);
  return returnState;
}

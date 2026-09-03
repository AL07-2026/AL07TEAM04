import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { categoryLabels, type ProjectCategory } from '@/data/jobPostings';
import {
  cacheStoredExperienceCard,
  clearStoredExperienceCard,
  type ExperienceInferredSkill,
  type ExperienceInformationQuality,
  type ExperienceMissingInformation,
  readStoredExperienceCard,
  type StoredExperienceCard,
} from '@/lib/applicationFlow';
import {
  createStableRecordId,
  removeDeepUndefinedValues,
  removeUndefinedValues,
  uniqueByKey,
} from '@/lib/browserStorage';
import { db } from '@/lib/firebase';

export type ExperienceCardData = {
  action: string;
  category?: ProjectCategory;
  createdAt?: string;
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
  skills?: string[];
  strengthInsight?: string;
  summary?: string;
  targetTitle?: string;
  title: string;
  uid: string;
};

const EXPERIENCE_CARDS_COLLECTION = 'experience_cards';

function normalizeExperienceCard(source: unknown, documentId?: string): ExperienceCardData | null {
  if (!source || typeof source !== 'object') return null;
  const value = source as Record<string, unknown>;
  const stringValue = (field: string) =>
    typeof value[field] === 'string' ? value[field].trim() : '';
  const categoryValue = stringValue('category');
  const category =
    categoryValue && categoryValue in categoryLabels
      ? (categoryValue as ProjectCategory)
      : undefined;
  const normalized: ExperienceCardData = {
    action: stringValue('action'),
    category,
    createdAt: stringValue('createdAt') || undefined,
    facts: normalizeStringArray(value.facts, 8),
    id: documentId || stringValue('id') || undefined,
    inferredSkills: normalizeInferredSkills(value.inferredSkills),
    informationQuality: normalizeInformationQuality(value.informationQuality),
    jobKeywords: normalizeStringArray(value.jobKeywords, 5),
    missingInformation: normalizeMissingInformation(value.missingInformation),
    problem: stringValue('problem'),
    recruiterHighlight: stringValue('recruiterHighlight') || undefined,
    result: stringValue('result'),
    role: stringValue('role'),
    skills: normalizeStringArray(value.skills, 6),
    strengthInsight: stringValue('strengthInsight') || undefined,
    summary: stringValue('summary') || undefined,
    targetTitle: stringValue('targetTitle') || undefined,
    title: stringValue('title'),
    uid: stringValue('uid'),
  };

  return normalized.uid &&
    normalized.title &&
    normalized.problem &&
    normalized.role &&
    normalized.action &&
    normalized.result
    ? normalized
    : null;
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

export async function saveExperienceCard(cardData: ExperienceCardData): Promise<string> {
  const cardId =
    cardData.id ||
    `${createStableRecordId('EXPERIENCE', cardData.uid, cardData.title)}-${Date.now().toString(36)}`;
  try {
    await setDoc(
      doc(db, EXPERIENCE_CARDS_COLLECTION, cardId),
      removeDeepUndefinedValues(
        removeUndefinedValues({
          ...cardData,
          id: cardId,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp(),
        }),
      ),
      { merge: true },
    );
    return cardId;
  } catch (error) {
    console.error('saveExperienceCard failed:', error);
    throw error;
  }
}

export async function deleteExperienceCard(cardId: string): Promise<void> {
  await deleteDoc(doc(db, EXPERIENCE_CARDS_COLLECTION, cardId));
}

async function queryUserExperienceCards(uid: string): Promise<ExperienceCardData[]> {
  const cardsRef = collection(db, EXPERIENCE_CARDS_COLLECTION);
  const q = query(cardsRef, where('uid', '==', uid));
  const snapshot = await getDocs(q);

  const cards = snapshot.docs
    .map((docSnap) => normalizeExperienceCard(docSnap.data(), docSnap.id))
    .filter((card): card is ExperienceCardData => Boolean(card?.uid === uid));

  return uniqueByKey(cards, (card) => card.id || `${card.uid}:${card.title}`).sort(
    (first, second) => (second.createdAt || '').localeCompare(first.createdAt || ''),
  );
}

export async function getUserExperienceCards(uid: string): Promise<ExperienceCardData[]> {
  try {
    return await queryUserExperienceCards(uid);
  } catch (error) {
    console.warn(`getUserExperienceCards(${uid}) failed:`, error);
    return [];
  }
}

function toStoredExperienceCard(card: ExperienceCardData): StoredExperienceCard {
  return {
    action: card.action,
    category: card.category,
    completedAt: card.createdAt || new Date(0).toISOString(),
    facts: card.facts,
    id: card.id,
    inferredSkills: card.inferredSkills,
    informationQuality: card.informationQuality,
    jobKeywords: card.jobKeywords,
    missingInformation: card.missingInformation,
    problem: card.problem,
    recruiterHighlight: card.recruiterHighlight,
    result: card.result,
    role: card.role,
    skills: card.skills,
    strengthInsight: card.strengthInsight,
    summary: card.summary,
    targetTitle: card.targetTitle,
    title: card.title,
    version: 1,
  };
}

export async function getLatestUserExperienceCard(
  uid: string | undefined,
): Promise<StoredExperienceCard | null> {
  const localCard = readStoredExperienceCard(uid);
  if (!uid) return localCard;

  let remoteCard: ExperienceCardData | undefined;
  try {
    [remoteCard] = await queryUserExperienceCards(uid);
  } catch (error) {
    console.warn(`getLatestUserExperienceCard(${uid}) failed:`, error);
    return localCard;
  }

  if (!remoteCard) {
    clearStoredExperienceCard(uid);
    return null;
  }

  const storedRemoteCard = toStoredExperienceCard(remoteCard);
  const latestCard =
    !localCard || storedRemoteCard.completedAt > localCard.completedAt
      ? storedRemoteCard
      : localCard;

  if (latestCard === storedRemoteCard) cacheStoredExperienceCard(storedRemoteCard, uid);
  return latestCard;
}

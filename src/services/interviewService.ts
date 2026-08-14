import {
  collection,
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
  readStoredExperienceCard,
  type StoredExperienceCard,
} from '@/lib/applicationFlow';
import { createStableRecordId, removeUndefinedValues, uniqueByKey } from '@/lib/browserStorage';
import { db } from '@/lib/firebase';

export type ExperienceCardData = {
  action: string;
  category?: ProjectCategory;
  createdAt?: string;
  problem: string;
  result: string;
  role: string;
  targetTitle?: string;
  title: string;
  uid: string;
};

const EXPERIENCE_CARDS_COLLECTION = 'experience_cards';

function normalizeExperienceCard(source: unknown): ExperienceCardData | null {
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
    problem: stringValue('problem'),
    result: stringValue('result'),
    role: stringValue('role'),
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

export async function saveExperienceCard(cardData: ExperienceCardData): Promise<string> {
  const cardId = createStableRecordId('EXPERIENCE', cardData.uid, cardData.title);
  try {
    await setDoc(
      doc(db, EXPERIENCE_CARDS_COLLECTION, cardId),
      removeUndefinedValues({
        ...cardData,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      }),
      { merge: true },
    );
    return cardId;
  } catch (error) {
    console.error('saveExperienceCard failed:', error);
    throw error;
  }
}

export async function getUserExperienceCards(uid: string): Promise<ExperienceCardData[]> {
  try {
    const cardsRef = collection(db, EXPERIENCE_CARDS_COLLECTION);
    const q = query(cardsRef, where('uid', '==', uid));
    const snapshot = await getDocs(q);

    const cards = snapshot.docs
      .map((docSnap) => normalizeExperienceCard(docSnap.data()))
      .filter((card): card is ExperienceCardData => Boolean(card?.uid === uid));

    return uniqueByKey(cards, (card) => `${card.uid}:${card.title}`).sort((first, second) =>
      (second.createdAt || '').localeCompare(first.createdAt || ''),
    );
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
    problem: card.problem,
    result: card.result,
    role: card.role,
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

  const [remoteCard] = await getUserExperienceCards(uid);
  if (!remoteCard) return localCard;

  const storedRemoteCard = toStoredExperienceCard(remoteCard);
  const latestCard =
    !localCard || storedRemoteCard.completedAt > localCard.completedAt
      ? storedRemoteCard
      : localCard;

  if (latestCard === storedRemoteCard) cacheStoredExperienceCard(storedRemoteCard, uid);
  return latestCard;
}

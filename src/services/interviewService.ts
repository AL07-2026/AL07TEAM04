import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type ExperienceCardData = {
  action: string;
  createdAt?: string;
  problem: string;
  result: string;
  role: string;
  title: string;
  uid: string;
};

const EXPERIENCE_CARDS_COLLECTION = 'experience_cards';

export async function saveExperienceCard(cardData: ExperienceCardData): Promise<string> {
  try {
    const cardsRef = collection(db, EXPERIENCE_CARDS_COLLECTION);
    const newDoc = await addDoc(cardsRef, {
      ...cardData,
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
    return newDoc.id;
  } catch (error) {
    console.error('saveExperienceCard failed:', error);
    throw error;
  }
}

export async function getUserExperienceCards(uid: string): Promise<ExperienceCardData[]> {
  try {
    const cardsRef = collection(db, EXPERIENCE_CARDS_COLLECTION);
    const q = query(cardsRef, where('uid', '==', uid), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => docSnap.data() as ExperienceCardData);
  } catch (error) {
    console.warn(`getUserExperienceCards(${uid}) failed:`, error);
    return [];
  }
}

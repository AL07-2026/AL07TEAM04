import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';

import type { JobPosting } from '@/data/jobPostings';
import { db } from '@/lib/firebase';

export interface UserProposal {
  appliedAt: string;
  category: string;
  companyName: string;
  coverNote?: string;
  id: string;
  interviewSummary: string;
  location: string;
  problemStatement?: string;
  projectId: string;
  projectTitle: string;
  resumeFileName: string;
  salaryRange: string;
  seniorFitScore: number;
  status: '검토 중' | '연락 받음' | '승인';
  userId?: string;
}

const LOCAL_STORAGE_KEY = 'eojob_user_proposals';

export function getLocalProposals(): UserProposal[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as UserProposal[];
    return parsed;
  } catch {
    return [];
  }
}

export function saveLocalProposal(proposal: Omit<UserProposal, 'id'>): UserProposal {
  const existing = getLocalProposals();
  const newProposal: UserProposal = {
    ...proposal,
    id: `PROP-${Date.now()}`,
  };
  const updated = [newProposal, ...existing];
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }
  return newProposal;
}

export async function getUserProposals(userId?: string): Promise<UserProposal[]> {
  const localList = getLocalProposals();

  if (!db || !userId) {
    return localList;
  }

  try {
    const proposalsRef = collection(db, 'user_proposals');
    const q = query(proposalsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return localList;
    }

    const firestoreList: UserProposal[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<UserProposal, 'id'>),
    }));

    const combined = [...firestoreList];
    for (const item of localList) {
      if (!combined.some((p) => p.projectId === item.projectId)) {
        combined.push(item);
      }
    }
    return combined;
  } catch (err) {
    console.warn('Failed to fetch proposals from Firestore, using local storage:', err);
    return localList;
  }
}

export async function createProposalFromPosting(
  posting: JobPosting,
  resumeFileName: string,
  interviewSummary: string,
  coverNote?: string,
  userId?: string,
): Promise<UserProposal> {
  const proposalData: Omit<UserProposal, 'id'> = {
    userId,
    projectId: posting.id,
    projectTitle: posting.title,
    companyName: posting.companyName,
    category: posting.category,
    location: posting.location,
    salaryRange: posting.salaryRange,
    seniorFitScore: posting.seniorFitScore,
    appliedAt: new Date().toISOString().split('T')[0] ?? '2026-08-14',
    status: '검토 중',
    resumeFileName: resumeFileName || '2026_이동욱_경험이력서_포트폴리오.pdf',
    interviewSummary: interviewSummary || posting.recommendedTalentType,
    coverNote: coverNote || '등록된 시니어 경험과 AI 인터뷰 결과를 바탕으로 프로젝트 지원서를 제출합니다.',
    problemStatement: posting.problemStatement,
  };

  const savedLocal = saveLocalProposal(proposalData);

  if (!db || !userId) {
    return savedLocal;
  }

  try {
    const proposalsRef = collection(db, 'user_proposals');
    const docRef = await addDoc(proposalsRef, {
      ...proposalData,
      createdAt: new Date().toISOString(),
    });
    return { ...savedLocal, id: docRef.id };
  } catch (err) {
    console.warn('Failed to save proposal to Firestore:', err);
    return savedLocal;
  }
}

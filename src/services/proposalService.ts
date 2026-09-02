import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';

import type { JobPosting } from '@/data/jobPostings';
import {
  createStableRecordId,
  readVersionedStorage,
  removeUndefinedValues,
  uniqueByKey,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { db } from '@/lib/firebase';

export interface UserProposal {
  appliedAt: string;
  applicantEmail?: string;
  applicantName?: string;
  category: string;
  companyName: string;
  coverNote?: string;
  employmentSubsidyProgram?: string;
  employmentSubsidyTarget?: boolean;
  id: string;
  interviewSummary: string;
  location: string;
  problemStatement?: string;
  projectOwnerId?: string;
  projectId: string;
  projectTitle: string;
  resumeFileName: string;
  salaryRange: string;
  seniorFitScore: number;
  status: '검토 중' | '연락 받음' | '승인';
  updatedAt?: string;
  userId?: string;
}

const PROPOSALS_COLLECTION = 'user_proposals';
const LOCAL_STORAGE_KEY = 'eojob_user_proposals';

function normalizeProposal(source: unknown, documentId?: string): UserProposal | null {
  if (!source || typeof source !== 'object') return null;
  const value = source as Partial<UserProposal>;
  const id = documentId || value.id;
  if (!id || !value.projectId || !value.projectTitle || !value.companyName) return null;
  if (id.includes('SEED') || id === 'PROP-1' || id === 'PROP-2') return null;

  return {
    id,
    userId: value.userId,
    projectId: value.projectId,
    projectTitle: value.projectTitle,
    companyName: value.companyName,
    category: value.category || 'operations',
    location: value.location || '협의',
    salaryRange: value.salaryRange || '협의',
    seniorFitScore: typeof value.seniorFitScore === 'number' ? value.seniorFitScore : 0,
    appliedAt: value.appliedAt || new Date().toISOString().slice(0, 10),
    applicantName: value.applicantName,
    applicantEmail: value.applicantEmail,
    status: value.status === '연락 받음' || value.status === '승인' ? value.status : '검토 중',
    resumeFileName: value.resumeFileName || '',
    interviewSummary: value.interviewSummary || '',
    coverNote: value.coverNote,
    problemStatement: value.problemStatement,
    projectOwnerId: value.projectOwnerId,
    employmentSubsidyTarget: Boolean(value.employmentSubsidyTarget),
    employmentSubsidyProgram: value.employmentSubsidyProgram,
    updatedAt: value.updatedAt,
  };
}

function proposalIdentity(proposal: Pick<UserProposal, 'projectId' | 'userId'>) {
  return `${proposal.userId || 'guest'}:${proposal.projectId}`;
}

function mergeProposals(...sources: UserProposal[][]) {
  return uniqueByKey(
    sources
      .flat()
      .sort((first, second) =>
        (second.updatedAt || second.appliedAt).localeCompare(first.updatedAt || first.appliedAt),
      ),
    proposalIdentity,
  );
}

export function clearLegacyProposals(): void {
  const cleanList = uniqueByKey(getAllLocalProposals(), proposalIdentity);
  writeVersionedStorage(LOCAL_STORAGE_KEY, cleanList);
}

export function getLocalProposals(userId?: string): UserProposal[] {
  const stored = readVersionedStorage<unknown[]>(LOCAL_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];

  const proposals = stored
    .map((item) => normalizeProposal(item))
    .filter((item): item is UserProposal => Boolean(item));
  const scoped = userId
    ? proposals.filter((proposal) => proposal.userId === userId)
    : proposals.filter((proposal) => !proposal.userId);

  return uniqueByKey(scoped, proposalIdentity);
}

function getAllLocalProposals() {
  const stored = readVersionedStorage<unknown[]>(LOCAL_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored
    .map((item) => normalizeProposal(item))
    .filter((item): item is UserProposal => Boolean(item));
}

export function saveLocalProposal(proposal: Omit<UserProposal, 'id'>): UserProposal {
  const id = createStableRecordId('PROPOSAL', proposal.userId || 'guest', proposal.projectId);
  const savedProposal: UserProposal = {
    ...proposal,
    id,
    updatedAt: new Date().toISOString(),
  };
  const existing = getAllLocalProposals().filter(
    (item) => proposalIdentity(item) !== proposalIdentity(savedProposal),
  );
  writeVersionedStorage(LOCAL_STORAGE_KEY, [savedProposal, ...existing]);
  return savedProposal;
}

export async function getUserProposals(userId?: string): Promise<UserProposal[]> {
  const localList = getLocalProposals(userId);
  if (!userId) return localList;

  try {
    const snapshot = await getDocs(
      query(collection(db, PROPOSALS_COLLECTION), where('userId', '==', userId)),
    );
    const firestoreList = snapshot.docs
      .map((document) => normalizeProposal(document.data(), document.id))
      .filter((item): item is UserProposal => Boolean(item));

    return mergeProposals(firestoreList, localList);
  } catch (error) {
    console.warn('Failed to fetch proposals from Firestore, using local storage:', error);
    return localList;
  }
}

export async function getCompanyProposals(companyUserId?: string): Promise<UserProposal[]> {
  if (!companyUserId) return [];
  const localList = uniqueByKey(
    getAllLocalProposals().filter((proposal) => proposal.projectOwnerId === companyUserId),
    proposalIdentity,
  );

  try {
    const snapshot = await getDocs(
      query(collection(db, PROPOSALS_COLLECTION), where('projectOwnerId', '==', companyUserId)),
    );
    const firestoreList = snapshot.docs
      .map((document) => normalizeProposal(document.data(), document.id))
      .filter((item): item is UserProposal => Boolean(item));
    return mergeProposals(firestoreList, localList);
  } catch (error) {
    console.warn('Failed to fetch company proposals from Firestore, using local storage:', error);
    return localList;
  }
}

export async function createProposalFromPosting(
  posting: JobPosting,
  resumeFileName: string,
  interviewSummary: string,
  coverNote?: string,
  userId?: string,
  applicant?: { email?: string; name?: string },
  subsidyInfo?: { employmentSubsidyProgram?: string; employmentSubsidyTarget?: boolean },
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
    appliedAt: new Date().toISOString().slice(0, 10),
    applicantName: applicant?.name,
    applicantEmail: applicant?.email,
    status: '검토 중',
    resumeFileName,
    interviewSummary: interviewSummary || posting.recommendedTalentType,
    coverNote:
      coverNote || '등록된 시니어 경험과 AI 인터뷰 결과를 바탕으로 프로젝트 지원서를 제출합니다.',
    problemStatement: posting.problemStatement,
    projectOwnerId: posting.ownerId,
    employmentSubsidyTarget: Boolean(subsidyInfo?.employmentSubsidyTarget),
    employmentSubsidyProgram: subsidyInfo?.employmentSubsidyProgram,
  };
  return saveProposal(proposalData, { requireRemote: Boolean(userId) });
}

export async function saveProposal(
  proposalData: Omit<UserProposal, 'id'>,
  options: { requireRemote?: boolean } = {},
): Promise<UserProposal> {
  const savedLocal = saveLocalProposal(proposalData);
  const userId = proposalData.userId;
  if (!userId) return savedLocal;

  try {
    await setDoc(
      doc(db, PROPOSALS_COLLECTION, savedLocal.id),
      removeUndefinedValues({
        ...proposalData,
        updatedAt: savedLocal.updatedAt,
        createdAt: new Date().toISOString(),
      }),
      { merge: true },
    );
    return savedLocal;
  } catch (error) {
    if (options.requireRemote) {
      throw new Error('기업에 지원 내용을 전달하지 못했습니다.', { cause: error });
    }
    console.warn('Failed to save proposal to Firestore, using local storage:', error);
    return savedLocal;
  }
}

export async function updateProposalStatus(
  proposalId: string,
  status: UserProposal['status'],
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const proposals = getAllLocalProposals().map((proposal) =>
    proposal.id === proposalId ? { ...proposal, status, updatedAt } : proposal,
  );
  writeVersionedStorage(LOCAL_STORAGE_KEY, proposals);

  try {
    await setDoc(doc(db, PROPOSALS_COLLECTION, proposalId), { status, updatedAt }, { merge: true });
  } catch (error) {
    console.warn('Failed to update proposal status in Firestore, using local status:', error);
  }
}

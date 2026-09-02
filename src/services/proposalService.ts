import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type { JobPosting } from '@/data/jobPostings';
import {
  createStableRecordId,
  readVersionedStorage,
  removeDeepUndefinedValues,
  uniqueByKey,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { db, storage } from '@/lib/firebase';
import type { ExperienceProfileV1 } from './profileService';

export type ProposalProcessStage =
  | 'document_review'
  | 'first_interview'
  | 'second_interview'
  | 'mission'
  | 'final_connection';

export const proposalProcessStageLabels: Record<ProposalProcessStage, string> = {
  document_review: '서류 검토 중',
  first_interview: '1차 면접',
  second_interview: '2차 면접',
  mission: '미션(퀘스트)',
  final_connection: '최종 연결',
};

export function getProposalProcessStage(
  proposal: Pick<UserProposal, 'processStage' | 'status'>,
): ProposalProcessStage {
  return proposal.processStage || (proposal.status === '승인' ? 'final_connection' : 'document_review');
}

export type ProposalResumeFile = {
  name: string;
  storagePath: string;
  type: string;
  size: number;
};

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
  resumeFiles?: ProposalResumeFile[];
  salaryRange: string;
  seniorFitScore: number;
  status: '검토 중' | '연락 받음' | '승인';
  processStage?: ProposalProcessStage;
  contactStatus?: 'not_contacted' | 'contacted';
  experienceSnapshotV1?: ExperienceProfileV1;
  updatedAt?: string;
  userId?: string;
}

const PROPOSALS_COLLECTION = 'user_proposals';
const LOCAL_STORAGE_KEY = 'eojob_user_proposals';
const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;
const RESUME_FILE_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);

export function isUsableProposalResumeFile(file: File | null | undefined): file is File {
  if (!file || typeof file.name !== 'string' || typeof file.size !== 'number') return false;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return (
    RESUME_FILE_EXTENSIONS.has(extension) &&
    Number.isFinite(file.size) &&
    file.size > 0 &&
    file.size <= MAX_RESUME_FILE_SIZE
  );
}

function getResumeContentType(file: File) {
  const declaredType = typeof file.type === 'string' ? file.type.trim() : '';
  if (declaredType) return declaredType;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'pdf'
    ? 'application/pdf'
    : extension === 'doc'
      ? 'application/msword'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

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
    processStage: isProcessStage(value.processStage)
      ? value.processStage
      : value.status === '승인'
        ? 'final_connection'
        : 'document_review',
    contactStatus:
      value.contactStatus === 'contacted' || value.status === '연락 받음'
        ? 'contacted'
        : 'not_contacted',
    resumeFileName: value.resumeFileName || '',
    resumeFiles: Array.isArray(value.resumeFiles)
      ? value.resumeFiles.filter((file): file is ProposalResumeFile => isResumeFile(file))
      : undefined,
    interviewSummary: value.interviewSummary || '',
    coverNote: value.coverNote,
    problemStatement: value.problemStatement,
    projectOwnerId: value.projectOwnerId,
    employmentSubsidyTarget: Boolean(value.employmentSubsidyTarget),
    employmentSubsidyProgram: value.employmentSubsidyProgram,
    updatedAt: value.updatedAt,
    experienceSnapshotV1: normalizeExperienceSnapshot(value.experienceSnapshotV1),
  };
}

function normalizeExperienceSnapshot(value: unknown): ExperienceProfileV1 | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<ExperienceProfileV1>;
  const workedOn = typeof source.workedOn === 'string' ? source.workedOn.trim() : '';
  const accomplished = typeof source.accomplished === 'string' ? source.accomplished.trim() : '';
  const strengths = Array.isArray(source.strengths)
    ? source.strengths
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  if (!workedOn && !accomplished && strengths.length === 0) return undefined;
  return {
    workedOn,
    accomplished,
    strengths,
    version: 1,
    generatedAt: typeof source.generatedAt === 'string' ? source.generatedAt : undefined,
    confirmedAt:
      typeof source.confirmedAt === 'string' ? source.confirmedAt : new Date(0).toISOString(),
  };
}

function isProcessStage(value: unknown): value is ProposalProcessStage {
  return (
    value === 'document_review' ||
    value === 'first_interview' ||
    value === 'second_interview' ||
    value === 'mission' ||
    value === 'final_connection'
  );
}

function isResumeFile(value: unknown): value is ProposalResumeFile {
  if (!value || typeof value !== 'object') return false;
  const file = value as Partial<ProposalResumeFile>;
  return (
    typeof file.name === 'string' &&
    typeof file.storagePath === 'string' &&
    typeof file.type === 'string' &&
    typeof file.size === 'number'
  );
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
  resumeFiles: File[] = [],
  experienceSnapshotV1?: ExperienceProfileV1,
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
    processStage: 'document_review',
    contactStatus: 'not_contacted',
    resumeFileName,
    interviewSummary: interviewSummary || posting.recommendedTalentType,
    coverNote: coverNote?.trim() || undefined,
    problemStatement: posting.problemStatement,
    projectOwnerId: posting.ownerId,
    employmentSubsidyTarget: Boolean(subsidyInfo?.employmentSubsidyTarget),
    employmentSubsidyProgram: subsidyInfo?.employmentSubsidyProgram,
    experienceSnapshotV1,
  };
  const proposalId = createStableRecordId('PROPOSAL', userId || 'guest', posting.id);
  let uploadedFiles: ProposalResumeFile[] = [];
  try {
    if (resumeFiles.length > 0) {
      uploadedFiles = await uploadProposalResumeFiles(proposalId, resumeFiles, userId);
    }
    return await saveProposal(
      {
        ...proposalData,
        resumeFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        resumeFileName:
          uploadedFiles.length > 0
            ? uploadedFiles.map((file) => file.name).join(', ')
            : resumeFileName,
      },
      { requireRemote: Boolean(userId) },
    );
  } catch (error) {
    await cleanupProposalResumeFiles(uploadedFiles);
    removeLocalProposal(proposalId);
    throw error;
  }
}

export async function uploadProposalResumeFiles(
  proposalId: string,
  files: File[],
  userId?: string,
): Promise<ProposalResumeFile[]> {
  if (files.some((file) => !isUsableProposalResumeFile(file))) {
    throw new Error('첨부파일 형식 또는 크기가 올바르지 않습니다.');
  }
  const uploaded: ProposalResumeFile[] = [];
  try {
    for (const [index, file] of files.entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `resumes/${userId || 'unknown-user'}/${proposalId}/${Date.now()}-${index}-${safeName}`;
      const contentType = getResumeContentType(file);
      await uploadBytes(ref(storage, storagePath), file, { contentType });
      uploaded.push({ name: file.name, storagePath, type: contentType, size: file.size });
    }
    return uploaded;
  } catch (error) {
    await cleanupProposalResumeFiles(uploaded);
    throw error;
  }
}

async function cleanupProposalResumeFiles(files: ProposalResumeFile[]) {
  await Promise.all(files.map((file) => deleteObject(ref(storage, file.storagePath)).catch(() => undefined)));
}

export async function resolveProposalResumeUrl(storagePath: string): Promise<string> {
  return getDownloadURL(ref(storage, storagePath));
}

export async function saveProposal(
  proposalData: Omit<UserProposal, 'id'>,
  options: { requireRemote?: boolean } = {},
): Promise<UserProposal> {
  const savedLocal = saveLocalProposal(proposalData);
  const userId = proposalData.userId;
  if (!userId) {
    if (options.requireRemote) throw new Error('로그인한 지원자만 지원서를 저장할 수 있습니다.');
    return savedLocal;
  }

  try {
    await setDoc(
      doc(db, PROPOSALS_COLLECTION, savedLocal.id),
      removeDeepUndefinedValues({
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

function removeLocalProposal(proposalId: string) {
  writeVersionedStorage(
    LOCAL_STORAGE_KEY,
    getAllLocalProposals().filter((proposal) => proposal.id !== proposalId),
  );
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

export async function updateProposalProcessStage(
  proposalId: string,
  processStage: ProposalProcessStage,
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const previousProposals = getAllLocalProposals();
  const proposals = previousProposals.map((proposal) =>
    proposal.id === proposalId ? { ...proposal, processStage, updatedAt } : proposal,
  );
  writeVersionedStorage(LOCAL_STORAGE_KEY, proposals);
  try {
    await setDoc(doc(db, PROPOSALS_COLLECTION, proposalId), { processStage, updatedAt }, { merge: true });
  } catch (error) {
    writeVersionedStorage(LOCAL_STORAGE_KEY, previousProposals);
    throw error;
  }
}

export async function updateProposalContactStatus(
  proposalId: string,
  contactStatus: 'not_contacted' | 'contacted',
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const previousProposals = getAllLocalProposals();
  const proposals = previousProposals.map((proposal) =>
    proposal.id === proposalId ? { ...proposal, contactStatus, updatedAt } : proposal,
  );
  writeVersionedStorage(LOCAL_STORAGE_KEY, proposals);
  try {
    await setDoc(doc(db, PROPOSALS_COLLECTION, proposalId), { contactStatus, updatedAt }, { merge: true });
  } catch (error) {
    writeVersionedStorage(LOCAL_STORAGE_KEY, previousProposals);
    throw error;
  }
}

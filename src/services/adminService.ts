import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';

import { categoryLabels, hiringStageLabels, type JobPosting } from '@/data/jobPostings';
import {
  readVersionedStorage,
  removeDeepUndefinedValues,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { requestAdminApi, type AdminRole } from '@/lib/adminAccess';
import { db } from '@/lib/firebase';
import { fetchProjects } from '@/services/projectService';
import type { CompanyProfileData, SeniorProfileData } from '@/services/profileService';
import type { UserProposal } from '@/services/proposalService';

export type ProjectReviewStatus = 'pending' | 'approved' | 'revision_requested' | 'rejected';
export type MatchStatus =
  | 'interest_created'
  | 'company_review'
  | 'contact_requested'
  | 'contact_confirmed'
  | 'meeting_scheduled'
  | 'in_discussion'
  | 'contract_draft'
  | 'contract_confirmed'
  | 'work_started'
  | 'settlement_pending'
  | 'settlement_requested'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'dispute';
export type SettlementStatus =
  | 'not_ready'
  | 'scheduled'
  | 'ready'
  | 'requested'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type AdminProject = JobPosting & { reviewStatus?: ProjectReviewStatus };

export type AdminNotificationRecord = {
  id: string;
  template: string;
  recipient: string;
  message: string;
  status: 'recorded';
  sentBy: string;
  createdAt: string;
};

export type AdminFeePolicy = {
  shortTermRate: number;
  shortTermMinimum: number;
  shortTermSettlementDays: number;
  longTermRate: number;
  longTermConfirmationDays: number;
  deductExistingPayment: boolean;
};

export type AdminAccount = {
  id: string;
  email: string;
  role: AdminRole;
  status: 'active' | 'pending';
  createdAt?: string;
  displayName?: string;
  expiresAt?: string;
  invitedBy?: string;
  lastSignInAt?: string;
  uid?: string;
};

export type AdminInviteResult = {
  admin: AdminAccount;
  message: string;
};

export type AdminTask = {
  id: string;
  priority: TaskPriority;
  title: string;
  companyName: string;
  projectName: string;
  talentName: string;
  currentStatus: string;
  createdAt: string;
  dueAt: string;
  owner: string;
  href: string;
};

export type AdminMatch = {
  id: string;
  companyName: string;
  projectName: string;
  talentName: string;
  source: 'application' | 'offer';
  status: MatchStatus;
  enteredAt: string;
  lastActivityAt: string;
  nextActionAt: string;
  expectedFee: number;
  owner: string;
};

export type AdminSettlement = {
  id: string;
  companyName: string;
  projectName: string;
  talentName: string;
  contractType: 'short_term_project' | 'part_time' | 'long_term_employment';
  contractAmountLabel: string;
  feeRate: number;
  feeAmount: number;
  scheduledAt: string;
  requestedAt?: string;
  dueAt: string;
  status: SettlementStatus;
  owner: string;
};

export type AdminDashboardData = {
  applications: UserProposal[];
  companies: CompanyProfileData[];
  projects: AdminProject[];
  seniorProfiles: SeniorProfileData[];
  tasks: AdminTask[];
  matches: AdminMatch[];
  settlements: AdminSettlement[];
  categoryStats: Array<{ label: string; count: number }>;
  trend: Array<{ date: string; projects: number; applications: number }>;
};

const PROPOSALS_COLLECTION = 'user_proposals';
const COMPANY_PROFILES_COLLECTION = 'company_profiles';
const SENIOR_PROFILES_COLLECTION = 'senior_profiles';
const AUDIT_LOGS_COLLECTION = 'auditLogs';
const ADMIN_MATCHES_COLLECTION = 'adminMatches';
const ADMIN_SETTLEMENTS_COLLECTION = 'adminSettlements';
const ADMIN_NOTIFICATIONS_COLLECTION = 'adminNotifications';
const ADMIN_SETTINGS_COLLECTION = 'adminSettings';
const LOCAL_MATCH_STATUS_KEY = 'eojob_admin_match_statuses';
const LOCAL_SETTLEMENT_STATUS_KEY = 'eojob_admin_settlement_statuses';
const LOCAL_NOTIFICATION_KEY = 'eojob_admin_notifications';
const LOCAL_FEE_POLICY_KEY = 'eojob_admin_fee_policy';
const LOCAL_PROJECT_REVIEW_KEY = 'eojob_admin_project_reviews';

export const defaultAdminFeePolicy: AdminFeePolicy = {
  shortTermRate: 5,
  shortTermMinimum: 99_000,
  shortTermSettlementDays: 7,
  longTermRate: 7,
  longTermConfirmationDays: 30,
  deductExistingPayment: true,
};

const matchStatusValues = new Set<MatchStatus>([
  'interest_created',
  'company_review',
  'contact_requested',
  'contact_confirmed',
  'meeting_scheduled',
  'in_discussion',
  'contract_draft',
  'contract_confirmed',
  'work_started',
  'settlement_pending',
  'settlement_requested',
  'paid',
  'completed',
  'cancelled',
  'dispute',
]);

const settlementStatusValues = new Set<SettlementStatus>([
  'not_ready',
  'scheduled',
  'ready',
  'requested',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
]);

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function dateValue(value: unknown, fallback = new Date().toISOString().slice(0, 10)) {
  const raw = stringValue(value);
  return raw || fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeCompanyProfile(value: unknown): CompanyProfileData | null {
  const source = objectValue(value);
  const companyName = stringValue(source.companyName);
  const email = stringValue(source.email, stringValue(source.contactEmail));
  if (!companyName && !email) return null;
  return {
    companyName: companyName || '회사명 미등록',
    companyAddress: stringValue(source.companyAddress, stringValue(source.description)),
    companySize: stringValue(source.companySize) || undefined,
    email,
    industry: stringValue(source.industry) || undefined,
    managerName: stringValue(source.managerName, '담당자 미등록'),
    phone: stringValue(source.phone, stringValue(source.contactPhone)),
    updatedAt: stringValue(source.updatedAt) || undefined,
  };
}

function normalizeSeniorProfile(value: unknown): SeniorProfileData | null {
  const source = objectValue(value);
  const email = stringValue(source.email);
  const field = stringValue(source.field, stringValue(source.desiredOccupationText));
  if (!email && !field) return null;
  return {
    desiredCategory: stringValue(source.desiredCategory) || undefined,
    desiredCategory2: stringValue(source.desiredCategory2) || undefined,
    desiredCategory3: stringValue(source.desiredCategory3) || undefined,
    desiredOccupationText: stringValue(source.desiredOccupationText) || undefined,
    desiredLocation: stringValue(source.desiredLocation) || undefined,
    desiredWorkType: stringValue(source.desiredWorkType) || undefined,
    email,
    experience: stringValue(source.experience),
    field: field || '희망 직종 미등록',
    keySkills: stringValue(source.keySkills) || undefined,
    period: stringValue(source.period),
    phone: stringValue(source.phone),
    certifications: stringValue(source.certifications) || undefined,
    solvedExperiences: stringValue(source.solvedExperiences) || undefined,
    employmentSubsidyTarget: Boolean(source.employmentSubsidyTarget),
    employmentSubsidyProgram: stringValue(source.employmentSubsidyProgram) || undefined,
    employmentSubsidyDocName: stringValue(source.employmentSubsidyDocName) || undefined,
    updatedAt: stringValue(source.updatedAt) || undefined,
  };
}

function normalizeProposal(value: unknown, documentId?: string): UserProposal | null {
  const source = objectValue(value);
  const id = documentId || stringValue(source.id);
  const projectId = stringValue(source.projectId);
  const projectTitle = stringValue(source.projectTitle);
  const companyName = stringValue(source.companyName);
  if (!id || !projectId || !projectTitle || !companyName) return null;
  const status = stringValue(source.status);
  return {
    id,
    appliedAt: dateValue(source.appliedAt),
    applicantEmail: stringValue(source.applicantEmail) || undefined,
    applicantName: stringValue(source.applicantName) || undefined,
    category: stringValue(source.category, 'operations'),
    companyName,
    coverNote: stringValue(source.coverNote) || undefined,
    employmentSubsidyProgram: stringValue(source.employmentSubsidyProgram) || undefined,
    employmentSubsidyTarget: Boolean(source.employmentSubsidyTarget),
    interviewSummary: stringValue(source.interviewSummary),
    location: stringValue(source.location, '협의'),
    problemStatement: stringValue(source.problemStatement) || undefined,
    projectOwnerId: stringValue(source.projectOwnerId) || undefined,
    projectId,
    projectTitle,
    resumeFileName: stringValue(source.resumeFileName),
    salaryRange: stringValue(source.salaryRange, '협의'),
    seniorFitScore: numberValue(source.seniorFitScore),
    status: status === '연락 받음' || status === '승인' ? status : '검토 중',
    updatedAt: stringValue(source.updatedAt) || undefined,
    userId: stringValue(source.userId) || undefined,
  };
}

async function readCollection<T>(
  collectionName: string,
  normalize: (value: unknown, documentId?: string) => T | null,
) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs
      .map((documentSnapshot) => normalize(documentSnapshot.data(), documentSnapshot.id))
      .filter((item): item is T => Boolean(item));
  } catch (error) {
    console.warn(`Admin readCollection(${collectionName}) failed:`, error);
    return [];
  }
}

function getLocalProposalRows() {
  const stored = readVersionedStorage<unknown[]>(PROPOSALS_COLLECTION);
  const legacyStored = readVersionedStorage<unknown[]>('eojob_user_proposals');
  return [...(stored ?? []), ...(legacyStored ?? [])]
    .map((item) => normalizeProposal(item))
    .filter((item): item is UserProposal => Boolean(item));
}

function uniqById<T extends { id?: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = item.id || JSON.stringify(item);
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

function addDays(date: string, days: number) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function createAdminTasks(projects: JobPosting[], applications: UserProposal[]): AdminTask[] {
  const projectTasks = projects
    .filter((project) => !project.source || project.source === 'internal')
    .slice(0, 6)
    .map((project): AdminTask => ({
      id: `project-${project.id}`,
      priority: 'high',
      title: '신규 프로젝트 검수',
      companyName: project.companyName,
      projectName: project.title,
      talentName: '-',
      currentStatus: hiringStageLabels[project.hiringStage] ?? '검수 대기',
      createdAt: project.postedAt,
      dueAt: addDays(project.postedAt, 1),
      owner: '운영팀',
      href: `/admin/projects?project=${project.id}`,
    }));

  const applicationTasks = applications.slice(0, 6).map((application): AdminTask => ({
    id: `application-${application.id}`,
    priority: application.status === '연락 받음' ? 'urgent' : 'normal',
    title: application.status === '연락 받음' ? '연락 진행 확인' : '신규 지원 확인',
    companyName: application.companyName,
    projectName: application.projectTitle,
    talentName: application.applicantName || '지원자',
    currentStatus: application.status,
    createdAt: application.updatedAt || application.appliedAt,
    dueAt: addDays(application.updatedAt || application.appliedAt, 2),
    owner: '운영팀',
    href: `/admin/applications?proposal=${application.id}`,
  }));

  return [...applicationTasks, ...projectTasks].slice(0, 10);
}

function deriveMatches(
  applications: UserProposal[],
  remoteStatuses: Record<string, MatchStatus> = {},
): AdminMatch[] {
  const storedStatuses = {
    ...remoteStatuses,
    ...(readVersionedStorage<Record<string, MatchStatus>>(LOCAL_MATCH_STATUS_KEY) ?? {}),
  };
  return applications
    .filter((application) => application.status === '연락 받음' || application.status === '승인')
    .map((application): AdminMatch => ({
      id: `match-${application.id}`,
      companyName: application.companyName,
      projectName: application.projectTitle,
      talentName: application.applicantName || '지원자',
      source: 'application',
      status:
        storedStatuses[`match-${application.id}`] ||
        (application.status === '승인' ? 'contract_confirmed' : 'contact_requested'),
      enteredAt: application.updatedAt || application.appliedAt,
      lastActivityAt: application.updatedAt || application.appliedAt,
      nextActionAt: addDays(application.updatedAt || application.appliedAt, 3),
      expectedFee: Math.max(99_000, Math.round(application.seniorFitScore * 10_000)),
      owner: '운영팀',
    }));
}

function deriveSettlements(
  matches: AdminMatch[],
  remoteStatuses: Record<string, SettlementStatus> = {},
): AdminSettlement[] {
  const storedStatuses = {
    ...remoteStatuses,
    ...(readVersionedStorage<Record<string, SettlementStatus>>(LOCAL_SETTLEMENT_STATUS_KEY) ?? {}),
  };
  return matches
    .filter((match) =>
      [
        'contract_confirmed',
        'work_started',
        'settlement_pending',
        'settlement_requested',
        'paid',
        'completed',
      ].includes(match.status),
    )
    .map((match): AdminSettlement => ({
      id: `settlement-${match.id}`,
      companyName: match.companyName,
      projectName: match.projectName,
      talentName: match.talentName,
      contractType: 'short_term_project',
      contractAmountLabel: '계약금액 확인 필요',
      feeRate: 0.05,
      feeAmount: match.expectedFee,
      scheduledAt: addDays(match.enteredAt, 7),
      dueAt: addDays(match.enteredAt, 14),
      status: storedStatuses[`settlement-${match.id}`] || 'scheduled',
      owner: match.owner,
    }));
}

function createTrend(projects: JobPosting[], applications: UserProposal[]) {
  const rows = new Map<string, { date: string; projects: number; applications: number }>();
  for (let index = 6; index >= 0; index -= 1) {
    const date = addDays(new Date().toISOString().slice(0, 10), -index);
    rows.set(date, { date: date.slice(5), projects: 0, applications: 0 });
  }
  for (const project of projects) {
    const key = project.postedAt.slice(0, 10);
    const row = rows.get(key);
    if (row) row.projects += 1;
  }
  for (const application of applications) {
    const key = application.appliedAt.slice(0, 10);
    const row = rows.get(key);
    if (row) row.applications += 1;
  }
  return Array.from(rows.values());
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    rawProjects,
    remoteApplications,
    companies,
    seniorProfiles,
    projectReviewRows,
    matchRows,
    settlementRows,
  ] = await Promise.all([
    fetchProjects(),
    readCollection(PROPOSALS_COLLECTION, normalizeProposal),
    readCollection(COMPANY_PROFILES_COLLECTION, (value) => normalizeCompanyProfile(value)),
    readCollection(SENIOR_PROFILES_COLLECTION, (value) => normalizeSeniorProfile(value)),
    readCollection('projects', (value, id) => {
      const reviewStatus = stringValue(objectValue(value).reviewStatus) as ProjectReviewStatus;
      return id && ['pending', 'approved', 'revision_requested', 'rejected'].includes(reviewStatus)
        ? { id, reviewStatus }
        : null;
    }),
    readCollection(ADMIN_MATCHES_COLLECTION, (value, id) => {
      const status = stringValue(objectValue(value).status) as MatchStatus;
      return id && matchStatusValues.has(status) ? { id, status } : null;
    }),
    readCollection(ADMIN_SETTLEMENTS_COLLECTION, (value, id) => {
      const status = stringValue(objectValue(value).status) as SettlementStatus;
      return id && settlementStatusValues.has(status) ? { id, status } : null;
    }),
  ]);
  const projectReviewStatuses = {
    ...Object.fromEntries(projectReviewRows.map((row) => [row.id, row.reviewStatus])),
    ...(readVersionedStorage<Record<string, ProjectReviewStatus>>(LOCAL_PROJECT_REVIEW_KEY) ?? {}),
  };
  const projects: AdminProject[] = rawProjects.map((project) => ({
    ...project,
    reviewStatus: projectReviewStatuses[project.id] || 'pending',
  }));
  const applications = uniqById([...remoteApplications, ...getLocalProposalRows()]);
  const matches = deriveMatches(
    applications,
    Object.fromEntries(matchRows.map((row) => [row.id, row.status])),
  );
  const settlements = deriveSettlements(
    matches,
    Object.fromEntries(settlementRows.map((row) => [row.id, row.status])),
  );
  const categoryStats = Object.entries(categoryLabels)
    .map(([category, label]) => ({
      label,
      count: projects.filter((project) => project.category === category).length,
    }))
    .filter((item) => item.count > 0)
    .slice(0, 6);

  return {
    applications,
    companies,
    projects,
    seniorProfiles,
    tasks: createAdminTasks(projects, applications),
    matches,
    settlements,
    categoryStats,
    trend: createTrend(projects, applications),
  };
}

function createToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replaceAll('-', '');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function fetchAdminAccounts(): Promise<AdminAccount[]> {
  const response = await requestAdminApi<{ admins: AdminAccount[] }>('/api/admin/admins');
  return response.admins;
}

export async function createAdminInvite(
  email: string,
  role: AdminRole,
): Promise<AdminInviteResult> {
  return requestAdminApi<AdminInviteResult>('/api/admin/admins/invite', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
  });
}

export async function updateProjectReviewStatus(
  projectId: string,
  reviewStatus: ProjectReviewStatus,
  adminEmail: string,
  memo?: string,
) {
  const updatedAt = new Date().toISOString();
  await setDoc(
    doc(db, 'projects', projectId),
    {
      reviewStatus,
      reviewedBy: adminEmail,
      reviewedAt: updatedAt,
      updatedAt,
    },
    { merge: true },
  );
  const previous =
    readVersionedStorage<Record<string, ProjectReviewStatus>>(LOCAL_PROJECT_REVIEW_KEY) ?? {};
  writeVersionedStorage(LOCAL_PROJECT_REVIEW_KEY, { ...previous, [projectId]: reviewStatus });
  try {
    await setDoc(
      doc(db, AUDIT_LOGS_COLLECTION, `PROJECT-REVIEW-${projectId}-${Date.now()}`),
      removeDeepUndefinedValues({
        type: 'project_review_status_changed',
        targetCollection: 'projects',
        targetId: projectId,
        actorEmail: adminEmail,
        reviewStatus,
        memo,
        createdAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    console.warn('Project review audit log failed:', error);
  }
}

export async function updateAdminMatchStatus(
  matchId: string,
  status: MatchStatus,
  adminEmail: string,
) {
  const previous = readVersionedStorage<Record<string, MatchStatus>>(LOCAL_MATCH_STATUS_KEY) ?? {};
  writeVersionedStorage(LOCAL_MATCH_STATUS_KEY, { ...previous, [matchId]: status });
  try {
    await setDoc(
      doc(db, ADMIN_MATCHES_COLLECTION, matchId),
      { status, updatedBy: adminEmail, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    writeVersionedStorage(LOCAL_MATCH_STATUS_KEY, previous);
    throw error;
  }
}

export async function updateAdminSettlementStatus(
  settlementId: string,
  status: SettlementStatus,
  adminEmail: string,
) {
  const previous =
    readVersionedStorage<Record<string, SettlementStatus>>(LOCAL_SETTLEMENT_STATUS_KEY) ?? {};
  writeVersionedStorage(LOCAL_SETTLEMENT_STATUS_KEY, { ...previous, [settlementId]: status });
  try {
    await setDoc(
      doc(db, ADMIN_SETTLEMENTS_COLLECTION, settlementId),
      { status, updatedBy: adminEmail, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    writeVersionedStorage(LOCAL_SETTLEMENT_STATUS_KEY, previous);
    throw error;
  }
}

export async function createAdminNotificationRecord(
  input: Pick<AdminNotificationRecord, 'template' | 'recipient' | 'message' | 'sentBy'>,
) {
  const createdAt = new Date().toISOString();
  const record: AdminNotificationRecord = {
    ...input,
    id: `ADMIN-NOTIFICATION-${createToken().slice(0, 12)}`,
    status: 'recorded',
    createdAt,
  };
  const previous = readVersionedStorage<AdminNotificationRecord[]>(LOCAL_NOTIFICATION_KEY) ?? [];
  writeVersionedStorage(LOCAL_NOTIFICATION_KEY, [record, ...previous].slice(0, 100));
  try {
    await setDoc(
      doc(db, ADMIN_NOTIFICATIONS_COLLECTION, record.id),
      removeDeepUndefinedValues({ ...record, createdAt: serverTimestamp() }),
    );
  } catch (error) {
    writeVersionedStorage(LOCAL_NOTIFICATION_KEY, previous);
    throw error;
  }
  return record;
}

export function getAdminNotificationRecords() {
  return readVersionedStorage<AdminNotificationRecord[]>(LOCAL_NOTIFICATION_KEY) ?? [];
}

export function getAdminFeePolicy() {
  return {
    ...defaultAdminFeePolicy,
    ...(readVersionedStorage<Partial<AdminFeePolicy>>(LOCAL_FEE_POLICY_KEY) ?? {}),
  };
}

export async function saveAdminFeePolicy(policy: AdminFeePolicy, adminEmail: string) {
  const previous = readVersionedStorage<AdminFeePolicy>(LOCAL_FEE_POLICY_KEY);
  writeVersionedStorage(LOCAL_FEE_POLICY_KEY, policy);
  try {
    await setDoc(
      doc(db, ADMIN_SETTINGS_COLLECTION, 'feePolicy'),
      { ...policy, updatedBy: adminEmail, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    if (previous) writeVersionedStorage(LOCAL_FEE_POLICY_KEY, previous);
    else if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_FEE_POLICY_KEY);
    throw error;
  }
}

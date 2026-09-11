import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  categoryLabels,
  type EmploymentType,
  type HiringStage,
  type JobPosting,
  type PostingDetailProvenance,
  type PostingDetailProvenanceMap,
  type ProjectAttachment,
  type ProjectCategory,
  type Seniority,
  type WorkType,
} from '@/data/jobPostings';
import {
  createStableRecordId,
  getStoredUserId,
  readVersionedStorage,
  removeUndefinedValues,
  uniqueByKey,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { db, storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const PROJECTS_COLLECTION = 'projects';
const LOCAL_PROJECTS_KEY = 'eojob_projects';
const categories = new Set<ProjectCategory>(Object.keys(categoryLabels) as ProjectCategory[]);
const workTypes = new Set<WorkType>(['remote', 'hybrid', 'onsite']);
const seniorities = new Set<Seniority>(['senior', 'lead', 'principal']);
const employmentTypes = new Set<EmploymentType>([
  'full-time',
  'contract',
  'part-time',
  'advisory',
  'project',
]);
const hiringStages = new Set<HiringStage>([
  'open',
  'screening',
  'interviewing',
  'closing',
  'closed',
]);
const postingSources = new Set<NonNullable<JobPosting['source']>>([
  'internal',
  'worknet',
  'seoul',
  'public',
]);

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

function attachments(value: unknown): ProjectAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const attachment = item as Record<string, unknown>;
    const name = stringValue(attachment.name);
    const type = stringValue(attachment.type, 'application/octet-stream');
    const size = typeof attachment.size === 'number' && Number.isFinite(attachment.size)
      ? Math.max(0, attachment.size)
      : 0;
    if (!name) return [];

    return [{
      name,
      type,
      size,
      url: stringValue(attachment.url) || undefined,
      storagePath: stringValue(attachment.storagePath) || undefined,
    }];
  });
}

function sourceDetailProvenance(
  value: unknown,
  ownerId: string | undefined,
  fields: Pick<JobPosting, 'coreResponsibilities' | 'problemStatement' | 'projectGoal' | 'requiredSkills'>,
): PostingDetailProvenanceMap | undefined {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  const allowed = new Set<PostingDetailProvenance>(['source', 'synthetic', 'unknown']);
  const keys = ['coreResponsibilities', 'problemStatement', 'projectGoal', 'requiredSkills'] as const;
  const explicit = Object.fromEntries(
    keys.flatMap((key) => (allowed.has(source?.[key] as PostingDetailProvenance) ? [[key, source?.[key]]] : [])),
  ) as PostingDetailProvenanceMap;

  if (Object.keys(explicit).length > 0) return explicit;
  if (!ownerId) return undefined;

  return {
    coreResponsibilities: fields.coreResponsibilities.length > 0 ? 'source' : 'unknown',
    problemStatement: fields.problemStatement ? 'source' : 'unknown',
    projectGoal: fields.projectGoal ? 'source' : 'unknown',
    requiredSkills: fields.requiredSkills.length > 0 ? 'source' : 'unknown',
  };
}

export function normalizeProject(id: string, source: unknown): JobPosting | null {
  if (!source || typeof source !== 'object') return null;
  const value = source as Record<string, unknown>;
  const title = stringValue(value.title);
  const companyName = stringValue(value.companyName);
  const category = value.category as ProjectCategory;

  if (!id || !title || !companyName || !categories.has(category)) return null;
  const lowerCn = companyName.toLowerCase();
  const lowerTitle = title.toLowerCase();
  if (
    lowerCn === '윤중심' ||
    lowerCn === 'healing j' ||
    lowerCn === '김인재' ||
    lowerTitle.includes('홈프로텍터') ||
    lowerTitle.includes('수제비누') ||
    (lowerCn === '(주) 기업명' && lowerTitle === '가나다라')
  ) {
    return null;
  }

  const postedAt = stringValue(value.postedAt, new Date().toISOString().slice(0, 10));
  const ownerId = stringValue(value.ownerId) || undefined;
  const coreResponsibilities = stringArray(value.coreResponsibilities);
  const problemStatement = stringValue(value.problemStatement, title);
  const projectGoal = stringValue(value.projectGoal);
  const requiredSkills = stringArray(value.requiredSkills);
  return {
    id,
    ownerId,
    companyName,
    industry: stringValue(value.industry, '산업 정보 미등록'),
    companySize: stringValue(value.companySize, '기업 규모 협의'),
    title,
    category,
    seniority: seniorities.has(value.seniority as Seniority)
      ? (value.seniority as Seniority)
      : 'lead',
    employmentType: employmentTypes.has(value.employmentType as EmploymentType)
      ? (value.employmentType as EmploymentType)
      : 'project',
    hiringStage: hiringStages.has(value.hiringStage as HiringStage)
      ? (value.hiringStage as HiringStage)
      : 'open',
    isPublic: typeof value.isPublic === 'boolean' ? value.isPublic : undefined,
    workType: workTypes.has(value.workType as WorkType) ? (value.workType as WorkType) : 'hybrid',
    location: stringValue(value.location, '협의/미등록'),
    experienceYears: stringValue(value.experienceYears, '협의/미등록'),
    salaryRange: stringValue(value.salaryRange, '협의/미등록'),
    attachments: attachments(value.attachments),
    deadline: stringValue(value.deadline),
    projectDuration: stringValue(value.projectDuration, '협의/미등록'),
    collaborationTargets: stringArray(value.collaborationTargets),
    coreResponsibilities,
    qualifications: stringArray(value.qualifications),
    benefits: stringArray(value.benefits),
    problemStatement,
    projectGoal: stringValue(value.projectGoal),
    successMetrics: stringArray(value.successMetrics),
    requiredSkills,
    preferredSkills: stringArray(value.preferredSkills),
    matchingSignals: stringArray(value.matchingSignals),
    recommendedTalentType: stringValue(
      value.recommendedTalentType,
      '관련 경험을 보유한 시니어 전문가',
    ),
    matchingScoreCriteria: stringArray(value.matchingScoreCriteria),
    interviewFocus: stringArray(value.interviewFocus),
    sourceDetailProvenance: sourceDetailProvenance(value.sourceDetailProvenance, ownerId, {
      coreResponsibilities,
      problemStatement,
      projectGoal,
      requiredSkills,
    }),
    seniorFitScore:
      typeof value.seniorFitScore === 'number' && Number.isFinite(value.seniorFitScore)
        ? Math.min(100, Math.max(0, value.seniorFitScore))
        : 80,
    postedAt,
    source: postingSources.has(value.source as NonNullable<JobPosting['source']>)
      ? (value.source as NonNullable<JobPosting['source']>)
      : ownerId
        ? 'internal'
        : undefined,
    sourceUrl: stringValue(value.sourceUrl) || undefined,
    sourceProvider: stringValue(value.sourceProvider) || undefined,
  };
}

const DELETED_TEST_PROJECT_IDS = new Set(['PROJECT-4716ed6d', 'PROJECT-8fe2dfaa', 'PROJECT-faffec6f']);

export function getLocalProjects(): JobPosting[] {
  const stored = readVersionedStorage<unknown[]>(LOCAL_PROJECTS_KEY);
  if (!Array.isArray(stored)) return [];
  return stored
    .map((project) => {
      const value = project as { id?: unknown };
      return normalizeProject(stringValue(value.id), project);
    })
    .filter((project): project is JobPosting => Boolean(project))
    .filter(
      (project) =>
        !DELETED_TEST_PROJECT_IDS.has(project.id) &&
        project.title !== '테스트 및 수정용' &&
        project.title !== '최동일' &&
        project.companyName !== 'a' &&
        !project.companyName.includes('KOREAMONSTER'),
    );
}

function saveLocalProjects(projects: JobPosting[]) {
  const nextProjects = uniqueByKey(projects, (project) => project.id);
  if (JSON.stringify(getLocalProjects()) === JSON.stringify(nextProjects)) return;
  writeVersionedStorage(
    LOCAL_PROJECTS_KEY,
    nextProjects,
  );
}

function upsertLocalProject(project: JobPosting) {
  const existing = getLocalProjects().filter((item) => item.id !== project.id);
  saveLocalProjects([project, ...existing]);
}

export async function fetchProjects(): Promise<JobPosting[]> {
  const localProjects = getLocalProjects();
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const snapshot = await getDocs(query(projectsRef, orderBy('postedAt', 'desc')));
    const remoteProjects = snapshot.docs
      .map((document) => normalizeProject(document.id, document.data()))
      .filter((project): project is JobPosting => Boolean(project));
    const projects = uniqueByKey([...remoteProjects, ...localProjects], (project) => project.id);
    saveLocalProjects(projects);
    return projects;
  } catch (error) {
    console.warn('Firestore fetchProjects failed, using local projects:', error);
    return localProjects;
  }
}

export async function fetchProjectById(id: string): Promise<JobPosting | null> {
  const localProject = getLocalProjects().find((project) => project.id === id) ?? null;
  try {
    const snapshot = await getDoc(doc(db, PROJECTS_COLLECTION, id));
    if (!snapshot.exists()) return localProject;
    const project = normalizeProject(snapshot.id, snapshot.data());
    if (project) upsertLocalProject(project);
    return project ?? localProject;
  } catch (error) {
    console.warn(`Firestore fetchProjectById(${id}) failed, using local project:`, error);
    return localProject;
  }
}

export async function createProject(
  projectData: Omit<JobPosting, 'id' | 'postedAt'>,
): Promise<{ project: JobPosting; savedToFirestore: boolean }> {
  const postedAt = new Date().toISOString().slice(0, 10);
  const id = createStableRecordId(
    'PROJECT',
    projectData.ownerId,
    projectData.companyName,
    projectData.title,
  );
  const project = normalizeProject(id, { ...projectData, postedAt });
  if (!project) throw new Error('필수 프로젝트 정보가 올바르지 않습니다.');

  upsertLocalProject(project);

  try {
    await setDoc(
      doc(db, PROJECTS_COLLECTION, id),
      removeUndefinedValues({
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
    return { project, savedToFirestore: true };
  } catch (error) {
    console.warn('Firestore createProject failed, project remains in local storage:', error);
    return { project, savedToFirestore: false };
  }
}

function fileNameForStorage(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadProjectAttachments(
  projectId: string,
  files: File[],
): Promise<ProjectAttachment[]> {
  return Promise.all(
    files.map(async (file, index) => {
      const uniqueName = `${Date.now()}-${index}-${fileNameForStorage(file.name)}`;
      const storagePath = `project-attachments/${projectId}/${uniqueName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });

      return {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        storagePath,
        url: await getDownloadURL(snapshot.ref),
      };
    }),
  );
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<JobPosting, 'id'>>,
  actorId?: string,
): Promise<void> {
  const current = getLocalProjects().find((project) => project.id === id);
  const effectiveActorId = actorId || getStoredUserId();
  if (!current?.ownerId || !effectiveActorId || current.ownerId !== effectiveActorId) {
    throw new Error('본인 소유 프로젝트만 수정할 수 있습니다.');
  }

  try {
    await updateDoc(
      doc(db, PROJECTS_COLLECTION, id),
      removeUndefinedValues({ ...updates, updatedAt: serverTimestamp() }),
    );
    const updated = normalizeProject(id, { ...current, ...updates });
    if (updated) upsertLocalProject(updated);
  } catch (error) {
    console.error(`Firestore updateProject(${id}) failed:`, error);
    throw error;
  }
}

export async function deleteProject(id: string, actorId?: string): Promise<void> {
  const current = getLocalProjects().find((project) => project.id === id);
  const effectiveActorId = actorId || getStoredUserId();
  if (!current?.ownerId || !effectiveActorId || current.ownerId !== effectiveActorId) {
    throw new Error('본인 소유 프로젝트만 삭제할 수 있습니다.');
  }

  try {
    await deleteDoc(doc(db, PROJECTS_COLLECTION, id));
    saveLocalProjects(getLocalProjects().filter((project) => project.id !== id));
  } catch (error) {
    console.error(`Firestore deleteProject(${id}) failed:`, error);
    throw error;
  }
}

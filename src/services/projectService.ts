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
  type ProjectCategory,
  type Seniority,
  type WorkType,
} from '@/data/jobPostings';
import {
  createStableRecordId,
  readVersionedStorage,
  removeUndefinedValues,
  uniqueByKey,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { db } from '@/lib/firebase';

const PROJECTS_COLLECTION = 'projects';
const LOCAL_PROJECTS_KEY = 'eojob_projects';
const categories = new Set<ProjectCategory>(Object.keys(categoryLabels) as ProjectCategory[]);
const workTypes = new Set<WorkType>(['remote', 'hybrid', 'onsite']);
const seniorities = new Set<Seniority>(['senior', 'lead', 'principal']);
const employmentTypes = new Set<EmploymentType>(['full-time', 'contract', 'advisory', 'project']);
const hiringStages = new Set<HiringStage>(['open', 'screening', 'interviewing', 'closing']);

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

export function normalizeProject(id: string, source: unknown): JobPosting | null {
  if (!source || typeof source !== 'object') return null;
  const value = source as Record<string, unknown>;
  const title = stringValue(value.title);
  const companyName = stringValue(value.companyName);
  const category = value.category as ProjectCategory;

  if (!id || !title || !companyName || !categories.has(category)) return null;

  const postedAt = stringValue(value.postedAt, new Date().toISOString().slice(0, 10));
  return {
    id,
    ownerId: stringValue(value.ownerId) || undefined,
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
    workType: workTypes.has(value.workType as WorkType) ? (value.workType as WorkType) : 'hybrid',
    location: stringValue(value.location, '근무 위치 협의'),
    experienceYears: stringValue(value.experienceYears, '경력 협의'),
    salaryRange: stringValue(value.salaryRange, '보상 협의'),
    deadline: stringValue(value.deadline, postedAt),
    projectDuration: stringValue(value.projectDuration, '기간 협의'),
    collaborationTargets: stringArray(value.collaborationTargets),
    coreResponsibilities: stringArray(value.coreResponsibilities),
    qualifications: stringArray(value.qualifications),
    benefits: stringArray(value.benefits),
    problemStatement: stringValue(value.problemStatement, title),
    projectGoal: stringValue(value.projectGoal, title),
    successMetrics: stringArray(value.successMetrics),
    requiredSkills: stringArray(value.requiredSkills),
    preferredSkills: stringArray(value.preferredSkills),
    matchingSignals: stringArray(value.matchingSignals),
    recommendedTalentType: stringValue(
      value.recommendedTalentType,
      '관련 경험을 보유한 시니어 전문가',
    ),
    matchingScoreCriteria: stringArray(value.matchingScoreCriteria),
    interviewFocus: stringArray(value.interviewFocus),
    seniorFitScore:
      typeof value.seniorFitScore === 'number' && Number.isFinite(value.seniorFitScore)
        ? Math.min(100, Math.max(0, value.seniorFitScore))
        : 80,
    postedAt,
  };
}

function getLocalProjects() {
  const stored = readVersionedStorage<unknown[]>(LOCAL_PROJECTS_KEY);
  if (!Array.isArray(stored)) return [];
  return stored
    .map((project) => {
      const value = project as { id?: unknown };
      return normalizeProject(stringValue(value.id), project);
    })
    .filter((project): project is JobPosting => Boolean(project));
}

function saveLocalProjects(projects: JobPosting[]) {
  writeVersionedStorage(
    LOCAL_PROJECTS_KEY,
    uniqueByKey(projects, (project) => project.id),
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

export async function updateProject(
  id: string,
  updates: Partial<Omit<JobPosting, 'id'>>,
): Promise<void> {
  const current = getLocalProjects().find((project) => project.id === id);
  if (current) {
    const updated = normalizeProject(id, { ...current, ...updates });
    if (updated) upsertLocalProject(updated);
  }

  try {
    await updateDoc(
      doc(db, PROJECTS_COLLECTION, id),
      removeUndefinedValues({ ...updates, updatedAt: serverTimestamp() }),
    );
  } catch (error) {
    console.error(`Firestore updateProject(${id}) failed:`, error);
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  saveLocalProjects(getLocalProjects().filter((project) => project.id !== id));
  try {
    await deleteDoc(doc(db, PROJECTS_COLLECTION, id));
  } catch (error) {
    console.error(`Firestore deleteProject(${id}) failed:`, error);
    throw error;
  }
}

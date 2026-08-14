import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { jobPostings as initialJobPostings, type JobPosting } from '@/data/jobPostings';
import { db } from '@/lib/firebase';

const PROJECTS_COLLECTION = 'projects';

export async function fetchProjects(): Promise<JobPosting[]> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const q = query(projectsRef, orderBy('postedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return initialJobPostings;
    }

    const projects: JobPosting[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
      } as JobPosting;
    });

    return projects;
  } catch (error) {
    console.warn('Firestore fetchProjects failed, falling back to local seed data:', error);
    return initialJobPostings;
  }
}

export async function fetchProjectById(id: string): Promise<JobPosting | null> {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as JobPosting;
    }

    const localMatch = initialJobPostings.find((p: JobPosting) => p.id === id);
    return localMatch || null;
  } catch (error) {
    console.warn(`Firestore fetchProjectById(${id}) failed, checking local seed data:`, error);
    const localMatch = initialJobPostings.find((p: JobPosting) => p.id === id);
    return localMatch || null;
  }
}

export async function createProject(
  projectData: Omit<JobPosting, 'id' | 'postedAt'>,
): Promise<JobPosting> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const postedAtStr = new Date().toISOString().split('T')[0] ?? new Date().toISOString();
    const newDocData = {
      ...projectData,
      postedAt: postedAtStr,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(projectsRef, newDocData);
    return {
      id: docRef.id,
      ...projectData,
      postedAt: postedAtStr,
    };
  } catch (error) {
    console.error('Firestore createProject failed:', error);
    throw error;
  }
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<JobPosting, 'id'>>,
): Promise<void> {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Firestore updateProject(${id}) failed:`, error);
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Firestore deleteProject(${id}) failed:`, error);
    throw error;
  }
}

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';

import { jobPostings } from '@/data/jobPostings';
import { db } from '@/lib/firebase';

const PROJECTS_COLLECTION = 'projects';

export async function seedProjectsIfEmpty(): Promise<boolean> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const snapshot = await getDocs(projectsRef);

    if (!snapshot.empty) {
      return false; // Already seeded
    }

    console.log('Firestore projects collection is empty. Seeding initial job postings...');

    for (const posting of jobPostings) {
      const docRef = doc(db, PROJECTS_COLLECTION, posting.id);
      await setDoc(docRef, {
        ...posting,
        createdAt: new Date().toISOString(),
      });
    }

    console.log(`Successfully seeded ${jobPostings.length} projects to Firestore.`);
    return true;
  } catch (error) {
    console.warn('seedProjectsIfEmpty failed:', error);
    return false;
  }
}

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type SeniorProfileData = {
  desiredCategory?: string;
  desiredCategory2?: string;
  desiredCategory3?: string;
  email: string;
  experience: string;
  field: string;
  keySkills?: string;
  period: string;
  phone: string;
  solvedExperiences?: string;
  updatedAt?: string;
};

export type CompanyProfileData = {
  companyName: string;
  companySize: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  industry: string;
  updatedAt?: string;
};

const SENIOR_PROFILES_COLLECTION = 'senior_profiles';
const COMPANY_PROFILES_COLLECTION = 'company_profiles';

export async function getSeniorProfile(uid: string): Promise<SeniorProfileData | null> {
  try {
    const docRef = doc(db, SENIOR_PROFILES_COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as SeniorProfileData;
    }
    return null;
  } catch (error) {
    console.warn(`getSeniorProfile(${uid}) failed:`, error);
    return null;
  }
}

export async function saveSeniorProfile(
  uid: string,
  profile: SeniorProfileData,
): Promise<void> {
  try {
    const docRef = doc(db, SENIOR_PROFILES_COLLECTION, uid);
    await setDoc(
      docRef,
      {
        ...profile,
        updatedAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error(`saveSeniorProfile(${uid}) failed:`, error);
    throw error;
  }
}

export async function getCompanyProfile(uid: string): Promise<CompanyProfileData | null> {
  try {
    const docRef = doc(db, COMPANY_PROFILES_COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as CompanyProfileData;
    }
    return null;
  } catch (error) {
    console.warn(`getCompanyProfile(${uid}) failed:`, error);
    return null;
  }
}

export async function saveCompanyProfile(
  uid: string,
  profile: CompanyProfileData,
): Promise<void> {
  try {
    const docRef = doc(db, COMPANY_PROFILES_COLLECTION, uid);
    await setDoc(
      docRef,
      {
        ...profile,
        updatedAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error(`saveCompanyProfile(${uid}) failed:`, error);
    throw error;
  }
}

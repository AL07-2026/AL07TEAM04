import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { normalizeOccupationPreferences } from '@/data/occupationCategories';
import {
  getScopedStorageKey,
  readVersionedStorage,
  removeUndefinedValues,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { db } from '@/lib/firebase';

export type SeniorProfileData = {
  desiredCategory?: string;
  desiredCategory2?: string;
  desiredCategory3?: string;
  desiredLocation?: string;
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
  companyAddress: string;
  companyName: string;
  companySize?: string;
  email: string;
  industry?: string;
  managerName: string;
  phone: string;
  updatedAt?: string;
};

const SENIOR_PROFILES_COLLECTION = 'senior_profiles';
const COMPANY_PROFILES_COLLECTION = 'company_profiles';
const SENIOR_PROFILE_STORAGE_KEY = 'eojob_senior_profile';
const COMPANY_PROFILE_STORAGE_KEY = 'eojob_company_profile';

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeSeniorProfile(source: unknown): SeniorProfileData | null {
  if (!source || typeof source !== 'object') return null;
  const value = source as Record<string, unknown>;
  const field = stringValue(value.field);
  const experience = stringValue(value.experience);
  const email = stringValue(value.email);
  if (!field || !experience || !email) return null;
  const desiredCategories = normalizeOccupationPreferences([
    stringValue(value.desiredCategory),
    stringValue(value.desiredCategory2),
    stringValue(value.desiredCategory3),
  ]);

  return {
    desiredCategory: desiredCategories[0],
    desiredCategory2: desiredCategories[1],
    desiredCategory3: desiredCategories[2],
    desiredLocation: stringValue(value.desiredLocation) || undefined,
    field,
    period: stringValue(value.period),
    experience,
    keySkills: stringValue(value.keySkills) || undefined,
    solvedExperiences: stringValue(value.solvedExperiences) || undefined,
    phone: stringValue(value.phone),
    email,
    updatedAt: stringValue(value.updatedAt) || undefined,
  };
}

function normalizeCompanyProfile(source: unknown): CompanyProfileData | null {
  if (!source || typeof source !== 'object') return null;
  const value = source as Record<string, unknown>;
  const companyName = stringValue(value.companyName);
  const email = stringValue(value.email, stringValue(value.contactEmail));
  if (!companyName || !email) return null;

  return {
    companyName,
    companyAddress: stringValue(value.companyAddress, stringValue(value.description)),
    managerName: stringValue(value.managerName, '담당자'),
    email,
    phone: stringValue(value.phone, stringValue(value.contactPhone)),
    industry: stringValue(value.industry) || undefined,
    companySize: stringValue(value.companySize) || undefined,
    updatedAt: stringValue(value.updatedAt) || undefined,
  };
}

function readScopedProfile<T>(
  baseKey: string,
  ownerId: string | undefined,
  normalize: (source: unknown) => T | null,
) {
  const scopedKey = getScopedStorageKey(baseKey, ownerId);
  const scoped = normalize(readVersionedStorage<unknown>(scopedKey));
  if (scoped) return scoped;

  const legacy = normalize(readVersionedStorage<unknown>(baseKey));
  if (legacy) {
    writeVersionedStorage(scopedKey, legacy);
    localStorage.removeItem(baseKey);
  }
  return legacy;
}

export function getLocalSeniorProfile(ownerId?: string) {
  return readScopedProfile(SENIOR_PROFILE_STORAGE_KEY, ownerId, normalizeSeniorProfile);
}

export function saveLocalSeniorProfile(profile: SeniorProfileData, ownerId?: string) {
  const normalized = normalizeSeniorProfile(profile);
  if (!normalized) throw new Error('저장할 인재 프로필 정보가 올바르지 않습니다.');
  writeVersionedStorage(getScopedStorageKey(SENIOR_PROFILE_STORAGE_KEY, ownerId), normalized);
}

export function getLocalCompanyProfile(ownerId?: string) {
  return readScopedProfile(COMPANY_PROFILE_STORAGE_KEY, ownerId, normalizeCompanyProfile);
}

export function saveLocalCompanyProfile(profile: CompanyProfileData, ownerId?: string) {
  const normalized = normalizeCompanyProfile(profile);
  if (!normalized) throw new Error('저장할 회사 정보가 올바르지 않습니다.');
  writeVersionedStorage(getScopedStorageKey(COMPANY_PROFILE_STORAGE_KEY, ownerId), normalized);
}

export async function getSeniorProfile(uid: string): Promise<SeniorProfileData | null> {
  try {
    const snapshot = await getDoc(doc(db, SENIOR_PROFILES_COLLECTION, uid));
    return snapshot.exists() ? normalizeSeniorProfile(snapshot.data()) : null;
  } catch (error) {
    console.warn(`getSeniorProfile(${uid}) failed:`, error);
    return null;
  }
}

export async function resolveSeniorProfile(uid?: string): Promise<SeniorProfileData | null> {
  const localProfile = getLocalSeniorProfile(uid);
  if (localProfile) return localProfile;
  if (!uid) return null;

  const remoteProfile = await getSeniorProfile(uid);
  if (remoteProfile) saveLocalSeniorProfile(remoteProfile, uid);
  return remoteProfile;
}

export async function saveSeniorProfile(uid: string, profile: SeniorProfileData): Promise<void> {
  const normalized = normalizeSeniorProfile(profile);
  if (!normalized) throw new Error('저장할 인재 프로필 정보가 올바르지 않습니다.');

  try {
    await setDoc(
      doc(db, SENIOR_PROFILES_COLLECTION, uid),
      removeUndefinedValues({
        ...normalized,
        updatedAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      }),
      { merge: true },
    );
  } catch (error) {
    console.error(`saveSeniorProfile(${uid}) failed:`, error);
    throw error;
  }
}

export async function getCompanyProfile(uid: string): Promise<CompanyProfileData | null> {
  try {
    const snapshot = await getDoc(doc(db, COMPANY_PROFILES_COLLECTION, uid));
    return snapshot.exists() ? normalizeCompanyProfile(snapshot.data()) : null;
  } catch (error) {
    console.warn(`getCompanyProfile(${uid}) failed:`, error);
    return null;
  }
}

export async function saveCompanyProfile(uid: string, profile: CompanyProfileData): Promise<void> {
  const normalized = normalizeCompanyProfile(profile);
  if (!normalized) throw new Error('저장할 회사 정보가 올바르지 않습니다.');

  try {
    await setDoc(
      doc(db, COMPANY_PROFILES_COLLECTION, uid),
      removeUndefinedValues({
        ...normalized,
        contactEmail: normalized.email,
        contactPhone: normalized.phone,
        description: normalized.companyAddress,
        updatedAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      }),
      { merge: true },
    );
  } catch (error) {
    console.error(`saveCompanyProfile(${uid}) failed:`, error);
    throw error;
  }
}

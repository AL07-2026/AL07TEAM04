import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import {
  OTHER_OCCUPATION_PREFERENCE,
  normalizeOccupationPreferenceValues,
} from '@/data/occupationCategories';
import {
  getScopedStorageKey,
  readVersionedStorage,
  removeUndefinedValues,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { db } from '@/lib/firebase';
import { clearJobSearchClientCache } from './jobSearchService';
import { clearWorknetFeedCache } from './worknetService';

export type SeniorProfileData = {
  desiredCategory?: string;
  desiredCategory2?: string;
  desiredCategory3?: string;
  desiredOccupationText?: string;
  desiredLocation?: string;
  desiredWorkType?: string;
  email: string;
  experience: string;
  field: string;
  keySkills?: string;
  period: string;
  phone: string;
  certifications?: string;
  solvedExperiences?: string;
  employmentSubsidyTarget?: boolean;
  employmentSubsidyProgram?: string;
  employmentSubsidyDocName?: string;
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

function isLegacyDesiredWorkType(value: string) {
  return /시간제|파트타임|계약직|기간제|정규직|자문·프로젝트|전체 무관/.test(value);
}

function normalizeSeniorProfile(source: unknown): SeniorProfileData | null {
  if (!source || typeof source !== 'object') return null;
  const value = source as Record<string, unknown>;
  const field = stringValue(value.field);
  const rawExperience = stringValue(value.experience);
  const desiredWorkType =
    stringValue(value.desiredWorkType) ||
    (isLegacyDesiredWorkType(rawExperience)
      ? rawExperience
      : '시간제·파트타임 (오전/오후)');
  const experience = rawExperience === desiredWorkType ? '' : rawExperience;
  const email = stringValue(value.email);
  if (!field || !email) return null;
  const desiredPreferences = normalizeOccupationPreferenceValues([
    stringValue(value.desiredCategory),
    stringValue(value.desiredCategory2),
    stringValue(value.desiredCategory3),
  ]);
  const desiredOccupationText = stringValue(value.desiredOccupationText);

  return {
    desiredCategory: desiredPreferences[0],
    desiredCategory2: desiredPreferences[1],
    desiredCategory3: desiredPreferences[2],
    desiredOccupationText:
      desiredPreferences.includes(OTHER_OCCUPATION_PREFERENCE) && desiredOccupationText
        ? desiredOccupationText
        : undefined,
    desiredLocation: stringValue(value.desiredLocation) || undefined,
    desiredWorkType,
    field,
    period: stringValue(value.period),
    experience,
    keySkills: stringValue(value.keySkills) || undefined,
    certifications: stringValue(value.certifications) || undefined,
    solvedExperiences: stringValue(value.solvedExperiences) || undefined,
    employmentSubsidyTarget: Boolean(value.employmentSubsidyTarget),
    employmentSubsidyProgram: stringValue(value.employmentSubsidyProgram) || undefined,
    employmentSubsidyDocName: stringValue(value.employmentSubsidyDocName) || undefined,
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
  return normalize(readVersionedStorage<unknown>(scopedKey));
}

function removeScopedProfile(baseKey: string, ownerId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getScopedStorageKey(baseKey, ownerId));
}

export function getLocalSeniorProfile(ownerId?: string) {
  return readScopedProfile(SENIOR_PROFILE_STORAGE_KEY, ownerId, normalizeSeniorProfile);
}

function cacheLocalSeniorProfile(profile: SeniorProfileData, ownerId?: string) {
  const normalized = normalizeSeniorProfile(profile);
  if (!normalized) throw new Error('저장할 인재 프로필 정보가 올바르지 않습니다.');
  const current = getLocalSeniorProfile(ownerId);
  if (JSON.stringify(current) === JSON.stringify(normalized)) return;
  writeVersionedStorage(getScopedStorageKey(SENIOR_PROFILE_STORAGE_KEY, ownerId), normalized);
}

export function saveLocalSeniorProfile(profile: SeniorProfileData, ownerId?: string) {
  clearWorknetFeedCache();
  clearJobSearchClientCache();
  cacheLocalSeniorProfile(profile, ownerId);
}

export function getLocalCompanyProfile(ownerId?: string) {
  return readScopedProfile(COMPANY_PROFILE_STORAGE_KEY, ownerId, normalizeCompanyProfile);
}

export function saveLocalCompanyProfile(profile: CompanyProfileData, ownerId?: string) {
  const normalized = normalizeCompanyProfile(profile);
  if (!normalized) throw new Error('저장할 회사 정보가 올바르지 않습니다.');
  writeVersionedStorage(getScopedStorageKey(COMPANY_PROFILE_STORAGE_KEY, ownerId), normalized);
}

type RemoteProfileResult<T> =
  | { profile: T | null; status: 'resolved' }
  | { status: 'unavailable' };

async function readRemoteProfile<T>(
  collectionName: string,
  uid: string,
  normalize: (source: unknown) => T | null,
): Promise<RemoteProfileResult<T>> {
  try {
    const snapshot = await getDoc(doc(db, collectionName, uid));
    return {
      profile: snapshot.exists() ? normalize(snapshot.data()) : null,
      status: 'resolved',
    };
  } catch (error) {
    console.warn(`readRemoteProfile(${collectionName}/${uid}) failed:`, error);
    return { status: 'unavailable' };
  }
}

export async function getSeniorProfile(uid: string): Promise<SeniorProfileData | null> {
  const result = await readRemoteProfile(SENIOR_PROFILES_COLLECTION, uid, normalizeSeniorProfile);
  return result.status === 'resolved' ? result.profile : null;
}

export async function resolveSeniorProfile(uid?: string): Promise<SeniorProfileData | null> {
  const localProfile = getLocalSeniorProfile(uid);
  if (!uid) return localProfile;

  const result = await readRemoteProfile(SENIOR_PROFILES_COLLECTION, uid, normalizeSeniorProfile);
  if (result.status === 'unavailable') return localProfile;
  if (result.profile) {
    cacheLocalSeniorProfile(result.profile, uid);
  } else {
    removeScopedProfile(SENIOR_PROFILE_STORAGE_KEY, uid);
  }
  return result.profile;
}

export async function saveSeniorProfile(
  uid: string,
  profile: SeniorProfileData,
): Promise<SeniorProfileData> {
  const normalized = normalizeSeniorProfile(profile);
  if (!normalized) throw new Error('저장할 인재 프로필 정보가 올바르지 않습니다.');
  const persistedProfile: SeniorProfileData = {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(
      doc(db, SENIOR_PROFILES_COLLECTION, uid),
      removeUndefinedValues({
        ...persistedProfile,
        timestamp: serverTimestamp(),
      }),
      { merge: true },
    );
    saveLocalSeniorProfile(persistedProfile, uid);
    return persistedProfile;
  } catch (error) {
    console.error(`saveSeniorProfile(${uid}) failed:`, error);
    throw error;
  }
}

export async function getCompanyProfile(uid: string): Promise<CompanyProfileData | null> {
  const result = await readRemoteProfile(COMPANY_PROFILES_COLLECTION, uid, normalizeCompanyProfile);
  return result.status === 'resolved' ? result.profile : null;
}

export async function resolveCompanyProfile(uid?: string): Promise<CompanyProfileData | null> {
  const localProfile = getLocalCompanyProfile(uid);
  if (!uid) return localProfile;

  const result = await readRemoteProfile(COMPANY_PROFILES_COLLECTION, uid, normalizeCompanyProfile);
  if (result.status === 'unavailable') return localProfile;
  if (result.profile) {
    saveLocalCompanyProfile(result.profile, uid);
  } else {
    removeScopedProfile(COMPANY_PROFILE_STORAGE_KEY, uid);
  }
  return result.profile;
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

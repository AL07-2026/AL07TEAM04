import { deleteField, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import {
  OTHER_OCCUPATION_PREFERENCE,
  normalizeOccupationPreferenceValues,
} from '@/data/occupationCategories';
import type {
  ExperienceInferredSkill,
  ExperienceInformationQuality,
  ExperienceMissingInformation,
} from '@/lib/applicationFlow';
import {
  getScopedStorageKey,
  removeDeepUndefinedValues,
  readVersionedStorage,
  removeUndefinedValues,
  writeVersionedStorage,
} from '@/lib/browserStorage';
import { db } from '@/lib/firebase';
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
  experienceProfileV1?: ExperienceProfileV1;
  experienceCardsV1?: ExperienceProfileV1[];
  updatedAt?: string;
};

/** Confirmed public experience only. Unconfirmed interview drafts are session scoped. */
export type ExperienceProfileV1 = {
  facts?: string[];
  id?: string;
  inferredSkills?: ExperienceInferredSkill[];
  informationQuality?: ExperienceInformationQuality;
  jobKeywords?: string[];
  missingInformation?: ExperienceMissingInformation[];
  workedOn: string;
  accomplished: string;
  recruiterHighlight?: string;
  strengths: string[];
  strengthInsight?: string;
  summary?: string;
  version: 1;
  generatedAt?: string;
  confirmedAt: string;
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

function normalizeExperienceProfile(value: unknown): ExperienceProfileV1 | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const workedOn = stringValue(source.workedOn);
  const accomplished = stringValue(source.accomplished);
  const strengths = Array.isArray(source.strengths)
    ? source.strengths
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const confirmedAt = stringValue(source.confirmedAt);
  if (!workedOn && !accomplished && strengths.length === 0) return undefined;
  return {
    facts: normalizeStringArray(source.facts, 8),
    id: stringValue(source.id) || undefined,
    inferredSkills: normalizeInferredSkills(source.inferredSkills),
    informationQuality: normalizeInformationQuality(source.informationQuality),
    jobKeywords: normalizeStringArray(source.jobKeywords, 5),
    missingInformation: normalizeMissingInformation(source.missingInformation),
    workedOn,
    accomplished,
    recruiterHighlight: stringValue(source.recruiterHighlight) || undefined,
    strengths,
    strengthInsight: stringValue(source.strengthInsight) || undefined,
    summary: stringValue(source.summary) || undefined,
    version: 1,
    generatedAt: stringValue(source.generatedAt) || undefined,
    confirmedAt: confirmedAt || new Date(0).toISOString(),
  };
}

function normalizeStringArray(value: unknown, maxLength: number) {
  if (!Array.isArray(value)) return undefined;
  const normalized = [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, maxLength);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeInferredSkills(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      skill: stringValue(item.skill),
      reason: stringValue(item.reason),
    }))
    .filter((item) => item.skill && item.reason)
    .slice(0, 6);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeQualityValue(value: unknown) {
  return value === 'complete' || value === 'weak' || value === 'missing' ? value : undefined;
}

function normalizeInformationQuality(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const normalized = {
    problem: normalizeQualityValue(source.problem),
    role: normalizeQualityValue(source.role),
    action: normalizeQualityValue(source.action),
    result: normalizeQualityValue(source.result),
  };
  return normalized.problem && normalized.role && normalized.action && normalized.result
    ? (normalized as ExperienceInformationQuality)
    : undefined;
}

function normalizeMissingInformation(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      field: stringValue(item.field),
      reason: stringValue(item.reason),
      followUpQuestion: stringValue(item.followUpQuestion),
    }))
    .filter((item) => item.field && item.reason && item.followUpQuestion)
    .slice(0, 4);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeExperienceProfiles(value: unknown): ExperienceProfileV1[] {
  if (!Array.isArray(value)) return [];
  const uniqueCards = new Map<string, ExperienceProfileV1>();
  for (const item of value) {
    const normalized = normalizeExperienceProfile(item);
    if (!normalized) continue;
    const key = normalized.id || normalized.confirmedAt;
    if (!uniqueCards.has(key)) uniqueCards.set(key, normalized);
  }

  return Array.from(uniqueCards.values()).sort((first, second) =>
    second.confirmedAt.localeCompare(first.confirmedAt),
  );
}

function normalizeSeniorProfile(source: unknown): SeniorProfileData | null {
  if (!source || typeof source !== 'object') return null;
  const value = source as Record<string, unknown>;
  const field = stringValue(value.field);
  const desiredWorkType =
    stringValue(value.desiredWorkType) ||
    stringValue(value.experience) ||
    '시간제·파트타임 (오전/오후)';
  const experience = desiredWorkType;
  const email = stringValue(value.email);
  if (!field || !email) return null;
  const desiredPreferences = normalizeOccupationPreferenceValues([
    stringValue(value.desiredCategory),
    stringValue(value.desiredCategory2),
    stringValue(value.desiredCategory3),
  ]);
  const desiredOccupationText = stringValue(value.desiredOccupationText);

  const experienceProfile = normalizeExperienceProfile(value.experienceProfileV1);
  const experienceCards = normalizeExperienceProfiles(value.experienceCardsV1);
  const hasExperienceCardsField = Array.isArray(value.experienceCardsV1);
  const normalizedExperienceCards = hasExperienceCardsField
    ? experienceCards
    : experienceProfile
      ? [experienceProfile]
      : undefined;

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
    experienceProfileV1: hasExperienceCardsField
      ? experienceCards[0]
      : (normalizedExperienceCards?.[0] ?? experienceProfile),
    experienceCardsV1: normalizedExperienceCards,
    phone: stringValue(value.phone),
    email,
    updatedAt: stringValue(value.updatedAt) || undefined,
  };
}

export async function saveSeniorExperienceCards(
  uid: string,
  profile: SeniorProfileData,
  experienceCards: ExperienceProfileV1[],
): Promise<SeniorProfileData> {
  const normalized = normalizeSeniorProfile({
    ...profile,
    experienceCardsV1: experienceCards,
    experienceProfileV1: experienceCards[0],
  });
  if (!normalized) throw new Error('저장할 인재 프로필 정보가 올바르지 않습니다.');

  const nextProfile: SeniorProfileData = {
    ...normalized,
    experienceCardsV1: experienceCards,
    experienceProfileV1: experienceCards[0],
  };

  await setDoc(
    doc(db, SENIOR_PROFILES_COLLECTION, uid),
    removeDeepUndefinedValues(
      removeUndefinedValues({
        ...nextProfile,
        experienceCardsV1: experienceCards,
        experienceProfileV1: experienceCards[0] ?? deleteField(),
        updatedAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      }),
    ),
    { merge: true },
  );

  saveLocalSeniorProfile(nextProfile, uid);
  return nextProfile;
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
  const scopedData = normalize(readVersionedStorage<unknown>(scopedKey));
  if (scopedData) return scopedData;
  if (ownerId) {
    const fallbackKey = getScopedStorageKey(baseKey, undefined);
    return normalize(readVersionedStorage<unknown>(fallbackKey));
  }
  return null;
}

export function getLocalSeniorProfile(ownerId?: string) {
  return readScopedProfile(SENIOR_PROFILE_STORAGE_KEY, ownerId, normalizeSeniorProfile);
}

export function saveLocalSeniorProfile(profile: SeniorProfileData, ownerId?: string) {
  const normalized = normalizeSeniorProfile(profile);
  if (!normalized) throw new Error('저장할 인재 프로필 정보가 올바르지 않습니다.');
  clearWorknetFeedCache();
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
      removeDeepUndefinedValues(
        removeUndefinedValues({
          ...normalized,
          updatedAt: new Date().toISOString(),
          timestamp: serverTimestamp(),
        }),
      ),
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

export async function resolveCompanyProfile(uid?: string): Promise<CompanyProfileData | null> {
  const localProfile = getLocalCompanyProfile(uid);
  if (localProfile) return localProfile;
  if (!uid) return null;

  const remoteProfile = await getCompanyProfile(uid);
  if (remoteProfile) saveLocalCompanyProfile(remoteProfile, uid);
  return remoteProfile;
}

export async function saveCompanyProfile(uid: string, profile: CompanyProfileData): Promise<void> {
  const normalized = normalizeCompanyProfile(profile);
  if (!normalized) throw new Error('저장할 회사 정보가 올바르지 않습니다.');

  try {
    await setDoc(
      doc(db, COMPANY_PROFILES_COLLECTION, uid),
      removeDeepUndefinedValues(
        removeUndefinedValues({
          ...normalized,
          contactEmail: normalized.email,
          contactPhone: normalized.phone,
          description: normalized.companyAddress,
          updatedAt: new Date().toISOString(),
          timestamp: serverTimestamp(),
        }),
      ),
      { merge: true },
    );
  } catch (error) {
    console.error(`saveCompanyProfile(${uid}) failed:`, error);
    throw error;
  }
}

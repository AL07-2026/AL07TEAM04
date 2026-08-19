import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { JobPosting } from '@/data/jobPostings';
import {
  classifyOccupationCategoryFromJobText,
  deduplicateJobPostings,
  mapProjectCategoryToOccupation,
  normalizeCompanyAndTitle,
  normalizeOccupationCategory,
  occupationToProjectCategory,
} from '@/data/occupationCategories';
import { db } from '@/lib/firebase';

const GLOBAL_JOB_POSTINGS_COLLECTION = 'global_job_postings';

function normalizeStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : fallback;
}

export function sanitizeAndEnhanceProblemStatement(posting: Partial<JobPosting>): string {
  let ps = typeof posting.problemStatement === 'string' ? posting.problemStatement.trim() : '';

  ps = ps.replace(/^\[(?:서울시 일자리(?: 분석)?|공공기관 채용(?: 분석)?|시니어 맞춤 채용|시니어 맞춤)\]\s*/g, '').trim();
  ps = ps.replace(/\s*채용\s*채용$/g, ' 채용').trim();

  return ps;
}

/**
 * Firestore may contain older/API-created postings that predate newer detail fields.
 * Normalize those records at the data boundary so every UI consumer receives arrays.
 */
export function normalizeJobPostingDetailFields(posting: JobPosting): JobPosting {
  const { companyName, title } = normalizeCompanyAndTitle(posting.companyName, posting.title);
  const industry = typeof posting.industry === 'string' ? posting.industry.trim() : '';

  return {
    ...posting,
    companyName,
    title,
    problemStatement: sanitizeAndEnhanceProblemStatement({ ...posting, companyName, title }),
    collaborationTargets: normalizeStringArray(posting.collaborationTargets, ['부서 실무진']),
    coreResponsibilities: normalizeStringArray(
      posting.coreResponsibilities,
      title ? [`${title} 직무 수행`] : ['공고에 명시된 직무 수행'],
    ),
    qualifications: normalizeStringArray(posting.qualifications, ['상세 자격 요건은 원문 공고에서 확인']),
    benefits: normalizeStringArray(posting.benefits, ['상세 근무 조건은 원문 공고에서 확인']),
    successMetrics: normalizeStringArray(posting.successMetrics),
    requiredSkills: normalizeStringArray(posting.requiredSkills, industry ? [industry] : ['실무 경험']),
    preferredSkills: normalizeStringArray(posting.preferredSkills),
    matchingSignals: normalizeStringArray(posting.matchingSignals),
    matchingScoreCriteria: normalizeStringArray(posting.matchingScoreCriteria, [
      '직무 연관성',
      '경력 정보',
      '근무 지역',
    ]),
    interviewFocus: normalizeStringArray(posting.interviewFocus, ['관련 실무 경험 및 주요 성과']),
    recommendedTalentType:
      typeof posting.recommendedTalentType === 'string' && posting.recommendedTalentType.trim()
        ? posting.recommendedTalentType.trim()
        : `${industry || '해당 직무'} 분야 실무 경험을 보유한 인재`,
  };
}

function sanitizeDocumentId(rawId: string): string {
  return rawId.replace(/[/\\#?%]/g, '_').trim();
}

function parseDeadlineDate(deadlineStr?: string): Date | null {
  if (!deadlineStr) return null;
  const match = deadlineStr.match(/\d{4}-\d{2}-\d{2}/);
  if (match) {
    const d = new Date(match[0]);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function isPostingExpired(posting: JobPosting, now = new Date()): boolean {
  if (posting.deadlineLabel?.includes('마감 완료')) {
    return true;
  }
  const deadlineDate = parseDeadlineDate(posting.deadline);
  if (deadlineDate) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return deadlineDate < today;
  }
  return false;
}

/**
 * Synchronize and accumulate job postings into Firestore with deduplication.
 * Uses posting.id as document ID so duplicate postings overwrite/merge cleanly.
 */
export async function syncJobPostingsToFirestore(
  postings: JobPosting[],
  now = new Date(),
): Promise<number> {
  if (!db || postings.length === 0) return 0;
  if (import.meta.env.MODE === 'test') return postings.length;

  const validPostings = postings
    .map(normalizeJobPostingDetailFields)
    .filter((p) => p.id && p.title && !isPostingExpired(p, now));
  if (validPostings.length === 0) return 0;

  const CHUNK_SIZE = 50;
  let totalSaved = 0;

  for (let i = 0; i < validPostings.length; i += CHUNK_SIZE) {
    const chunk = validPostings.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      for (const posting of chunk) {
        const docId = sanitizeDocumentId(posting.id);
        const docRef = doc(db, GLOBAL_JOB_POSTINGS_COLLECTION, docId);
        batch.set(
          docRef,
          {
            ...posting,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }
      await batch.commit();
      totalSaved += chunk.length;
    } catch (error) {
      console.warn('Firestore batch sync chunk write notice:', error);
      for (const posting of chunk) {
        try {
          const docId = sanitizeDocumentId(posting.id);
          const docRef = doc(db, GLOBAL_JOB_POSTINGS_COLLECTION, docId);
          await setDoc(docRef, { ...posting, updatedAt: new Date().toISOString() }, { merge: true });
          totalSaved++;
        } catch {
          // Ignore individual write errors gracefully
        }
      }
    }
  }

  return totalSaved;
}

/**
 * Fetch all accumulated active job postings directly from Firestore.
 */
export async function fetchAccumulatedJobPostingsFromFirestore(
  maxCount = 2000,
): Promise<JobPosting[]> {
  if (!db) return [];
  if (import.meta.env.MODE === 'test') return [];

  try {
    const colRef = collection(db, GLOBAL_JOB_POSTINGS_COLLECTION);
    const q = query(colRef, limit(maxCount));
    const snapshot = await Promise.race([
      getDocs(q),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
    ]);

    if (!snapshot) {
      console.warn('Firestore getDocs fetch timed out after 3500ms fallback');
      return [];
    }

    const postings: JobPosting[] = [];
    const now = new Date();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as JobPosting;
      if (data && data.id && data.title && !isPostingExpired(data, now)) {
        const { companyName, title } = normalizeCompanyAndTitle(data.companyName, data.title);
        const classification = classifyOccupationCategoryFromJobText(title, data.industry);
        const storedOccupationCategory = normalizeOccupationCategory(data.occupationCategory);
        const occupationCategory =
          data.occupationClassificationStatus === 'ambiguous'
            ? undefined
            : data.occupationClassificationStatus === 'classified' && storedOccupationCategory
              ? storedOccupationCategory
            : classification.isConfident
              ? classification.category
              : storedOccupationCategory ??
                mapProjectCategoryToOccupation(data.category) ??
                'general-legal-office';
        const category = occupationCategory
          ? occupationToProjectCategory[occupationCategory] || data.category || 'operations'
          : data.category || 'operations';
        postings.push(
          normalizeJobPostingDetailFields({
            ...data,
            companyName,
            title,
            occupationCategory,
            category,
          }),
        );
      }
    });

    return deduplicateJobPostings(postings);
  } catch (error) {
    console.warn('Firestore accumulated jobs fetch notice:', error);
    return [];
  }
}

/**
 * Purge expired job postings from Firestore automatically.
 */
export async function purgeExpiredJobPostings(now = new Date()): Promise<number> {
  if (!db) return 0;
  if (import.meta.env.MODE === 'test') return 0;

  try {
    const colRef = collection(db, GLOBAL_JOB_POSTINGS_COLLECTION);
    const snapshot = await getDocs(colRef);

    let purgedCount = 0;
    const CHUNK_SIZE = 50;
    const expiredDocsToPurge: string[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as JobPosting;
      if (isPostingExpired(data, now)) {
        expiredDocsToPurge.push(docSnap.id);
      }
    });

    for (let i = 0; i < expiredDocsToPurge.length; i += CHUNK_SIZE) {
      const chunk = expiredDocsToPurge.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const docId of chunk) {
        batch.delete(doc(db, GLOBAL_JOB_POSTINGS_COLLECTION, docId));
      }
      await batch.commit();
      purgedCount += chunk.length;
    }

    return purgedCount;
  } catch (error) {
    console.warn('Firestore purge expired job notice:', error);
    return 0;
  }
}

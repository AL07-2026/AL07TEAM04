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

  const title = typeof posting.title === 'string' ? posting.title.trim() : '';
  const companyName = typeof posting.companyName === 'string' ? posting.companyName.trim() : '';
  const industry = typeof posting.industry === 'string' ? posting.industry.trim() : '';
  const category = posting.category || (posting.occupationCategory ? occupationToProjectCategory[posting.occupationCategory] : undefined) || 'operations';

  const isDryBoilerplate =
    !ps ||
    ps === `${companyName}의 ${title} 채용` ||
    ps === `${title} 채용` ||
    ps === `${companyName}의 ${title}` ||
    (ps.endsWith('채용입니다.') && ps.includes('프로젝트 해결을 위한 전문 인재 채용입니다.')) ||
    (ps.endsWith('채용입니다.') && ps.includes('공공 프로젝트 핵심 인재 채용입니다.'));

  if (!isDryBoilerplate) {
    return ps;
  }

  const companyStr = companyName ? `${companyName}의 ` : '';
  const indStr = industry && !['업종 정보 미제공', '경영/일반', '공공행정/경영'].includes(industry) ? `[${industry}] ` : '';
  const titleLower = `${title} ${industry}`.toLowerCase();

  switch (category) {
    case 'dev-engineering':
    case 'legacy-modernization':
      return `${indStr}${companyStr}'${title}' 주요 과제: 기존 시스템 고도화 및 레거시 개선, 개발 환경 표준화를 통해 시스템 안정성 및 효율성을 극대화하는 엔지니어링 프로젝트입니다.`;
    case 'design-brand':
      if (/ux|ui|웹|앱|디지털|인터랙티브/.test(titleLower)) {
        return `${indStr}${companyStr}'${title}' 주요 과제: 디지털 UX/UI 디자인 시스템 수립 및 사용자 경험을 개선하는 프로젝트입니다.`;
      }
      if (/편집|인쇄|출판|패키지|시각|그래픽/.test(titleLower)) {
        return `${indStr}${companyStr}'${title}' 주요 과제: 시각/인쇄 디자인 표준 가이드라인 정립 및 결과물 제작 품질을 향상하는 프로젝트입니다.`;
      }
      if (/인테리어|공간|설계|전시|무대/.test(titleLower)) {
        return `${indStr}${companyStr}'${title}' 주요 과제: 공간 인테리어 설계 및 시공 품질 정립을 위한 마감 제작 프로젝트입니다.`;
      }
      return `${indStr}${companyStr}'${title}' 주요 과제: 기업 브랜드 아이덴티티 수립 및 실무 디자인 제작 품질을 강화하는 프로젝트입니다.`;
    case 'marketing-sales':
    case 'growth':
      return `${indStr}${companyStr}'${title}' 주요 과제: 신규 타깃 마케팅 전략 수립 및 세일즈 파이프라인 개척을 통해 지속 가능한 매출 성장을 달성하는 마케팅 프로젝트입니다.`;
    case 'hr-strategy':
      return `${indStr}${companyStr}'${title}' 주요 과제: 전사 조직 체계 정비, 평가/보상 시스템 고도화 및 시니어 경험 기반의 조직 문화를 정립하는 경영지원 프로젝트입니다.`;
    case 'r-and-d-manufacturing':
      if (/설계|기계|cad|3d|도면/.test(titleLower)) {
        return `${indStr}${companyStr}'${title}' 주요 과제: 제품 메커니즘 설계 고도화 및 도면 표준화를 통해 품질과 생산 효율성을 높이는 설계 프로젝트입니다.`;
      }
      return `${indStr}${companyStr}'${title}' 주요 과제: 스마트 팩토리 품질 공정 자동화, 생산 수율 향상 및 기술 인프라 표준화와 품질 인증 체계를 정립하는 핵심 프로젝트입니다.`;
    case 'ai-automation':
    case 'data-platform':
      return `${indStr}${companyStr}'${title}' 주요 과제: 사내 반복 업무의 AI/RPA 자동화 도입 및 데이터 분석 파이프라인 수립을 통한 데이터 기반 의사결정 체계 구축입니다.`;
    case 'security':
      return `${indStr}${companyStr}'${title}' 주요 과제: 정보보호 컴플라이언스 준수, 보안 위험 진단 및 사내 인프라 보안 관리 체계를 고도화하는 리스크 프로젝트입니다.`;
    case 'operations':
    default:
      if (/총무|자산|시설/.test(titleLower)) {
        return `${indStr}${companyStr}'${title}' 주요 과제: 전사 총무/시설 관리 프로세스 표준화 및 자산 운영 효율성을 극대화하는 프로젝트입니다.`;
      }
      if (/인테리어|설계|시공|가구/.test(titleLower)) {
        return `${indStr}${companyStr}'${title}' 주요 과제: 공간 인테리어 설계 및 현장 시공 운영 품질을 향상하는 실무 프로젝트입니다.`;
      }
      return `${indStr}${companyStr}'${title}' 주요 과제: 전사 운영 프로세스 리드타임 단축, 현장 병목 구간 개선을 통한 고효율 운영 체계 최적화 프로젝트입니다.`;
  }
}

/**
 * Firestore may contain older/API-created postings that predate newer detail fields.
 * Normalize those records at the data boundary so every UI consumer receives arrays.
 */
export function normalizeJobPostingDetailFields(posting: JobPosting): JobPosting {
  const title = typeof posting.title === 'string' ? posting.title.trim() : '';
  const industry = typeof posting.industry === 'string' ? posting.industry.trim() : '';

  return {
    ...posting,
    problemStatement: sanitizeAndEnhanceProblemStatement(posting),
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

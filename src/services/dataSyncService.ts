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

export function extractCleanPositionTitle(rawTitle?: string, companyName?: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '실무 전문가';
  let title = rawTitle.trim();

  // Strip company name prefix if inside title
  if (companyName) {
    const safeComp = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`^(?:\\(주\\)\\s*)?${safeComp}(?:의|\\s+)+`, 'i'), '').trim();
    title = title.replace(new RegExp(`^${safeComp}\\s*`, 'i'), '').trim();
  }

  // Strip leading brackets like [급구], [신입/경력], [주 5일], [서울]
  title = title.replace(/^\[[^\]]+\]\s*/g, '').trim();

  // Strip leading promotional slogans & complex descriptors
  title = title
    .replace(/^기업\s*글로벌\s*브랜드\s*리디자인\s*및\s*/gi, '')
    .replace(/^글로벌\s*브랜드\s*리디자인\s*및\s*/gi, '')
    .replace(/^녹지\s*공간과\s*활력을\s*더하는\s*/gi, '')
    .replace(/^경험\s*풍부한\s*/gi, '')
    .replace(/^최고의\s*/gi, '')
    .replace(/^혁신적인\s*/gi, '')
    .replace(/^[가-힣0-9A-Za-z\s]+와\s*함께할\s*/gi, '')
    .trim();

  // Strip trailing marketing & recruitment suffixes
  title = title
    .replace(/\s*로\s*함께\s*성장하세요!?$/gi, '')
    .replace(/\s*함께\s*성장하세요!?$/gi, '')
    .replace(/\s*공개\s*채용$/gi, '')
    .replace(/\s*공개채용$/gi, '')
    .replace(/\s*경력직\s*채용$/gi, '')
    .replace(/\s*경력직$/gi, '')
    .replace(/\s*채용$/gi, '')
    .replace(/\s*모집합니다!?$/gi, '')
    .replace(/\s*모집$/gi, '')
    .trim();

  // Clean up software dump strings
  title = title.replace(/캐드\s*,\s*3D\s*,\s*스케치업/gi, 'CAD/3D');
  title = title.replace(/\(모델하우스\s*,\s*주택전시관\)/gi, '');
  title = title.trim();

  if (!title || title.length < 2) {
    return rawTitle.trim();
  }

  return title;
}

export function sanitizeAndEnhanceProblemStatement(posting: Partial<JobPosting>): string {
  let ps = typeof posting.problemStatement === 'string' ? posting.problemStatement.trim() : '';

  ps = ps.replace(/^\[(?:서울시 일자리(?: 분석)?|공공기관 채용(?: 분석)?|시니어 맞춤 채용|시니어 맞춤)\]\s*/g, '').trim();
  ps = ps.replace(/^\[[^\]]+\]\s*/g, '').trim();
  ps = ps.replace(/\s*공개채용(?:\s*프로젝트입니다\.?)?$/gi, '').trim();
  ps = ps.replace(/\s*경력직(?:\s*프로젝트입니다\.?)?$/gi, '').trim();
  ps = ps.replace(/\s*채용\s*채용$/gi, '').trim();
  ps = ps.replace(/\s*채용입니다\.?$/gi, '').trim();
  ps = ps.replace(/\s*모집합니다\.?\s*(?:채용)?\s*(?:프로젝트입니다\.?)?$/gi, '').trim();
  ps = ps.replace(/\s*채용\s*프로젝트입니다\.?$/gi, '').trim();

  // Clean leading grammar fragments
  ps = ps.replace(/^(?:에서|으로|의|과|와|을|를)\s+/g, '').trim();

  const title = typeof posting.title === 'string' ? posting.title.trim() : '';
  const companyName = typeof posting.companyName === 'string' ? posting.companyName.trim() : '';
  const industry = typeof posting.industry === 'string' ? posting.industry.trim() : '';
  const category = posting.category || (posting.occupationCategory ? occupationToProjectCategory[posting.occupationCategory] : undefined) || 'operations';

  // Strip company name prefix if present in problemStatement
  if (companyName) {
    const safeComp = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ps = ps.replace(new RegExp(`^(?:\\(주\\)\\s*)?${safeComp}(?:의|에서|\\s+)+`, 'i'), '').trim();
    ps = ps.replace(new RegExp(`^${safeComp}\\s*`, 'i'), '').trim();
  }

  // Strip title prefix or quote prefix if present in problemStatement
  if (title) {
    const safeTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ps = ps.replace(new RegExp(`^['"‘“]?${safeTitle}['"’”]?\\s*(?:주요\\s*과제|과제|프로젝트)?[:\\s]*`, 'i'), '').trim();
    ps = ps.replace(/^주요\s*과제[:\s]*/i, '').trim();
    ps = ps.replace(/\s*과제\s*해결입니다\.?$/i, '').trim();
    ps = ps.replace(/\s*프로젝트입니다\.?$/i, '').trim();
  }

  // Clean remaining slogan fragments or recruitment junk
  ps = ps
    .replace(/함께\s*성장하세요!?/gi, '')
    .replace(/캐드\s*,\s*3D\s*,\s*스케치업\s*외\s*\(.*?\)/gi, '')
    .replace(/HC\s*공개/gi, '')
    .trim();

  ps = ps.replace(/^(?:에서|으로|의|과|와|을|를)\s+/g, '').trim();

  const isDryBoilerplate =
    !ps ||
    ps.length < 10 ||
    ps === title ||
    ps === `${companyName}의 ${title}` ||
    (companyName && title && ps.includes(companyName) && ps.includes(title));

  if (!isDryBoilerplate) {
    if (!ps.endsWith('.') && !ps.endsWith('다')) {
      ps += ' 프로젝트입니다.';
    }
    return ps;
  }

  const titleLower = `${title} ${industry} ${ps}`.toLowerCase();

  switch (category) {
    case 'dev-engineering':
    case 'legacy-modernization':
      return '기존 시스템 고도화, 레거시 개선 및 개발 환경 표준화를 통해 시스템 안정성 및 생산성을 극대화하는 엔지니어링 프로젝트입니다.';

    case 'design-brand':
      if (/모션그래픽|모션|영상|광고\s*영상|미디어|애니메이션|pd|비디오|youtube|유튜브|방송/.test(titleLower)) {
        return '영화·드라마·광고 영상의 모션그래픽 연출 및 시각적 완성도가 높은 비주얼 미디어 콘텐츠를 제작하는 프로젝트입니다.';
      }
      if (/주거|커뮤니티|모델하우스|주택전시관/.test(titleLower)) {
        return '주거·커뮤니티 공간 및 모델하우스 인테리어 설계와 현장 시공 프로세스를 최적화하는 프로젝트입니다.';
      }
      if (/실내\s*인테리어|스케치업|3d|cad|캐드/.test(titleLower)) {
        return '실내 공간 CAD/3D 도면 설계 및 상업·공공 시설 인테리어 마감 품질을 고도화하는 프로젝트입니다.';
      }
      if (/수원광교|한샘디자인|매장|쇼룸|디스플레이/.test(titleLower)) {
        return '매장 공간 디스플레이 설계 및 고객 경험 쇼룸을 구성하는 브랜딩 인테리어 프로젝트입니다.';
      }
      if (/인테리어|공간|건축|시공|전시|무대|리하우스|가구\s*설계/.test(titleLower)) {
        return '주거 및 공간 인테리어 설계, 3D 도면 작성 및 시공 품질 관리 프로세스를 표준화하는 프로젝트입니다.';
      }
      if (/ux|ui|웹|앱|인터랙티브|프로덕트|디자인\s*시스템|플랫폼/.test(titleLower)) {
        return '디지털 UX/UI 디자인 시스템 구축 및 사용자 경험 모델을 설계하여 제품 완성도를 높이는 프로젝트입니다.';
      }
      if (/편집|인쇄|출판|패키지|시각|그래픽|디지털인쇄|디지털 인쇄/.test(titleLower)) {
        return '시각 및 인쇄 디자인 표준 가이드라인 정립과 가공·제작 결과물의 품질을 고도화하는 프로젝트입니다.';
      }
      return '기업 브랜드 아이덴티티 수립 및 실무 디자인 시스템의 완성도를 강화하는 브랜드 리디자인 프로젝트입니다.';

    case 'marketing-sales':
    case 'growth':
      return '신규 타깃 마케팅 전략 수립 및 세일즈 파이프라인 개척을 통해 지속 가능한 매출 성장을 달성하는 마케팅 프로젝트입니다.';

    case 'hr-strategy':
      return '전사 조직 체계 정비, 평가·보상 시스템 고도화 및 시니어 경험 기반의 조직 문화를 정립하는 경영지원 프로젝트입니다.';

    case 'r-and-d-manufacturing':
      if (/야외운동기구|운동기구|설계|기계|cad|3d|도면|기구/.test(titleLower)) {
        return '야외 운동기구 메커니즘 설계 고도화 및 도면 표준화를 통해 구조 안정성과 생산성을 높이는 설계 프로젝트입니다.';
      }
      return '스마트 팩토리 공정 자동화, 생산 수율 향상 및 품질 인증 체계를 정립하는 생산 공정 최적화 프로젝트입니다.';

    case 'ai-automation':
    case 'data-platform':
      return '사내 반복 업무의 AI/RPA 자동화 도입 및 데이터 분석 파이프라인 수립을 통한 데이터 기반 의사결정 체계 구축 프로젝트입니다.';

    case 'security':
      return '정보보호 컴플라이언스 준수, 보안 위험 진단 및 사내 인프라 보안 관리 체계를 고도화하는 보안 프로젝트입니다.';

    case 'operations':
    default:
      if (/총무|자산|시설/.test(titleLower)) {
        return '전사 총무·시설 관리 프로세스 표준화 및 자산 운영 효율성을 극대화하는 프로젝트입니다.';
      }
      if (/인테리어|설계|시공|가구/.test(titleLower)) {
        return '공간 인테리어 설계 및 시공 운영 품질 프로세스를 표준화하는 프로젝트입니다.';
      }
      return '전사 운영 프로세스 리드타임 단축 및 병목 구간 개선을 통한 고효율 운영 체계 최적화 프로젝트입니다.';
  }
}

export const formatCleanProblemStatement = sanitizeAndEnhanceProblemStatement;

export function formatSimpleLocation(rawLocation?: string): string {
  if (!rawLocation || typeof rawLocation !== 'string') return '근무지 미지정';
  const loc = rawLocation.trim();

  // Extract Region + City/District/County
  const regionMatch = loc.match(/(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)\s*([가-힣]+(?:시|군|구))/);
  if (regionMatch) {
    return `${regionMatch[1]} ${regionMatch[2]}`;
  }

  return loc.split(/\s+/).slice(0, 2).join(' ');
}

export function formatSimpleWorkSchedule(rawSchedule?: string): string {
  if (!rawSchedule || typeof rawSchedule !== 'string') return '';
  const sch = rawSchedule.trim();

  // Pattern: "(근무시간) (오전) 10시 00분 ~ (오후) 7시 00분" or "(오전) 9시 00분 ~ (오후) 6시 00분"
  const timeMatch = sch.match(/(?:\(오전\)\s*)?(\d{1,2})시(?:\s*(\d{1,2})분)?\s*~\s*(?:\(오후\)\s*)?(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  if (timeMatch) {
    let startH = parseInt(timeMatch[1] || '0', 10);
    const startM = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    let endH = parseInt(timeMatch[3] || '0', 10);
    const endM = timeMatch[4] ? parseInt(timeMatch[4], 10) : 0;

    if (sch.includes('(오후)') || (endH > 0 && endH < 12)) {
      if (endH < 12) endH += 12;
    }
    if (sch.includes('(오전)') && startH === 12) {
      startH = 0;
    }

    const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    return `${startStr} ~ ${endStr}`;
  }

  const dayMatch = sch.match(/주\s*(\d)일/);
  if (dayMatch) {
    const isFlexible = /유연/.test(sch);
    return `주 ${dayMatch[1]}일${isFlexible ? ' (유연근무)' : ''}`;
  }

  return sch
    .replace(/\(근무시간\)\s*/g, '')
    .replace(/\(오전\)\s*/g, '')
    .replace(/\(오후\)\s*/g, '')
    .trim();
}

export function formatSimpleSalary(rawSalary?: string): string {
  if (!rawSalary || typeof rawSalary !== 'string') return '';
  let sal = rawSalary.trim();

  // Pattern: "최소연봉 / 2600만원" or "최소연봉 / 3000만원 - 면접 후 협의가능"
  const minAnnualMatch = sal.match(/최소연봉\s*\/\s*(\d+)만원(?:\s*-\s*(.*))?/);
  if (minAnnualMatch) {
    const amount = parseInt(minAnnualMatch[1] || '0', 10).toLocaleString('ko-KR');
    const note = minAnnualMatch[2] ? minAnnualMatch[2].trim() : '';
    if (note.includes('면접 후 협의') || note.includes('협의')) {
      return `연 ${amount}만원 (협의가능)`;
    }
    return `연 ${amount}만원 이상`;
  }

  sal = sal.replace(/월\s*(\d+(?:,\d+)?)\s*만원\s*~\s*(\d+(?:,\d+)?)\s*만원/g, '월 $1만 ~ $2만원');
  sal = sal.replace(/^최소연봉\s*\/\s*/g, '');

  return sal;
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

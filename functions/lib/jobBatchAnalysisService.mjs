import { createHash } from 'node:crypto';
import { createGeminiClient, GEMINI_FLASH_MODEL } from './gemini.mjs';
import { adminDb } from './firestoreAdmin.mjs';

const GLOBAL_COLLECTION = 'global_job_postings';

/**
 * Computes a deterministic SHA-256 hash for job text to detect content changes.
 */
export function generateJobContentHash(job) {
  const title = String(job?.title || '').trim();
  const company = String(job?.companyName || '').trim();
  const duties = Array.isArray(job?.coreResponsibilities)
    ? job.coreResponsibilities.join('|')
    : String(job?.coreResponsibilities || '');
  const quals = Array.isArray(job?.qualifications)
    ? job.qualifications.join('|')
    : String(job?.qualifications || '');
  const problem = String(job?.problemStatement || '').trim();
  const exp = String(job?.experienceYears || '').trim();

  const payload = [title, company, duties, quals, problem, exp].join('::');
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * 1st-stage rule-based senior filter to prevent running LLMs on entry-level/intern/simple labor jobs.
 */
export function isCandidateForSeniorAnalysis(job) {
  if (!job) return false;

  const title = String(job.title || '').toLowerCase();
  const industry = String(job.industry || '').toLowerCase();
  const exp = String(job.experienceYears || '').toLowerCase();

  // Exclude explicit simple labor / intern / entry-level keywords unless senior/lead keywords exist
  const excludeKeywords = ['단순노무', '단순 노무', '아르바이트', '알바', '신입', '인턴', '수습', '단기근로'];
  const hasExclude = excludeKeywords.some((kw) => title.includes(kw));

  const seniorKeywords = [
    '팀장', '리드', '총괄', '디렉터', '시니어', '전문가', '자문', '수석', '부장', '차장', '과장', '책임', '임원',
    '이론', '설계', '개발', '기획', '전략', 'pm', 'po', '컨설팅', '분석', 'lead', 'head', 'senior', 'director',
    '관리자', '지배인', '감독', '소장', '센터장', '실장', '원장'
  ];
  const hasSeniorKeyword = seniorKeywords.some((kw) => title.includes(kw) || industry.includes(kw));

  // Check experience numbers (e.g. 5년 이상, 7년, 10년)
  const expNumberMatch = exp.match(/(\d+)\s*년/);
  const expYears = expNumberMatch ? parseInt(expNumberMatch[1], 10) : 0;
  const isExperienced = expYears >= 5 || exp.includes('경력') || exp.includes('경력자');

  if (hasSeniorKeyword || expYears >= 5) {
    return true;
  }

  if (hasExclude) {
    return false;
  }

  return isExperienced;
}

const ANALYSIS_PROMPT = `
당신은 대한민국 시니어 전문 헤드헌터이자 조직 분석가입니다.
주어진 채용공고의 직무명, 기업 정보, 자격요건, 상세업무의 행간을 면밀히 분석하여
구직자가 한눈에 파악할 수 있는 [AI 3줄 핵심 요약]과 [기업이 원하는 시니어 인재상(경험 중심 분석)]을 생성하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "aiExecutiveSummary": {
    "overview": "기업의 현재 상황 및 시니어 채용 배경 요약 (1문장)",
    "keyChallenge": "이 프로젝트/직무에서 즉시 해결해야 할 핵심 과제 (1문장)",
    "expectedImpact": "시니어 전문가 투입을 통해 기대하는 구체적 성과 (1문장)"
  },
  "talentPersona": {
    "headline": "타겟 시니어 페르소나를 압축한 명확한 헤드라인 (예: 10년 이상 HR 조직설계 및 평가체계 수립 경험을 보유한 40+ 시니어)",
    "experienceHighlights": [
      "기업이 높게 평가하는 실무/리딩 경험 1",
      "기업이 높게 평가하는 실무/리딩 경험 2",
      "기업이 높게 평가하는 실무/리딩 경험 3"
    ],
    "competencyTags": [
      "핵심역량1",
      "핵심역량2",
      "핵심역량3",
      "핵심역량4"
    ],
    "interviewPrepFocus": [
      "AI 인터뷰 및 제안서 작성 시 강조해야 할 실무 어필 포인트 1",
      "AI 인터뷰 및 제안서 작성 시 강조해야 할 실무 어필 포인트 2"
    ]
  }
}
`;

/**
 * Analyzes a single job posting using Gemini 1.5/2.5 Flash Structured Output.
 */
export async function analyzeJobPostingWithAI(job, geminiClient = null) {
  try {
    const client = geminiClient || createGeminiClient();
    const promptContent = `
[기업명]: ${job.companyName || '비공개'}
[산업/직종]: ${job.industry || '전문 직무'}
[공고 제목]: ${job.title}
[요구 경력]: ${job.experienceYears || '경력 우대'}
[근무지/형태]: ${job.location || '지역 협의'} (${job.workType || '상근'})
[자격 요건]:
${(job.qualifications || []).join('\n') || '공고 본문 참조'}
[주요 업무 / 과제]:
${(job.coreResponsibilities || []).join('\n') || job.problemStatement || '공고 본문 참조'}
`;

    const response = await client.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `${ANALYSIS_PROMPT}\n\n${promptContent}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const rawText = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawText);

    if (
      parsed.aiExecutiveSummary &&
      parsed.aiExecutiveSummary.overview &&
      parsed.talentPersona &&
      parsed.talentPersona.headline
    ) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn(`[jobBatchAnalysisService] AI analysis skipped/failed for ${job.id}:`, error?.message || error);
    return null;
  }
}

/**
 * Runs incremental batch analysis on a set of job postings.
 * Only analyzes postings that pass the senior filter and have changed/un-analyzed hashes.
 */
export async function runIncrementalJobAnalysis(postings, options = {}) {
  const {
    batchChunkSize = 10,
    maxToProcess = 500,
    dryRun = false,
    onProgress = null,
  } = options;

  let client = null;
  if (!dryRun) {
    try {
      client = createGeminiClient();
    } catch (e) {
      console.warn('[jobBatchAnalysisService] Gemini client unavailable, skipping LLM calls:', e?.message || e);
      return { totalCandidates: 0, processedCount: 0, skippedCount: postings.length, errors: [e?.message] };
    }
  }

  // 1. Filter candidates for senior analysis
  const candidates = [];
  for (const job of postings) {
    if (!isCandidateForSeniorAnalysis(job)) continue;
    const contentHash = generateJobContentHash(job);
    
    // Check if already analyzed with same hash
    if (job.contentHash === contentHash && job.aiExecutiveSummary && job.analysisStatus === 'COMPLETED') {
      continue;
    }

    candidates.push({ ...job, newContentHash: contentHash });
    if (candidates.length >= maxToProcess) break;
  }

  console.log(`[jobBatchAnalysisService] Total scanned: ${postings.length}, Analysis targets: ${candidates.length}`);

  if (dryRun) {
    return {
      totalCandidates: candidates.length,
      processedCount: 0,
      dryRun: true,
      sampleTargets: candidates.slice(0, 5).map((c) => ({ id: c.id, title: c.title, company: c.companyName })),
    };
  }

  let processedCount = 0;
  const nowStr = new Date().toISOString();

  for (let i = 0; i < candidates.length; i += batchChunkSize) {
    const chunk = candidates.slice(i, i + batchChunkSize);
    
    const results = await Promise.all(
      chunk.map(async (job) => {
        const aiResult = await analyzeJobPostingWithAI(job, client);
        return { job, aiResult };
      }),
    );

    const batch = adminDb.batch();
    let hasWrites = false;

    for (const { job, aiResult } of results) {
      if (aiResult) {
        const docRef = adminDb.collection(GLOBAL_COLLECTION).doc(job.id);
        batch.set(
          docRef,
          {
            contentHash: job.newContentHash,
            isSeniorTarget: true,
            analysisStatus: 'COMPLETED',
            analyzedAt: nowStr,
            aiExecutiveSummary: aiResult.aiExecutiveSummary,
            talentPersona: aiResult.talentPersona,
            updatedAt: nowStr,
          },
          { merge: true },
        );
        hasWrites = true;
        processedCount++;
      }
    }

    if (hasWrites) {
      await batch.commit();
    }

    if (onProgress) {
      onProgress(processedCount, candidates.length);
    }
  }

  return {
    totalCandidates: candidates.length,
    processedCount,
    skippedCount: postings.length - candidates.length,
  };
}

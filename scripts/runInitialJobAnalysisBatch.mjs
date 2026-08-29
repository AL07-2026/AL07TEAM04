#!/usr/bin/env node

/**
 * 이어잡(EOJOB) 1.4만 건 공고 일괄 배치 AI 분석 스크립트
 * 
 * 사용법:
 *   node scripts/runInitialJobAnalysisBatch.mjs --dry-run   (모수 및 샘플 확인)
 *   node scripts/runInitialJobAnalysisBatch.mjs            (실제 배치 분석 및 DB 적재)
 *   node scripts/runInitialJobAnalysisBatch.mjs --limit 50 (최대 50건만 테스트 분석)
 */

import {
  generateJobContentHash,
  isCandidateForSeniorAnalysis,
  runIncrementalJobAnalysis,
} from '../functions/lib/jobBatchAnalysisService.mjs';

const GLOBAL_COLLECTION = 'global_job_postings';

async function fetchPostingsFromAdminOrApi() {
  try {
    const { adminDb } = await import('../functions/lib/firestoreAdmin.mjs');
    const snapshot = await adminDb.collection(GLOBAL_COLLECTION).limit(5000).get();
    if (snapshot.size > 0) {
      console.log(`Firestore Admin SDK 직접 연동 완료 (${snapshot.size}건 로드)`);
      return {
        adminDb,
        postings: snapshot.docs.map((doc) => ({ documentId: doc.id, ...doc.data() })),
      };
    }
  } catch (err) {
    console.log('Admin SDK 직접 접근 불가 (로컬 서비스 계정 미설정), 공개 API 엔드포인트로 조회합니다.');
  }

  // Fallback to Live API
  const liveUrl = 'https://al07team04-bdfcd.web.app/api/jobs/search?page=1&pageSize=24&sortBy=fit-desc';
  const response = await fetch(liveUrl);
  if (!response.ok) {
    throw new Error(`Live API 조회 실패: ${response.status}`);
  }
  const data = await response.json();
  const items = data.items || [];
  console.log(`Live API 엔드포인트 연동 완료 (${items.length}건 샘플 로드, 전체 카탈로그 ${data.total || data.catalogTotal}건)`);

  return {
    adminDb: null,
    postings: items,
    totalCatalogCount: data.total || data.catalogTotal || items.length,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitIndex = args.indexOf('--limit');
  const maxLimit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 5000;

  console.log('====================================================');
  console.log('🚀 이어잡(EOJOB) 채용공고 일괄 배치 AI 분석 파이프라인');
  console.log(`모드: ${isDryRun ? '🔍 드라이런 (DRY-RUN, API 미호출)' : '⚡ 실제 배치 분석 (Gemini API 호출 및 DB 적재)'}`);
  console.log(`최대 처리 제한: ${maxLimit}건`);
  console.log('====================================================\n');

  console.log('1. 채용공고 데이터베이스 조회 중...');
  const { adminDb, postings, totalCatalogCount } = await fetchPostingsFromAdminOrApi();
  const totalCount = totalCatalogCount || postings.length;
  console.log(`총 수집된 공고: ${totalCount}건\n`);

  console.log('2. 시니어 타겟 룰 필터링 및 해시 변경 감지 중...');
  let eligibleCount = 0;
  let alreadyAnalyzedCount = 0;

  for (const job of postings) {
    if (isCandidateForSeniorAnalysis(job)) {
      eligibleCount++;
      const currentHash = generateJobContentHash(job);
      if (job.contentHash === currentHash && job.aiExecutiveSummary && job.analysisStatus === 'COMPLETED') {
        alreadyAnalyzedCount++;
      }
    }
  }

  const eligibleRatio = postings.length > 0 ? Math.round((eligibleCount / postings.length) * 100) : 25;
  const estimatedSeniorTotal = Math.round(totalCount * (eligibleRatio / 100));

  console.log(`- 시니어 타겟 선별 비율: 약 ${eligibleRatio}% (전체 1.4만 건 중 약 ${estimatedSeniorTotal}건 예상)`);
  console.log(`- 샘플 내 시니어 선별 건수: ${eligibleCount}건`);
  console.log(`- 이미 분석 완료된 건수: ${alreadyAnalyzedCount}건`);
  console.log(`- 신규 분석 대상 모수: ${eligibleCount - alreadyAnalyzedCount}건\n`);

  if (isDryRun) {
    console.log('🔍 [Dry-Run] 선별된 시니어 공고 샘플 5건:');
    const sampleTargets = postings
      .filter((j) => isCandidateForSeniorAnalysis(j))
      .slice(0, 5);

    sampleTargets.forEach((job, idx) => {
      const hash = generateJobContentHash(job).slice(0, 12);
      console.log(`  [${idx + 1}] [${job.companyName || '기업'}] ${job.title} | ${job.experienceYears || '경력미제공'} (해시: ${hash}...)`);
    });
    console.log('\n✅ 드라이런이 성공적으로 완료되었습니다.');
    return;
  }

  if (!adminDb) {
    console.log('ℹ️ Admin SDK 쓰기 권한이 없는 환경에서는 Cloud Function 스케줄러(/api/jobs/sync)를 통해 서버리스로 배치가 실행됩니다.');
    return;
  }

  console.log('3. Gemini 1.5 Flash 배치 분석 및 Firestore 동기화 시작...');
  const startTime = Date.now();

  const result = await runIncrementalJobAnalysis(postings, {
    batchChunkSize: 10,
    maxToProcess: maxLimit,
    onProgress: (done, total) => {
      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      const percent = Math.round((done / (total || 1)) * 100);
      console.log(`  ⏳ 진행 중: ${done} / ${total} (${percent}%) - ${elapsedSec}초 소요`);
    },
  });

  const totalTimeSec = Math.round((Date.now() - startTime) / 1000);
  console.log('\n====================================================');
  console.log('🎉 배치 분석 완료 보고서');
  console.log(`- 총 대상 건수: ${result.totalCandidates}건`);
  console.log(`- 성공 분석 및 DB 적재: ${result.processedCount}건`);
  console.log(`- 건너뛴 건수 (미해당/기분석): ${result.skippedCount}건`);
  console.log(`- 소요 시간: ${totalTimeSec}초`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('❌ 배치 실행 중 오류 발생:', err);
  process.exit(1);
});

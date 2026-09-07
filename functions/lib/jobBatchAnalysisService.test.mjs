import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  createGeminiClient: vi.fn(),
  set: vi.fn(),
  commit: vi.fn(),
  doc: vi.fn((id) => ({ id })),
  batch: vi.fn(),
}));

vi.mock('./gemini.mjs', () => ({
  GEMINI_FLASH_MODEL: 'test-model',
  createGeminiClient: mocks.createGeminiClient,
}));
vi.mock('./firestoreAdmin.mjs', () => ({
  adminDb: {
    batch: mocks.batch,
    collection: vi.fn(() => ({ doc: mocks.doc })),
  },
}));

import {
  analyzeJobPostingWithAI,
  generateJobContentHash,
  isCandidateForSeniorAnalysis,
  runIncrementalJobAnalysis,
} from './jobBatchAnalysisService.mjs';

const validAnalysis = {
  aiExecutiveSummary: { overview: '채용 배경', keyChallenge: '핵심 문제', expectedImpact: '기대 성과' },
  talentPersona: {
    headline: '조직 개선 리드',
    experienceHighlights: ['조직 개편 경험'],
    competencyTags: ['리더십'],
    interviewPrepFocus: ['조직 개선 성과'],
  },
};

function posting(overrides = {}) {
  return { id: 'job-1', title: '경영전략 총괄 리드', companyName: '테스트 기업', experienceYears: '10년', ...overrides };
}

describe('jobBatchAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createGeminiClient.mockReturnValue({ models: { generateContent: mocks.generateContent } });
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify(validAnalysis) });
    mocks.commit.mockResolvedValue(undefined);
    mocks.batch.mockReturnValue({ set: mocks.set, commit: mocks.commit });
  });
  describe('generateJobContentHash', () => {
    it('동일한 내용의 공고에 대해 일관된 SHA-256 해시를 반환한다', () => {
      const job1 = {
        title: '전략기획 총괄 리드',
        companyName: '테스트컴퍼니',
        coreResponsibilities: ['사업계획 수립', '조직 진단'],
        qualifications: ['경력 10년 이상'],
        problemStatement: '신사업 확장',
        experienceYears: '10년 이상',
      };
      const job2 = { ...job1 };

      const hash1 = generateJobContentHash(job1);
      const hash2 = generateJobContentHash(job2);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it('내용이 변경되면 다른 해시값을 생성한다', () => {
      const job1 = { title: '전략기획 총괄 리드', companyName: '테스트컴퍼니' };
      const job2 = { title: '전략기획 실무 매니저', companyName: '테스트컴퍼니' };

      expect(generateJobContentHash(job1)).not.toBe(generateJobContentHash(job2));
    });

    it.each(['industry', 'location', 'workType'])('분석 입력 %s 변경도 해시에 반영한다', (field) => {
      expect(generateJobContentHash(posting({ [field]: '기존' }))).not.toBe(
        generateJobContentHash(posting({ [field]: '변경' })),
      );
    });
  });

  describe('isCandidateForSeniorAnalysis', () => {
    it('팀장, 리드, 총괄, 시니어 등의 직책 키워드가 포함된 공고를 선별한다', () => {
      expect(isCandidateForSeniorAnalysis({ title: 'AI 서비스 개발 총괄 팀장' })).toBe(true);
      expect(isCandidateForSeniorAnalysis({ title: '글로벌 브랜드 디렉터' })).toBe(true);
      expect(isCandidateForSeniorAnalysis({ title: '인사노무 자문위원' })).toBe(true);
    });

    it('경력 5년 이상인 공고를 선별한다', () => {
      expect(isCandidateForSeniorAnalysis({ title: '웹 개발자', experienceYears: '7년 이상' })).toBe(true);
      expect(isCandidateForSeniorAnalysis({ title: '경영지원', experienceYears: '10년' })).toBe(true);
    });

    it('단순 노무, 아르바이트, 인턴, 신입 공고는 제외한다', () => {
      expect(isCandidateForSeniorAnalysis({ title: '물류센터 단순노무 포장원', experienceYears: '무관' })).toBe(false);
      expect(isCandidateForSeniorAnalysis({ title: '마케팅 인턴 사원 모집', experienceYears: '신입' })).toBe(false);
      expect(isCandidateForSeniorAnalysis({ title: '매장 관리 아르바이트', experienceYears: '무관' })).toBe(false);
    });
  });

  describe('runIncrementalJobAnalysis', () => {
    it('dryRun 모드에서는 API 호출 없이 선별 모수만 반환한다', async () => {
      const mockPostings = [
        { id: '1', title: '경영전략 총괄 리드', companyName: 'A사', experienceYears: '10년' },
        { id: '2', title: '단순노무 단기 알바', companyName: 'B사', experienceYears: '무관' },
        { id: '3', title: 'HR 디렉터', companyName: 'C사', experienceYears: '12년' },
      ];

      const result = await runIncrementalJobAnalysis(mockPostings, { dryRun: true });
      expect(result.dryRun).toBe(true);
      expect(result.totalCandidates).toBe(2);
      expect(result.processedCount).toBe(0);
      expect(result.sampleTargets).toHaveLength(2);
      expect(mocks.createGeminiClient).not.toHaveBeenCalled();
    });

    it('수집 해시가 갱신돼도 AI가 분석한 해시와 다르면 다시 분석한다', async () => {
      const changed = posting({ title: '신규 사업 전략 총괄 리드' });
      const result = await runIncrementalJobAnalysis([{
        ...changed,
        contentHash: generateJobContentHash(changed),
        analyzedContentHash: generateJobContentHash(posting()),
        analysisStatus: 'COMPLETED',
        ...validAnalysis,
      }]);

      expect(result.processedCount).toBe(1);
      expect(mocks.set).toHaveBeenCalledWith({ id: 'job-1' }, expect.objectContaining({
        analyzedContentHash: generateJobContentHash(changed),
        analysisStatus: 'COMPLETED',
      }), { merge: true });
    });

    it('AI 성공 해시와 완전한 결과가 모두 일치하면 API 클라이언트도 만들지 않는다', async () => {
      const job = posting();
      const result = await runIncrementalJobAnalysis([{
        ...job, analyzedContentHash: generateJobContentHash(job), analysisStatus: 'COMPLETED', ...validAnalysis,
      }]);
      expect(result.totalCandidates).toBe(0);
      expect(mocks.createGeminiClient).not.toHaveBeenCalled();
      expect(mocks.generateContent).not.toHaveBeenCalled();
    });

    it('이전 방식의 완료 레코드는 성공 해시를 확정하기 위해 재분석한다', async () => {
      const job = posting();
      const result = await runIncrementalJobAnalysis([{
        ...job, contentHash: generateJobContentHash(job), analysisStatus: 'COMPLETED', ...validAnalysis,
      }], { dryRun: true });
      expect(result.totalCandidates).toBe(1);
    });

    it('부분 JSON을 완료 처리하지 않고 실패 상태를 저장해 재시도할 수 있다', async () => {
      mocks.generateContent.mockResolvedValue({
        text: JSON.stringify({ aiExecutiveSummary: { overview: '요약' }, talentPersona: { headline: '직무' } }),
      });
      const result = await runIncrementalJobAnalysis([posting()]);
      expect(result).toMatchObject({ processedCount: 0, attemptedCount: 1, failedCount: 1, status: 'failed' });
      expect(mocks.set).toHaveBeenCalledWith({ id: 'job-1' }, expect.objectContaining({
        analysisStatus: 'FAILED', analysisAttemptedAt: expect.any(String),
      }), { merge: true });
      expect(mocks.set.mock.calls[0][1]).not.toHaveProperty('analyzedContentHash');
    });

    it('키 설정 오류를 실제 대상 수와 구분하고 성공으로 보고하지 않는다', async () => {
      mocks.createGeminiClient.mockImplementation(() => { throw new Error('Gemini API key is not configured.'); });
      const result = await runIncrementalJobAnalysis([posting()]);
      expect(result).toMatchObject({ totalCandidates: 1, processedCount: 0, attemptedCount: 0, status: 'unavailable' });
      expect(result.errors).toHaveLength(1);
      expect(mocks.generateContent).not.toHaveBeenCalled();
      expect(mocks.batch).not.toHaveBeenCalled();
    });

    it.each([undefined, 5000, Number.POSITIVE_INFINITY])('요청 상한 %s에서도 실제 분석 호출은 100개를 넘지 않는다', async (maxToProcess) => {
      const jobs = Array.from({ length: 120 }, (_, i) => posting({ id: `job-${i}` }));
      const result = await runIncrementalJobAnalysis(jobs, { maxToProcess });
      expect(result.processedCount).toBe(100);
      expect(mocks.generateContent).toHaveBeenCalledTimes(100);
    });

    it.each([0, -1])('상한 %s이면 아무 API도 호출하지 않는다', async (maxToProcess) => {
      const result = await runIncrementalJobAnalysis([posting()], { maxToProcess });
      expect(result.totalCandidates).toBe(0);
      expect(mocks.createGeminiClient).not.toHaveBeenCalled();
    });

    it('잘못된 chunk 크기에서도 무한 반복 없이 유효한 공고만 처리한다', async () => {
      const result = await runIncrementalJobAnalysis([null, undefined, {}, posting()], { batchChunkSize: 0 });
      expect(result.processedCount).toBe(1);
      expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    });

    it('비어 있거나 잘못된 목록은 외부 호출 없이 종료한다', async () => {
      expect(await runIncrementalJobAnalysis(null)).toMatchObject({ totalCandidates: 0, processedCount: 0 });
      expect(mocks.createGeminiClient).not.toHaveBeenCalled();
    });

    it('중복 공고 ID는 한 번만 호출한다', async () => {
      const result = await runIncrementalJobAnalysis([posting(), posting()]);
      expect(result.processedCount).toBe(1);
      expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('analyzeJobPostingWithAI', () => {
    it('문자열 업무/자격요건도 분석 입력으로 정상 전달한다', async () => {
      expect(await analyzeJobPostingWithAI(posting({ qualifications: '경력 10년', coreResponsibilities: '전략 총괄' })))
        .toEqual(validAnalysis);
      expect(mocks.generateContent).toHaveBeenCalledWith(expect.objectContaining({
        contents: expect.stringContaining('전략 총괄'),
      }));
    });

    it.each(['', '{}', 'invalid json'])('불완전한 모델 응답 %s는 null로 반환한다', async (text) => {
      mocks.generateContent.mockResolvedValue({ text });
      expect(await analyzeJobPostingWithAI(posting())).toBeNull();
    });
  });
});

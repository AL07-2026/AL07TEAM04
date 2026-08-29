import { describe, expect, it, vi } from 'vitest';
import {
  generateJobContentHash,
  isCandidateForSeniorAnalysis,
  runIncrementalJobAnalysis,
} from './jobBatchAnalysisService.mjs';

describe('jobBatchAnalysisService', () => {
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
    });
  });
});

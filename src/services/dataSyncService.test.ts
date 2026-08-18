import { describe, expect, it } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import { isPostingExpired, normalizeJobPostingDetailFields } from '@/services/dataSyncService';

function postingWithDeadline(deadline: string, hiringStage: JobPosting['hiringStage']) {
  return { deadline, hiringStage } as JobPosting;
}

describe('isPostingExpired', () => {
  it('마감 임박 공고를 만료 공고로 삭제하지 않는다', () => {
    const posting = postingWithDeadline('2026-08-25', 'closing');
    expect(isPostingExpired(posting, new Date('2026-08-18T09:00:00+09:00'))).toBe(false);
  });

  it('실제 마감일이 지난 공고만 만료 처리한다', () => {
    const posting = postingWithDeadline('2026-08-17', 'open');
    expect(isPostingExpired(posting, new Date('2026-08-18T09:00:00+09:00'))).toBe(true);
  });
});

describe('normalizeJobPostingDetailFields', () => {
  it('fills array fields that are absent from older API-created Firestore records', () => {
    const normalized = normalizeJobPostingDetailFields({
      id: 'PUBLIC-1',
      title: '기획 전략 담당자',
      industry: '사업기획',
    } as JobPosting);

    expect(normalized.coreResponsibilities).toEqual(['기획 전략 담당자 직무 수행']);
    expect(normalized.requiredSkills).toEqual(['사업기획']);
    expect(normalized.matchingScoreCriteria).toEqual(['직무 연관성', '경력 정보', '근무 지역']);
    expect(normalized.interviewFocus).toEqual(['관련 실무 경험 및 주요 성과']);
    expect(normalized.recommendedTalentType).toContain('사업기획');
  });
});

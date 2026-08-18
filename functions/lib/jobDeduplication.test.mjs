import { describe, expect, it } from 'vitest';

import {
  deduplicateJobCatalog,
  getJobDeduplicationKey,
  isLegacySyntheticJobPosting,
  isPlaceholderJobPosting,
  planJobCatalogCleanup,
} from './jobDeduplication.mjs';

function posting(id, overrides = {}) {
  return {
    documentId: id,
    id,
    companyName: '테스트 주식회사',
    title: '데이터 분석가 채용',
    location: '서울 강남구',
    deadline: '2026-09-30',
    salaryRange: '연봉 5,000만원',
    workSchedule: '주 5일',
    sourceUrl: 'https://example.com/jobs/1',
    postedAt: '2026-08-01',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('job catalog deduplication', () => {
  it('identifies placeholder and legacy synthetic postings', () => {
    expect(isPlaceholderJobPosting(posting('PUBLIC-200', { title: '공공기관 전문 인재 채용 공고' }))).toBe(true);
    expect(isLegacySyntheticJobPosting(posting('SEOUL-267'))).toBe(true);
    expect(isLegacySyntheticJobPosting(posting('SEOUL-H954202607270684'))).toBe(false);
  });

  it('normalizes harmless punctuation while preserving job conditions in the identity key', () => {
    expect(getJobDeduplicationKey(posting('a', { location: '서울 강남구.' }))).toBe(
      getJobDeduplicationKey(posting('b', { location: '서울 강남구' })),
    );
    expect(getJobDeduplicationKey(posting('a', { salaryRange: '월급 300만원' }))).not.toBe(
      getJobDeduplicationKey(posting('b', { salaryRange: '월급 350만원' })),
    );
  });

  it('keeps the newest copy when every meaningful condition is the same', () => {
    const result = deduplicateJobCatalog([
      posting('old', { postedAt: '2026-07-01' }),
      posting('new', { postedAt: '2026-08-01' }),
    ]);

    expect(result.duplicateCount).toBe(1);
    expect(result.postings.map((item) => item.id)).toEqual(['new']);
  });

  it('keeps postings whose source URL or working conditions differ', () => {
    const result = deduplicateJobCatalog([
      posting('first'),
      posting('second', { sourceUrl: 'https://example.com/jobs/2' }),
      posting('third', { workSchedule: '주 3일' }),
    ]);

    expect(result.duplicateCount).toBe(0);
    expect(result.postings).toHaveLength(3);
  });

  it('plans placeholder, legacy, cancelled, and duplicate removals without deleting the canonical copy', () => {
    const plan = planJobCatalogCleanup([
      posting('placeholder', { title: '공공기관 채용 공고' }),
      posting('SEOUL-267'),
      posting('cancelled', { title: '(공고취소) 데이터 분석가 채용' }),
      posting('old', { postedAt: '2026-07-01' }),
      posting('new', { postedAt: '2026-08-01' }),
      posting('different', { sourceUrl: 'https://example.com/jobs/2' }),
    ]);

    expect(plan.hideOperations.map((operation) => operation.documentId).sort()).toEqual(
      ['SEOUL-267', 'cancelled', 'old', 'placeholder'].sort(),
    );
    expect(plan.hideOperations.find((operation) => operation.documentId === 'old')).toEqual({
      canonicalDocumentId: 'new',
      documentId: 'old',
      reason: 'duplicate',
    });
    expect(plan.duplicateGroups).toBe(1);
    expect(plan.reasonCounts).toEqual({
      cancelled: 1,
      duplicate: 1,
      'legacy-synthetic-id': 1,
      placeholder: 1,
    });
  });

  it('ignores records that were already hidden by an earlier cleanup', () => {
    const plan = planJobCatalogCleanup([
      posting('hidden', { catalogStatus: 'hidden' }),
      posting('active'),
    ]);

    expect(plan.alreadyHiddenCount).toBe(1);
    expect(plan.hideOperations).toEqual([]);
  });
});

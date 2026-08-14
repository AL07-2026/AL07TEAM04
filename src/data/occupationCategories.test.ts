import { describe, expect, it } from 'vitest';

import {
  detectOccupationCategoryFromJobText,
  normalizeOccupationCategory,
  normalizeOccupationPreferences,
  occupationCategoryOptions,
} from '@/data/occupationCategories';

describe('occupationCategories', () => {
  it('첨부 코드표 순서대로 중복 없는 21개 직종을 제공한다', () => {
    expect(occupationCategoryOptions).toHaveLength(21);
    expect(new Set(occupationCategoryOptions.map(({ id }) => id)).size).toBe(21);
    expect(occupationCategoryOptions[0]?.label).toBe('기획·전략');
    expect(occupationCategoryOptions.at(-1)?.label).toBe('공공·복지');
  });

  it('기존 11개 프로젝트 분류값을 새 직종 체계로 변환하고 순위 중복을 제거한다', () => {
    expect(normalizeOccupationCategory('ai-automation')).toBe('it-development-data');
    expect(normalizeOccupationCategory('operations')).toBe('service');
    expect(
      normalizeOccupationPreferences(['dev-engineering', 'it-development-data', 'operations']),
    ).toEqual(['it-development-data', 'service']);
  });

  it.each([
    ['재무회계 결산 담당자', '', undefined, 'accounting-tax-finance'],
    ['AI 데이터 플랫폼 개발자', '소프트웨어 개발업', '133200', 'it-development-data'],
    ['버스 운전원 모집', '운수업', '622200', 'driving-transport-delivery'],
    ['병원 간호사', '보건업', '304000', 'medical'],
    ['사회복지 상담사', '복지 서비스업', '231100', 'public-welfare'],
    ['브랜드 UX/UI 디자이너', '디자인업', '415500', 'design'],
  ])('%s 공고를 올바른 직종으로 판정한다', (title, details, jobsCode, expected) => {
    expect(detectOccupationCategoryFromJobText(title, details, jobsCode)).toBe(expected);
  });

  it('텍스트 단서가 없으면 고용24 jobsCd 대분류를 보조 판정에 사용한다', () => {
    expect(detectOccupationCategoryFromJobText('경력직 모집', '', '133200')).toBe(
      'it-development-data',
    );
  });
});

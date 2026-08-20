import { describe, expect, it } from 'vitest';

import {
  getQuickProjectFilterChoices,
  getRemainingProjectFilterChoices,
  searchProjectFilterChoices,
} from '@/services/projectFilterPresentation';
import type { ProjectFilterChoice } from '@/services/projectFilterPresentation';

type ChoiceId = 'all' | 'product' | 'strategy' | 'service' | 'design' | 'it';

const choices: ProjectFilterChoice<ChoiceId>[] = [
  { id: 'all', label: '전체' },
  { id: 'product', label: '상품기획·MD', badge: '1순위' },
  { id: 'strategy', label: '경영·전략', badge: '2순위' },
  { id: 'service', label: '서비스기획', badge: '3순위' },
  { id: 'design', label: '디자인' },
  { id: 'it', label: 'IT 개발' },
];

describe('project filter presentation', () => {
  it('shows only all and ranked preferences in the default row', () => {
    const quick = getQuickProjectFilterChoices(choices, 'all', 'product');

    expect(quick.map((choice) => choice.id)).toEqual(['all', 'product', 'strategy', 'service']);
  });

  it('keeps a category selected from more jobs visible after it folds', () => {
    const quick = getQuickProjectFilterChoices(choices, 'all', 'design');

    expect(quick.map((choice) => choice.id)).toEqual([
      'all',
      'product',
      'strategy',
      'service',
      'design',
    ]);
  });

  it('separates only the non-quick categories for the expanded list', () => {
    const quick = getQuickProjectFilterChoices(choices, 'all', 'product');

    expect(getRemainingProjectFilterChoices(choices, quick).map((choice) => choice.id)).toEqual([
      'design',
      'it',
    ]);
  });

  it('finds a category by its visible label or ranked preference badge', () => {
    expect(searchProjectFilterChoices(choices, '개발').map((choice) => choice.id)).toEqual(['it']);
    expect(searchProjectFilterChoices(choices, '2순위').map((choice) => choice.id)).toEqual([
      'strategy',
    ]);
  });
});

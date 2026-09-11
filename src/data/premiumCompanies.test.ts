import { describe, expect, it } from 'vitest';

import { initialPremiumCompanies } from '@/data/premiumCompanies';

describe('initialPremiumCompanies', () => {
  it('서로 다른 이미지와 노출 순서를 가진 샘플 기업 4개를 제공한다', () => {
    expect(initialPremiumCompanies).toHaveLength(4);
    expect(new Set(initialPremiumCompanies.map(({ id }) => id)).size).toBe(4);
    expect(new Set(initialPremiumCompanies.map(({ displayOrder }) => displayOrder)).size).toBe(4);
    expect(new Set(initialPremiumCompanies.map(({ imageUrl }) => imageUrl)).size).toBe(4);
    initialPremiumCompanies.forEach((company) => {
      expect(company.companyName).not.toBe('');
      expect(company.headline).not.toBe('');
      expect(company.imageUrl).toMatch(/^\/premium-companies\/.+\.webp$/);
      expect(company.isSample).toBe(true);
    });
  });
});

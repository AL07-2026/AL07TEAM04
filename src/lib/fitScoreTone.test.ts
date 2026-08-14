import { describe, expect, it } from 'vitest';

import { getFitScoreTone } from '@/lib/fitScoreTone';

describe('getFitScoreTone', () => {
  it.each([
    [100, '매우 높음', '90점 이상'],
    [90, '매우 높음', '90점 이상'],
    [89, '높음', '80점 이상'],
    [80, '높음', '80점 이상'],
    [79, '보통', '70점 이상'],
    [70, '보통', '70점 이상'],
    [69, '참고', '70점 미만'],
  ])('%i점의 적합도 단계를 올바르게 구분한다', (score, expectedLabel, expectedRange) => {
    expect(getFitScoreTone(score)).toMatchObject({
      label: expectedLabel,
      rangeLabel: expectedRange,
    });
  });
});

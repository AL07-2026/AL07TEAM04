import { describe, expect, it } from 'vitest';

import { removeDeepUndefinedValues } from './browserStorage';

describe('browserStorage Firestore payload helpers', () => {
  it('중첩 객체와 배열 안의 undefined 값을 제거한다', () => {
    expect(
      removeDeepUndefinedValues({
        cards: [
          {
            id: undefined,
            title: 'AI 활용 경험',
            meta: {
              generatedAt: undefined,
              confirmedAt: '2026-08-31T00:00:00.000Z',
            },
          },
          undefined,
        ],
        optional: undefined,
      }),
    ).toEqual({
      cards: [
        {
          title: 'AI 활용 경험',
          meta: {
            confirmedAt: '2026-08-31T00:00:00.000Z',
          },
        },
      ],
    });
  });
});

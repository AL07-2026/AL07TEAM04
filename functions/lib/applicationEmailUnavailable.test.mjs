import { describe, expect, it, vi } from 'vitest';

import { handleApplicationEmailUnavailable } from './applicationEmailUnavailable.mjs';

describe('application email compatibility response', () => {
  it('Gmail 설정 전에는 캐시되지 않는 명시적 503을 반환한다', () => {
    const response = {
      body: undefined,
      statusCode: 200,
      json(payload) {
        this.body = payload;
        return this;
      },
      set: vi.fn(),
      status(code) {
        this.statusCode = code;
        return this;
      },
    };

    handleApplicationEmailUnavailable({}, response);

    expect(response.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(response.statusCode).toBe(503);
    expect(response.body).toMatchObject({
      emailSent: false,
      retryable: false,
    });
    expect(response.body.error).toContain('지원 이력');
  });
});

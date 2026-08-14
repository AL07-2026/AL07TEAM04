import { describe, expect, it } from 'vitest';

import { createWorknetUpstreamUrl } from './worknetProxy.mjs';

describe('worknet proxy', () => {
  it('허용된 검색 조건만 공식 고용24 URL로 전달한다', () => {
    const url = new URL(
      createWorknetUpstreamUrl(
        {
          authKey: 'client-key',
          career: 'E',
          keyword: '개발자|운영',
          maxCareerM: '180',
          unexpected: 'blocked',
        },
        'server-key',
      ),
    );

    expect(url.origin).toBe('https://www.work24.go.kr');
    expect(url.searchParams.get('authKey')).toBe('server-key');
    expect(url.searchParams.get('keyword')).toBe('개발자|운영');
    expect(url.searchParams.get('maxCareerM')).toBe('180');
    expect(url.searchParams.get('unexpected')).toBeNull();
    expect(url.searchParams.get('callTp')).toBe('L');
    expect(url.searchParams.get('returnType')).toBe('XML');
  });

  it('인증키가 없으면 외부 요청 URL을 만들지 않는다', () => {
    expect(createWorknetUpstreamUrl({ keyword: '개발자' })).toBeNull();
  });
});

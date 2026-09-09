// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('./index.mjs');
  vi.doUnmock('firebase-admin/storage');
  vi.resetModules();
});

describe('target-aware function loading', () => {
  it('커뮤니티 런타임은 AI·수집·메일이 있는 공통 index를 불러오지 않는다', async () => {
    vi.stubEnv('FUNCTION_TARGET', 'communityApi');
    vi.doMock('./index.mjs', () => {
      throw new Error('Heavy index must not load.');
    });
    vi.doMock('firebase-admin/storage', () => {
      throw new Error('Community runtime must not load Admin Storage.');
    });
    const entry = await import('./entry.mjs');
    expect(typeof entry.communityApi).toBe('function');
    expect(entry.communityApi.__endpoint).toMatchObject({
      availableMemoryMb: 256,
      minInstances: 1,
      timeoutSeconds: 30,
    });
    expect(entry.api).toBeUndefined();
  });

  it.each(['', 'api', 'premiumApi', 'scheduledJobSync'])(
    'discovery/기존 %s 대상은 모든 원래 export를 보존한다',
    async (target) => {
      vi.stubEnv('FUNCTION_TARGET', target);
      const endpoints = {
        api: vi.fn(),
        premiumApi: vi.fn(),
        scheduledJobSync: vi.fn(),
        communityApi: vi.fn(),
      };
      vi.doMock('./index.mjs', () => endpoints);
      const entry = await import('./entry.mjs');
      for (const key of Object.keys(endpoints)) expect(entry[key]).toBe(endpoints[key]);
    },
  );
});

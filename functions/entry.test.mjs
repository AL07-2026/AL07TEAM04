// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('./account-entry.mjs');
  vi.doUnmock('./application-email-entry.mjs');
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

  it('회원탈퇴 런타임은 공통 index를 불러오지 않고 Secret 없이 동작한다', async () => {
    vi.stubEnv('FUNCTION_TARGET', 'accountApi');
    vi.doMock('./index.mjs', () => {
      throw new Error('Heavy index must not load.');
    });
    const entry = await import('./entry.mjs');
    expect(typeof entry.accountApi).toBe('function');
    expect(entry.accountApi.__endpoint).toMatchObject({
      availableMemoryMb: 256,
      timeoutSeconds: 120,
    });
    expect(entry.accountApi.__endpoint.secretEnvironmentVariables ?? []).toEqual([]);
    expect(entry.api).toBeUndefined();
  });

  it('지원 메일 런타임은 공통 index를 불러오지 않고 Gmail Secret만 사용한다', async () => {
    vi.stubEnv('FUNCTION_TARGET', 'applicationEmailApi');
    vi.doMock('./index.mjs', () => {
      throw new Error('Heavy index must not load.');
    });
    const entry = await import('./entry.mjs');
    expect(typeof entry.applicationEmailApi).toBe('function');
    expect(entry.applicationEmailApi.__endpoint).toMatchObject({
      availableMemoryMb: 512,
      concurrency: 4,
      maxInstances: 10,
      timeoutSeconds: 120,
    });
    expect(entry.applicationEmailApi.__endpoint.secretEnvironmentVariables).toEqual([
      { key: 'GMAIL_APP_PASSWORD' },
    ]);
    expect(entry.api).toBeUndefined();
  });

  it.each(['', 'api', 'premiumApi', 'scheduledJobSync'])(
    'discovery/기존 %s 대상은 모든 원래 export를 보존한다',
    async (target) => {
      vi.stubEnv('FUNCTION_TARGET', target);
      const endpoints = {
        accountApi: undefined,
        applicationEmailApi: undefined,
        api: vi.fn(),
        premiumApi: vi.fn(),
        scheduledJobSync: vi.fn(),
        communityApi: vi.fn(),
      };
      vi.doMock('./index.mjs', () => endpoints);
      const accountApi = vi.fn();
      vi.doMock('./account-entry.mjs', () => ({ accountApi }));
      const applicationEmailApi = vi.fn();
      vi.doMock('./application-email-entry.mjs', () => ({ applicationEmailApi }));
      const entry = await import('./entry.mjs');
      for (
        const key of Object.keys(endpoints).filter(
          (key) => key !== 'accountApi' && key !== 'applicationEmailApi',
        )
      ) {
        expect(entry[key]).toBe(endpoints[key]);
      }
      expect(entry.accountApi).toBe(target ? undefined : accountApi);
      expect(entry.applicationEmailApi).toBe(target ? undefined : applicationEmailApi);
    },
  );
});

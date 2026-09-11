import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  auth: {
    authStateReady: vi.fn(() => Promise.resolve()),
    currentUser: null as null | { getIdToken: () => Promise<string>; uid: string },
  },
}));

vi.mock('@/lib/firebase', () => ({ auth: authMocks.auth }));

import { deleteCurrentAccountData } from '@/services/accountService';

describe('account service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authMocks.auth.authStateReady.mockResolvedValue();
    authMocks.auth.currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fresh-id-token'),
      uid: 'user-1',
    };
  });

  it('본문 UID 없이 현재 계정 토큰으로 통합 탈퇴 API를 호출한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ deleted: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    await expect(deleteCurrentAccountData()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/account');
    expect(options?.method).toBe('DELETE');
    expect(options?.body).toBeUndefined();
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer fresh-id-token');
  });

  it('서버의 최근 로그인 안내를 그대로 전달한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          deleted: false,
          error: '보안을 위해 다시 로그인한 후 회원 탈퇴를 진행해 주세요.',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 401 },
      ),
    );

    await expect(deleteCurrentAccountData()).rejects.toThrow('다시 로그인');
  });

  it('요청 중 로그인 계정이 바뀌면 성공으로 처리하지 않는다', async () => {
    const requestedUser = authMocks.auth.currentUser;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      authMocks.auth.currentUser = {
        getIdToken: vi.fn().mockResolvedValue('other-token'),
        uid: 'other-user',
      };
      return Promise.resolve(
        new Response(JSON.stringify({ deleted: true }), { status: 200 }),
      );
    });

    await expect(deleteCurrentAccountData()).rejects.toThrow('계정이 변경');
    expect(requestedUser?.uid).toBe('user-1');
  });
});

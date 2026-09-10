import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authInstance, initializeAppMock } = vi.hoisted(() => ({
  authInstance: { languageCode: '' },
  initializeAppMock: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

vi.mock('firebase/app', () => ({
  getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApps: vi.fn(() => []),
  initializeApp: initializeAppMock,
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => authInstance),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
}));

describe('Firebase OAuth configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    initializeAppMock.mockClear();
    vi.stubGlobal('window', {
      location: { hostname: 'al07team04-bdfcd.web.app' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('운영 Hosting에서도 등록된 Firebase OAuth 콜백 도메인을 유지한다', async () => {
    await import('@/lib/firebase');

    expect(initializeAppMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authDomain: 'al07team04-bdfcd.firebaseapp.com',
      }),
    );
  });
});

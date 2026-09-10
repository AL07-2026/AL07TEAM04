import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockFirebaseUser = {
  email?: string;
  getIdToken?: () => Promise<string>;
  uid: string;
};

type MockAuthStateCallback = (user: MockFirebaseUser | null) => void;

const accountMocks = vi.hoisted(() => ({
  deleteCurrentAccountData: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock('@/services/accountService', () => ({
  deleteCurrentAccountData: accountMocks.deleteCurrentAccountData,
}));

const authMocks = vi.hoisted(() => ({
  auth: { currentUser: null as MockFirebaseUser | null },
  deleteUser: vi.fn(() => Promise.resolve(undefined)),
  getRedirectResult: vi.fn(() => Promise.resolve(null as unknown)),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: MockAuthStateCallback) => {
    callback(null);
    return vi.fn();
  }),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(() => Promise.resolve(undefined)),
  signOut: vi.fn(() => Promise.resolve(undefined)),
}));

const inAppMocks = vi.hoisted(() => ({
  isKakaoTalk: vi.fn(() => false),
  openInExternalBrowser: vi.fn(() => true),
}));

vi.mock('@/lib/inAppBrowser', () => inAppMocks);

vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'LOCAL',
  browserSessionPersistence: 'SESSION',
  createUserWithEmailAndPassword: vi.fn(),
  getAuth: vi.fn(() => authMocks.auth),
  getRedirectResult: authMocks.getRedirectResult,
  GoogleAuthProvider: class MockGoogleAuthProvider {
    setCustomParameters = vi.fn();
  },
  onAuthStateChanged: authMocks.onAuthStateChanged,
  sendEmailVerification: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve(undefined)),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: authMocks.signInWithPopup,
  signInWithRedirect: authMocks.signInWithRedirect,
  signOut: authMocks.signOut,
}));

import { doc, getDoc, setDoc } from 'firebase/firestore';

import { AuthProvider, useAuth } from './authContext';

function AuthHarness() {
  const { deleteAccount, error, loading, oauthRedirectCompleted, signIn, signInWithGoogle, user } =
    useAuth();

  return (
    <div>
      <p data-testid="role">{user?.role ?? 'none'}</p>
      <p data-testid="auth-error">{error ?? ''}</p>
      <p data-testid="auth-loading">{String(loading)}</p>
      <p data-testid="oauth-completed">{String(oauthRedirectCompleted)}</p>
      <button type="button" onClick={() => void signInWithGoogle('senior').catch(() => undefined)}>
        구글 로그인
      </button>
      <button type="button" onClick={() => void signIn('test@example.com', 'pw', 'senior', false)}>
        세션 전용 로그인
      </button>
      <button type="button" onClick={() => void deleteAccount().catch(() => undefined)}>
        회원 탈퇴
      </button>
    </div>
  );
}

function userDocument(data: Record<string, unknown>) {
  return {
    data: () => data,
    exists: () => true,
    id: 'auth-user',
  };
}

function missingUserDocument() {
  return {
    data: () => ({}),
    exists: () => false,
    id: 'missing-user',
  };
}

describe('AuthProvider 계정 데이터 처리', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    authMocks.auth.currentUser = null;
    authMocks.getRedirectResult.mockResolvedValue(null);
    authMocks.signInWithRedirect.mockResolvedValue(undefined);
    authMocks.signOut.mockResolvedValue(undefined);
    inAppMocks.isKakaoTalk.mockReturnValue(false);
    inAppMocks.openInExternalBrowser.mockReturnValue(true);
    accountMocks.deleteCurrentAccountData.mockResolvedValue(undefined);
    authMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return vi.fn();
    });
    vi.mocked(doc).mockImplementation(((
      _db: unknown,
      collectionName: string,
      documentId: string,
    ) => ({
      path: `${collectionName}/${documentId}`,
    })) as typeof doc);
  });

  it('기존 구글 계정은 선택한 회원유형으로 role을 덮어쓰지 않는다', async () => {
    authMocks.signInWithPopup.mockResolvedValue({
      user: {
        displayName: '기존 기업',
        email: 'company@example.com',
        uid: 'google-user-1',
      },
    });
    vi.mocked(getDoc).mockResolvedValueOnce(
      userDocument({
        createdAt: '2026-01-01T00:00:00.000Z',
        name: '저장된 기업명',
        role: 'company',
      }) as never,
    );

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '구글 로그인' }));

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('company'));
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        createdAt: '2026-01-01T00:00:00.000Z',
        name: '저장된 기업명',
        role: 'company',
      }),
      { merge: true },
    );
  });

  it('리디렉션으로 돌아온 기존 기업 계정의 역할과 가입 정보를 보존한다', async () => {
    sessionStorage.setItem('eojob_oauth_target_role', 'senior');
    authMocks.getRedirectResult.mockResolvedValueOnce({
      user: {
        displayName: '구글 표시 이름',
        email: 'company@example.com',
        uid: 'redirect-company-1',
      },
    });
    vi.mocked(getDoc).mockResolvedValueOnce(
      userDocument({
        createdAt: '2025-02-03T00:00:00.000Z',
        name: '저장된 회사명',
        role: 'company',
      }) as never,
    );

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('company'));
    expect(screen.getByTestId('oauth-completed')).toHaveTextContent('true');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        createdAt: '2025-02-03T00:00:00.000Z',
        name: '저장된 회사명',
        role: 'company',
      }),
      { merge: true },
    );
  });

  it('리디렉션 신규 사용자는 초기 인증 콜백이 저장소를 비워도 선택한 역할을 유지한다', async () => {
    sessionStorage.setItem('eojob_oauth_target_role', 'company');
    sessionStorage.setItem('eojob_remember_me', 'false');
    authMocks.getRedirectResult.mockResolvedValueOnce({
      user: {
        displayName: '신규 회사',
        email: 'new-company@example.com',
        uid: 'redirect-company-new',
      },
    });
    vi.mocked(getDoc).mockResolvedValueOnce(missingUserDocument() as never);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('company'));
    expect(sessionStorage.getItem('eojob_current_user')).toContain('redirect-company-new');
    expect(localStorage.getItem('eojob_session_only')).toBe('true');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: 'company' }),
      { merge: true },
    );
  });

  it('카카오톡 외부 브라우저 전환 후 요청을 유한하게 종료하고 로딩을 해제한다', async () => {
    window.history.replaceState({}, '', '/login?role=senior&redirect=%2Fsenior%2Fprofile');
    inAppMocks.isKakaoTalk.mockReturnValue(true);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '구글 로그인' }));

    await waitFor(() => expect(screen.getByTestId('auth-loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('auth-error')).toHaveTextContent('기본 브라우저 열기를 시도했습니다');
    expect(inAppMocks.openInExternalBrowser).toHaveBeenCalledWith(
      expect.stringMatching(/role=senior/),
    );
    expect(authMocks.signInWithPopup).not.toHaveBeenCalled();
  });

  it('팝업을 지원하지 않는 모바일 브라우저에서는 역할을 보존해 redirect를 시도한다', async () => {
    authMocks.signInWithPopup.mockRejectedValueOnce({
      code: 'auth/operation-not-supported-in-this-environment',
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '구글 로그인' }));

    await waitFor(() => expect(authMocks.signInWithRedirect).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem('eojob_oauth_target_role')).toBe('senior');
    await waitFor(() => expect(screen.getByTestId('auth-loading')).toHaveTextContent('false'));
  });

  it('WebView가 브라우저 저장소를 차단해도 앱 인증 영역을 렌더링한다', () => {
    const storageRead = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage denied', 'SecurityError');
    });

    expect(() =>
      render(
        <AuthProvider>
          <AuthHarness />
        </AuthProvider>,
      ),
    ).not.toThrow();

    storageRead.mockRestore();
  });

  it('회원 탈퇴 시 단일 서버 API가 전체 데이터를 삭제한 뒤 로컬 로그아웃한다', async () => {
    authMocks.auth.currentUser = { uid: 'user-1' };
    authMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ email: 'user@example.com', uid: 'user-1' });
      return vi.fn();
    });
    vi.mocked(getDoc).mockResolvedValueOnce(
      userDocument({
        email: 'user@example.com',
        name: '탈퇴 사용자',
        role: 'senior',
      }) as never,
    );
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('senior'));
    fireEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }));

    await waitFor(() => expect(accountMocks.deleteCurrentAccountData).toHaveBeenCalledTimes(1));
    expect(authMocks.signOut).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('eojob_current_user')).toBeNull();
  });

  it('서버 탈퇴가 실패하면 로그인과 로컬 데이터를 유지한다', async () => {
    authMocks.auth.currentUser = { uid: 'user-1' };
    authMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ email: 'user@example.com', uid: 'user-1' });
      return vi.fn();
    });
    vi.mocked(getDoc).mockResolvedValueOnce(
      userDocument({ email: 'user@example.com', name: '탈퇴 사용자', role: 'senior' }) as never,
    );
    accountMocks.deleteCurrentAccountData.mockRejectedValue(
      new Error('보안을 위해 다시 로그인한 후 회원 탈퇴를 진행해 주세요.'),
    );

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('senior'));
    fireEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }));

    await waitFor(() => expect(accountMocks.deleteCurrentAccountData).toHaveBeenCalledTimes(1));
    expect(authMocks.signOut).not.toHaveBeenCalled();
    expect(screen.getByTestId('role')).toHaveTextContent('senior');
  });

  it('rememberMe가 false일 때 session_only 플래그와 sessionStorage를 사용한다', async () => {
    localStorage.clear();
    sessionStorage.clear();

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '세션 전용 로그인' }));

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('senior'));
    expect(localStorage.getItem('eojob_session_only')).toBe('true');
    expect(sessionStorage.getItem('eojob_remember_me')).toBe('false');
    expect(sessionStorage.getItem('eojob_current_user')).toBeTruthy();
    expect(localStorage.getItem('eojob_current_user')).toBeNull();
  });
});

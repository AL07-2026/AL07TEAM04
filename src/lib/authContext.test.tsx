import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockFirebaseUser = {
  email?: string;
  getIdToken?: () => Promise<string>;
  uid: string;
};

type MockAuthStateCallback = (user: MockFirebaseUser | null) => void;

const communityMocks = vi.hoisted(() => ({
  deleteCommunityAccountData: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock('@/services/communityService', () => ({
  deleteCommunityAccountData: communityMocks.deleteCommunityAccountData,
}));

const authMocks = vi.hoisted(() => ({
  auth: { currentUser: null as (MockFirebaseUser | null) },
  deleteUser: vi.fn(() => Promise.resolve(undefined)),
  onAuthStateChanged: vi.fn(
    (_auth: unknown, callback: MockAuthStateCallback) => {
      callback(null);
      return vi.fn();
    },
  ),
  signInWithPopup: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'LOCAL',
  browserSessionPersistence: 'SESSION',
  createUserWithEmailAndPassword: vi.fn(),
  deleteUser: authMocks.deleteUser,
  getAuth: vi.fn(() => authMocks.auth),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  GoogleAuthProvider: class MockGoogleAuthProvider {
    setCustomParameters = vi.fn();
  },
  onAuthStateChanged: authMocks.onAuthStateChanged,
  sendEmailVerification: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve(undefined)),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: authMocks.signInWithPopup,
  signInWithRedirect: vi.fn(() => Promise.resolve(undefined)),
  signOut: vi.fn(() => Promise.resolve(undefined)),
}));

import { deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { deleteObject } from 'firebase/storage';

import { AuthProvider, useAuth } from './authContext';

function AuthHarness() {
  const { deleteAccount, signIn, signInWithGoogle, user } = useAuth();

  return (
    <div>
      <p data-testid="role">{user?.role ?? 'none'}</p>
      <button type="button" onClick={() => void signInWithGoogle('senior')}>
        구글 로그인
      </button>
      <button
        type="button"
        onClick={() => void signIn('test@example.com', 'pw', 'senior', false)}
      >
        세션 전용 로그인
      </button>
      <button type="button" onClick={() => void deleteAccount()}>
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

function queryDocument(path: string, data: Record<string, unknown>) {
  return {
    data: () => data,
    id: path.split('/').pop(),
    ref: { path },
  };
}

describe('AuthProvider 계정 데이터 처리', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    authMocks.auth.currentUser = null;
    authMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return vi.fn();
    });
    vi.mocked(doc).mockImplementation(((_db: unknown, collectionName: string, documentId: string) => ({
      path: `${collectionName}/${documentId}`,
    })) as typeof doc);
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);
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

  it('회원 탈퇴 시 사용자 프로필, 프로젝트, 제안, 경험카드, 첨부 스토리지를 함께 삭제한다', async () => {
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
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [queryDocument('experience_cards/card-1', { uid: 'user-1' })],
      } as never)
      .mockResolvedValueOnce({
        docs: [
          queryDocument('projects/project-1', {
            attachments: [{ storagePath: 'project-attachments/project-1/file.pdf' }],
            ownerId: 'user-1',
          }),
        ],
      } as never)
      .mockResolvedValueOnce({
        docs: [
          queryDocument('user_proposals/proposal-1', {
            resumeFiles: [{ storagePath: 'resumes/user-1/proposal-1/resume.pdf' }],
            userId: 'user-1',
          }),
        ],
      } as never)
      .mockResolvedValueOnce({
        docs: [queryDocument('user_proposals/proposal-1', { projectOwnerId: 'user-1' })],
      } as never);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('senior'));
    fireEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }));

    await waitFor(() => expect(authMocks.deleteUser).toHaveBeenCalledWith(authMocks.auth.currentUser));
    expect(communityMocks.deleteCommunityAccountData).toHaveBeenCalledTimes(1);
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/user-1' }));
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'senior_profiles/user-1' }));
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'company_profiles/user-1' }));
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'experience_cards/card-1' }));
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'projects/project-1' }));
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'user_proposals/proposal-1' }));
    expect(deleteObject).toHaveBeenCalledTimes(2);
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

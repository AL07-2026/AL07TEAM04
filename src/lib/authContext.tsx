import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { readVersionedStorage, writeVersionedStorage } from '@/lib/browserStorage';
import { getAdminRoleForEmail, resolveCurrentAdminRole, type AdminRole } from '@/lib/adminAccess';
import { auth, db } from '@/lib/firebase';
import { isKakaoTalk, openInExternalBrowser } from '@/lib/inAppBrowser';
import { deleteCurrentAccountData } from '@/services/accountService';

export type UserRole = 'senior' | 'company';

export type UserProfile = {
  createdAt?: string;
  email: string;
  name: string;
  role: UserRole;
  uid: string;
};

type AuthContextType = {
  checkEmailVerified: () => Promise<boolean>;
  clearError: () => void;
  deleteAccount: () => Promise<void>;
  error: string | null;
  loading: boolean;
  oauthRedirectCompleted: boolean;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  refreshAdminAccess: () => Promise<AdminRole | null>;
  role: UserRole;
  sendVerificationEmail: () => Promise<void>;
  signIn: (
    email: string,
    password: string,
    targetRole?: UserRole,
    rememberMe?: boolean,
  ) => Promise<UserProfile>;
  signInWithGoogle: (role?: UserRole, rememberMe?: boolean) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<UserProfile>;
  user: UserProfile | null;
};

const AuthContext = createContext<AuthContextType | null>(null);
const CURRENT_USER_STORAGE_KEY = 'eojob_current_user';
const REMEMBER_ME_STORAGE_KEY = 'eojob_remember_me';
const SESSION_ONLY_STORAGE_KEY = 'eojob_session_only';
const OAUTH_TARGET_ROLE_STORAGE_KEY = 'eojob_oauth_target_role';

function readSessionValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeSessionValue(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // 저장소가 제한된 WebView에서는 메모리의 인증 상태만 사용한다.
  }
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'senior' || value === 'company';
}

async function resolveGoogleUserProfile(
  googleUser: User,
  requestedRole: UserRole,
): Promise<UserProfile> {
  const computedName =
    googleUser.displayName ||
    (googleUser.email === 'sehddnr2@gmail.com'
      ? '이동욱'
      : googleUser.email?.split('@')[0] || '이동욱');
  const now = new Date().toISOString();
  let profileRole = requestedRole;
  let profileName = computedName;
  let createdAt = now;
  let canPersistRole = true;

  try {
    const userSnapshot = await getDoc(doc(db, 'users', googleUser.uid));
    if (userSnapshot.exists()) {
      const data = userSnapshot.data() as Partial<UserProfile>;
      if (isUserRole(data.role)) profileRole = data.role;
      if (data.name) profileName = data.name;
      if (data.createdAt) createdAt = data.createdAt;
    }
  } catch (firestoreError) {
    // 조회가 실패한 상태에서 요청 역할을 덮어쓰면 기존 계정 유형이 바뀔 수 있다.
    canPersistRole = false;
    console.warn('Firestore getDoc failed during Google sign in:', firestoreError);
  }

  const profile: UserProfile = {
    uid: googleUser.uid,
    email: googleUser.email || '',
    name: profileName,
    role: profileRole,
    createdAt,
  };

  try {
    const userDocument: Record<string, unknown> = {
      uid: googleUser.uid,
      email: googleUser.email,
      name: profile.name,
      createdAt: profile.createdAt,
      lastLoginAt: now,
    };
    if (canPersistRole) userDocument.role = profileRole;
    await setDoc(doc(db, 'users', googleUser.uid), userDocument, { merge: true });
  } catch (firestoreError) {
    console.warn('Firestore setDoc failed during Google sign in:', firestoreError);
  }

  return profile;
}

function readInitialUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;

  let isSessionOnly: boolean;
  try {
    isSessionOnly = window.localStorage.getItem(SESSION_ONLY_STORAGE_KEY) === 'true';
  } catch {
    return null;
  }
  if (isSessionOnly) {
    try {
      const sessionUserRaw = readSessionValue(CURRENT_USER_STORAGE_KEY);
      if (sessionUserRaw) {
        const parsed = JSON.parse(sessionUserRaw) as UserProfile;
        if (
          parsed?.uid &&
          parsed.email &&
          (parsed.role === 'senior' || parsed.role === 'company')
        ) {
          return parsed;
        }
      }
    } catch {
      // ignore JSON parse error
    }
    // 브라우저 세션(창/탭)이 닫혀 sessionStorage가 비었으므로 자동 로그아웃 처리
    try {
      window.localStorage.removeItem(SESSION_ONLY_STORAGE_KEY);
    } catch {
      // 이미 저장소 접근이 제한된 상태이므로 무시한다.
    }
    return null;
  }

  const saved = readVersionedStorage<UserProfile>(CURRENT_USER_STORAGE_KEY);
  return saved?.uid && saved.email && (saved.role === 'senior' || saved.role === 'company')
    ? saved
    : null;
}

function canUseDemoAuth() {
  return import.meta.env.MODE === 'test';
}

function clearDeletedUserLocalData(uid?: string) {
  if (typeof window === 'undefined') return;

  [
    CURRENT_USER_STORAGE_KEY,
    `v1_${CURRENT_USER_STORAGE_KEY}`,
    'eojob_current_user',
    'v1_eojob_current_user',
    'eojob_senior_profile',
    'eojob_company_profile',
    'eojob_experience_card',
    'eojob_projects',
    'eojob_user_proposals',
    'eojob_resume_application',
    'eojob_pending_application_interview',
    'eojob_pending_experience_card',
    'eojob_pending_experience_follow_up',
    'eojob_experience_profile_draft',
  ].forEach((key) => localStorage.removeItem(key));

  if (uid) {
    [
      `eojob_senior_profile:${uid}`,
      `eojob_company_profile:${uid}`,
      `eojob_experience_card:${uid}`,
    ].forEach((key) => localStorage.removeItem(key));
  }

  sessionStorage.clear();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isLoggingOutRef = useRef(false);
  const [user, setUser] = useState<UserProfile | null>(() => readInitialUser());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [oauthRedirectCompleted, setOauthRedirectCompleted] = useState(false);
  const [resolvedAdminRole, setResolvedAdminRole] = useState<AdminRole | null>(() => {
    const saved = readInitialUser();
    return getAdminRoleForEmail(saved?.email);
  });

  const saveUserLocal = (profile: UserProfile | null, rememberMe?: boolean) => {
    setUser(profile);
    if (typeof window === 'undefined') return;

    try {
      if (profile) {
        const isExplicitSessionOnly =
          rememberMe === false ||
          (rememberMe === undefined &&
            (readSessionValue(REMEMBER_ME_STORAGE_KEY) === 'false' ||
              localStorage.getItem(SESSION_ONLY_STORAGE_KEY) === 'true'));

        if (isExplicitSessionOnly) {
          sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(profile));
          sessionStorage.setItem(REMEMBER_ME_STORAGE_KEY, 'false');
          localStorage.setItem(SESSION_ONLY_STORAGE_KEY, 'true');
          localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
          localStorage.removeItem(`v1_${CURRENT_USER_STORAGE_KEY}`);
          localStorage.removeItem('eojob_current_user');
        } else {
          writeVersionedStorage(CURRENT_USER_STORAGE_KEY, profile);
          sessionStorage.setItem(REMEMBER_ME_STORAGE_KEY, 'true');
          sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
          localStorage.removeItem(SESSION_ONLY_STORAGE_KEY);
        }
      } else {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        localStorage.removeItem('eojob_current_user');
        localStorage.removeItem('v1_eojob_current_user');
        localStorage.removeItem('eojob_senior_profile');
        localStorage.removeItem('eojob_company_profile');
        localStorage.removeItem('eojob_experience_card');
        localStorage.removeItem(SESSION_ONLY_STORAGE_KEY);
        sessionStorage.clear();
      }
    } catch (storageError) {
      console.warn('Browser storage is unavailable; keeping auth state in memory:', storageError);
    }
  };

  useEffect(() => {
    let isMounted = true;
    // onAuthStateChanged의 초기 null 콜백이 sessionStorage를 비우기 전에 redirect 요청값을 보존한다.
    const pendingOauthRole = readSessionValue(OAUTH_TARGET_ROLE_STORAGE_KEY);
    const pendingOauthRememberMe = readSessionValue(REMEMBER_ME_STORAGE_KEY);

    // 모바일 리디렉션 로그인(signInWithRedirect) 결과 수신 처리 (브라우저 환경)
    if (typeof window !== 'undefined' && auth) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (!isMounted || !result?.user) return;
          const googleUser = result.user;
          const targetRole: UserRole = isUserRole(pendingOauthRole) ? pendingOauthRole : 'senior';
          removeSessionValue(OAUTH_TARGET_ROLE_STORAGE_KEY);
          const profile = await resolveGoogleUserProfile(googleUser, targetRole);
          const rememberMe = pendingOauthRememberMe === 'false' ? false : true;
          saveUserLocal(profile, rememberMe);
          setResolvedAdminRole(await resolveCurrentAdminRole());
          setOauthRedirectCompleted(true);
        })
        .catch((err: unknown) => {
          const authErr = err as { code?: string };
          if (authErr?.code !== 'auth/operation-not-supported-in-this-environment') {
            console.warn('getRedirectResult check error (expected if not redirected):', err);
          }
        });
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      void (async () => {
        if (isLoggingOutRef.current) {
          saveUserLocal(null);
          setResolvedAdminRole(null);
          setLoading(false);
          return;
        }
        if (firebaseUser) {
          try {
            const docRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data() as Omit<UserProfile, 'uid'>;
              saveUserLocal({
                uid: firebaseUser.uid,
                email: firebaseUser.email || data.email,
                name: data.name || '사용자',
                role: data.role || 'senior',
                createdAt: data.createdAt,
              });
            } else {
              saveUserLocal({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name:
                  firebaseUser.displayName ||
                  (firebaseUser.email === 'sehddnr2@gmail.com'
                    ? '이동욱'
                    : firebaseUser.email?.split('@')[0] || '이동욱'),
                role: 'senior',
              });
            }
          } catch (err) {
            console.warn('Firestore user fetch failed, using fallback:', err);
          }
          setResolvedAdminRole(await resolveCurrentAdminRole());
        } else {
          saveUserLocal(null);
          setResolvedAdminRole(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const refreshAdminAccess = async () => {
    const nextRole = await resolveCurrentAdminRole();
    setResolvedAdminRole(nextRole);
    return nextRole;
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ): Promise<UserProfile> => {
    setError(null);
    setLoading(true);

    if (canUseDemoAuth()) {
      const demoProfile: UserProfile = {
        uid: 'demo-user-' + Math.random().toString(36).slice(2, 9),
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
      };
      saveUserLocal(demoProfile);
      setLoading(false);
      return demoProfile;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const profile: UserProfile = {
        uid,
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', uid), {
          email,
          name,
          role,
          createdAt: profile.createdAt,
        });
      } catch (firestoreErr) {
        console.warn('Firestore doc creation failed:', firestoreErr);
      }

      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyErr) {
        console.warn('sendEmailVerification during signUp failed:', verifyErr);
      }

      saveUserLocal(profile);
      setLoading(false);
      return profile;
    } catch (err: unknown) {
      setLoading(false);
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === 'auth/email-already-in-use') {
        const msg = '이미 등록된 이메일 주소입니다. 로그인해주세요.';
        setError(msg);
        throw new Error(msg, { cause: err });
      }
      if (authErr.code === 'auth/invalid-email') {
        const msg = '유효하지 않은 이메일 형식입니다.';
        setError(msg);
        throw new Error(msg, { cause: err });
      }
      if (authErr.code === 'auth/weak-password') {
        const msg = '비밀번호는 6자리 이상이어야 합니다.';
        setError(msg);
        throw new Error(msg, { cause: err });
      }

      if (canUseDemoAuth()) {
        const demoProfile: UserProfile = {
          uid: 'user-' + Date.now(),
          email,
          name,
          role,
          createdAt: new Date().toISOString(),
        };
        saveUserLocal(demoProfile);
        return demoProfile;
      }
      const message = '회원가입 정보를 저장하지 못했습니다. 네트워크 연결 후 다시 시도해 주세요.';
      setError(message);
      throw new Error(message, { cause: err });
    }
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (err: unknown) {
        const authErr = err as { code?: string; message?: string };
        console.warn('sendEmailVerification failed:', authErr);
        if (authErr.code === 'auth/operation-not-allowed') {
          throw new Error('파이어베이스 콘솔에서 이메일 인증 활성화가 필요합니다.', { cause: err });
        }
        if (authErr.code === 'auth/too-many-requests') {
          throw new Error('인증 메일 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', {
            cause: err,
          });
        }
        throw new Error(authErr.message || '인증 메일 발송에 실패했습니다.', { cause: err });
      }
    }
  };

  const checkEmailVerified = async (): Promise<boolean> => {
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        return auth.currentUser.emailVerified;
      } catch (err) {
        console.warn('reload currentUser failed:', err);
      }
    }
    return true; // Fallback for demo / offline environment
  };

  const signIn = async (
    email: string,
    password: string,
    targetRole: UserRole = 'senior',
    rememberMe: boolean = true,
  ): Promise<UserProfile> => {
    setError(null);
    setLoading(true);

    if (canUseDemoAuth()) {
      const defaultName =
        email === 'sehddnr2@gmail.com'
          ? '이동욱'
          : email?.split('@')[0] || (targetRole === 'senior' ? '이동욱' : '채용담당자');
      const demoProfile: UserProfile = {
        uid: 'demo-user-' + Date.now(),
        email: email || 'demo@eojob.com',
        name: defaultName,
        role: targetRole,
      };
      saveUserLocal(demoProfile, rememberMe);
      setLoading(false);
      return demoProfile;
    }

    try {
      if (auth) {
        try {
          await setPersistence(
            auth,
            rememberMe ? browserLocalPersistence : browserSessionPersistence,
          );
        } catch (persistErr) {
          console.warn('Failed to set auth persistence:', persistErr);
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      let userRole = targetRole;
      let userName = '사용자';

      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.role) userRole = data.role as UserRole;
          if (data.name) userName = data.name as string;
        }
      } catch (firestoreErr) {
        console.warn('Firestore read failed:', firestoreErr);
      }

      const profile: UserProfile = {
        uid,
        email: userCredential.user.email || email,
        name: userName,
        role: userRole,
      };

      saveUserLocal(profile, rememberMe);
      setLoading(false);
      return profile;
    } catch (err: unknown) {
      setLoading(false);
      const authErr = err as { code?: string; message?: string };
      if (
        authErr.code === 'auth/user-not-found' ||
        authErr.code === 'auth/wrong-password' ||
        authErr.code === 'auth/invalid-credential'
      ) {
        const msg = '이메일 또는 비밀번호가 일치하지 않습니다.';
        setError(msg);
        throw new Error(msg, { cause: err });
      }
      if (authErr.code === 'auth/invalid-email') {
        const msg = '올바른 이메일 형식을 입력해주세요.';
        setError(msg);
        throw new Error(msg, { cause: err });
      }

      if (canUseDemoAuth()) {
        const defaultName =
          email === 'sehddnr2@gmail.com'
            ? '이동욱'
            : email?.split('@')[0] || (targetRole === 'senior' ? '이동욱' : '채용담당자');
        const demoProfile: UserProfile = {
          uid: 'user-' + Date.now(),
          email: email || 'demo@eojob.com',
          name: defaultName,
          role: targetRole,
        };
        saveUserLocal(demoProfile);
        return demoProfile;
      }
      const message = '로그인할 수 없습니다. 네트워크 연결과 계정 정보를 확인해 주세요.';
      setError(message);
      throw new Error(message, { cause: err });
    }
  };

  const signOut = async () => {
    isLoggingOutRef.current = true;
    saveUserLocal(null);
    setUser(null);
    setResolvedAdminRole(null);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
    saveUserLocal(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('eojob_user_logged_out'));
      window.dispatchEvent(new Event('storage'));
    }
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 1000);
  };

  const deleteAccount = async () => {
    const currentFirebaseUser = auth.currentUser;
    const uid = user?.uid || currentFirebaseUser?.uid;
    isLoggingOutRef.current = true;

    try {
      await deleteCurrentAccountData();
    } catch (err) {
      isLoggingOutRef.current = false;
      const msg =
        err instanceof Error
          ? err.message
          : '회원 탈퇴를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      setError(msg);
      throw new Error(msg, { cause: err });
    }

    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Deleted account local signout warning:', err);
    }

    clearDeletedUserLocalData(uid);
    saveUserLocal(null);
    setUser(null);
    setResolvedAdminRole(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('eojob_user_logged_out'));
      window.dispatchEvent(new Event('storage'));
    }
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 1000);
  };

  const signInWithGoogle = async (
    targetRole: UserRole = 'senior',
    rememberMe: boolean = true,
  ): Promise<UserProfile> => {
    setLoading(true);
    setError(null);

    // Google OAuth는 카카오 WebView 내부에서 차단될 수 있어 시스템 브라우저로 넘긴다.
    // 스킴 할당은 실제 전환 성공을 보장하지 않으므로 Promise를 무한 대기시키지 않는다.
    if (typeof window !== 'undefined' && isKakaoTalk()) {
      const externalTarget = new URL(window.location.href);
      externalTarget.searchParams.set('role', targetRole);
      const opened = openInExternalBrowser(externalTarget.toString());
      const message = opened
        ? '기본 브라우저 열기를 시도했습니다. 전환되지 않으면 카카오톡 메뉴에서 다른 브라우저로 열어 주세요.'
        : '카카오톡 메뉴에서 다른 브라우저로 연 뒤 구글 로그인을 진행해 주세요.';
      setError(message);
      setLoading(false);
      throw new Error(message);
    }

    try {
      if (auth) {
        try {
          await setPersistence(
            auth,
            rememberMe ? browserLocalPersistence : browserSessionPersistence,
          );
        } catch (persistErr) {
          console.warn('Failed to set Google auth persistence:', persistErr);
        }
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupErr: unknown) {
        const pErr = popupErr as { code?: string };
        // 팝업을 사용할 수 없는 모바일 브라우저는 redirect 방식으로 폴백한다.
        if (
          pErr?.code === 'auth/popup-blocked' ||
          pErr?.code === 'auth/operation-not-supported-in-this-environment'
        ) {
          writeSessionValue(OAUTH_TARGET_ROLE_STORAGE_KEY, targetRole);
          writeSessionValue(REMEMBER_ME_STORAGE_KEY, String(rememberMe));
          await signInWithRedirect(auth, provider);
          const message = '구글 로그인 화면으로 이동하지 못했습니다. 다시 시도해 주세요.';
          throw Object.assign(new Error(message), { code: 'auth/redirect-not-started' });
        }
        throw popupErr;
      }

      const googleUser = result.user;
      const profile = await resolveGoogleUserProfile(googleUser, targetRole);
      saveUserLocal(profile, rememberMe);
      setLoading(false);
      return profile;
    } catch (err: unknown) {
      setLoading(false);
      const authErr = err as { code?: string; message?: string };
      console.warn('Google Sign In error:', authErr);
      if (authErr.code === 'auth/popup-closed-by-user') {
        const msg = '구글 로그인 팝업창이 닫혔습니다.';
        setError(msg);
        throw new Error(msg, { cause: err });
      }
      if (authErr.code === 'auth/cancelled-popup-request') {
        const msg = '구글 로그인 요청이 취소되었습니다.';
        setError(msg);
        throw new Error(msg, { cause: err });
      }
      if (authErr.code === 'auth/redirect-not-started') {
        const msg = authErr.message || '구글 로그인 화면으로 이동하지 못했습니다.';
        setError(msg);
        throw new Error(msg, { cause: err });
      }
      if (canUseDemoAuth()) {
        const demoProfile: UserProfile = {
          uid: 'google-user-' + Date.now(),
          email: 'google.user@gmail.com',
          name: '구글 회원',
          role: targetRole,
          createdAt: new Date().toISOString(),
        };
        saveUserLocal(demoProfile);
        return demoProfile;
      }
      const message = '구글 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      setError(message);
      throw new Error(message, { cause: err });
    }
  };

  const clearError = () => setError(null);

  const currentRole: UserRole = user?.role || 'senior';
  const adminRole = resolvedAdminRole ?? getAdminRoleForEmail(user?.email);
  const isAdmin = Boolean(adminRole);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        isAdmin,
        adminRole,
        refreshAdminAccess,
        loading,
        oauthRedirectCompleted,
        error,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        deleteAccount,
        sendVerificationEmail,
        checkEmailVerified,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

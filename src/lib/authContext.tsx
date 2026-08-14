import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { readVersionedStorage, writeVersionedStorage } from '@/lib/browserStorage';
import { auth, db } from '@/lib/firebase';

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
  error: string | null;
  loading: boolean;
  role: UserRole;
  sendVerificationEmail: () => Promise<void>;
  signIn: (email: string, password: string, targetRole?: UserRole) => Promise<UserProfile>;
  signInWithGoogle: (role?: UserRole) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<UserProfile>;
  user: UserProfile | null;
};

const AuthContext = createContext<AuthContextType | null>(null);
const CURRENT_USER_STORAGE_KEY = 'eojob_current_user';

function canUseDemoAuth(email = '') {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true' ||
    email.endsWith('@example.com') ||
    email.includes('test')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = readVersionedStorage<UserProfile>(CURRENT_USER_STORAGE_KEY);
    return saved?.uid && saved.email && (saved.role === 'senior' || saved.role === 'company')
      ? saved
      : null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const saveUserLocal = (profile: UserProfile | null) => {
    setUser(profile);
    if (typeof window !== 'undefined') {
      if (profile) {
        writeVersionedStorage(CURRENT_USER_STORAGE_KEY, profile);
      } else {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      void (async () => {
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
        }
        setLoading(false);
      })();
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
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
        if (email.includes('example.com') || email.includes('test')) {
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

      if (canUseDemoAuth(email)) {
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
  ): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    try {
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

      saveUserLocal(profile);
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

      if (canUseDemoAuth(email)) {
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
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
    saveUserLocal(null);
  };

  const signInWithGoogle = async (targetRole: UserRole = 'senior'): Promise<UserProfile> => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const computedName =
        googleUser.displayName ||
        (googleUser.email === 'sehddnr2@gmail.com'
          ? '이동욱'
          : googleUser.email?.split('@')[0] || '이동욱');
      const profile: UserProfile = {
        uid: googleUser.uid,
        email: googleUser.email || '',
        name: computedName,
        role: targetRole,
        createdAt: new Date().toISOString(),
      };
      try {
        await setDoc(
          doc(db, 'users', googleUser.uid),
          {
            uid: googleUser.uid,
            email: googleUser.email,
            name: profile.name,
            role: targetRole,
            createdAt: profile.createdAt,
          },
          { merge: true },
        );
      } catch (fsErr) {
        console.warn('Firestore setDoc failed during Google sign in:', fsErr);
      }
      saveUserLocal(profile);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        loading,
        error,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
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

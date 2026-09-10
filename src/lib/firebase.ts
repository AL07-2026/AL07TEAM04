import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

function readPublicEnv(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

const firebaseProjectId = readPublicEnv(
  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  'al07team04-bdfcd',
);
const configuredAuthDomain = readPublicEnv(
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  `${firebaseProjectId}.firebaseapp.com`,
);

function resolveAuthDomain() {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === `${firebaseProjectId}.web.app`
  ) {
    // 운영 Hosting에서는 redirect helper도 동일 출처로 사용해 모바일 저장소 차단을 피한다.
    return window.location.hostname;
  }
  return configuredAuthDomain;
}

const firebaseConfig = {
  apiKey: readPublicEnv(
    import.meta.env.VITE_FIREBASE_API_KEY,
    'AIzaSyDgcna1VHRdEj8e6QBD15G_7j__kbM2qzk',
  ),
  authDomain: resolveAuthDomain(),
  projectId: firebaseProjectId,
  storageBucket: readPublicEnv(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    'al07team04-bdfcd.firebasestorage.app',
  ),
  messagingSenderId: readPublicEnv(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    '1079118700560',
  ),
  appId: readPublicEnv(
    import.meta.env.VITE_FIREBASE_APP_ID,
    '1:1079118700560:web:44f649f95d7e3f22f2aa95',
  ),
  measurementId: readPublicEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, 'G-X8DB6JPJPY'),
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
auth.languageCode = 'ko';

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

function readPublicEnv(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

const firebaseConfig = {
  apiKey: readPublicEnv(
    import.meta.env.VITE_FIREBASE_API_KEY,
    'AIzaSyDgcna1VHRdEj8e6QBD15G_7j__kbM2qzk',
  ),
  authDomain: readPublicEnv(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    'al07team04-bdfcd.firebaseapp.com',
  ),
  projectId: readPublicEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'al07team04-bdfcd'),
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
  measurementId: readPublicEnv(
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    'G-X8DB6JPJPY',
  ),
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
auth.languageCode = 'ko';

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

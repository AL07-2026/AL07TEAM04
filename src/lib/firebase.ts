import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env as Record<string, string | undefined>;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyForEojobApp',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'al07team04-bdfcd.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'al07team04-bdfcd',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'al07team04-bdfcd.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '107404',
  appId: env.VITE_FIREBASE_APP_ID || '1:107404:web:eojob',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

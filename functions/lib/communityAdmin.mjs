import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Keep the latency-sensitive community runtime free of unused Admin Storage imports.
if (!getApps().length) {
  initializeApp();
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();

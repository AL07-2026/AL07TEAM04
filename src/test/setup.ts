import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  deleteDoc: vi.fn(() => Promise.resolve(undefined)),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() =>
    Promise.resolve({
      data: () => undefined,
      exists: () => false,
      id: '',
    }),
  ),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getFirestore: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  setDoc: vi.fn(() => Promise.resolve(undefined)),
  updateDoc: vi.fn(() => Promise.resolve(undefined)),
  where: vi.fn(() => ({})),
}));

vi.mock('firebase/storage', () => ({
  getDownloadURL: vi.fn(() => Promise.resolve('https://example.com/project-attachment')),
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(() => Promise.resolve({ ref: {} })),
}));

afterEach(() => {
  cleanup();
});

import { randomUUID } from 'node:crypto';

import { adminDb, adminStorage } from './firestoreAdmin.mjs';

const RECENT_AUTH_WINDOW_SECONDS = 5 * 60;
const AUTH_CLOCK_SKEW_SECONDS = 60;
const STORAGE_DELETE_CONCURRENCY = 20;
const DELETION_JOB_COLLECTION = 'account_deletion_jobs';
const DELETION_LEASE_MS = 10 * 60 * 1000;
const ROOT_COLLECTIONS = ['users', 'senior_profiles', 'company_profiles', 'companies'];
const QUERY_COLLECTIONS = [
  { collectionName: 'experience_cards', field: 'uid' },
  { collectionName: 'projects', field: 'ownerId' },
  { collectionName: 'user_proposals', field: 'userId' },
];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function bearerToken(headers = {}) {
  const authorization = text(headers.authorization);
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return text(match?.[1]);
}

function collectStoragePathValues(value, paths) {
  if (!value || typeof value !== 'object') return;
  for (const [key, fieldValue] of Object.entries(value)) {
    if (key === 'storagePath' && typeof fieldValue === 'string') {
      const path = text(fieldValue);
      if (path) paths.add(path);
      continue;
    }
    if (Array.isArray(fieldValue)) {
      fieldValue.forEach((item) => collectStoragePathValues(item, paths));
      continue;
    }
    collectStoragePathValues(fieldValue, paths);
  }
}

function ownedStoragePrefixes(document, uid) {
  const path = text(document?.ref?.path);
  const [collectionName] = path.split('/');
  const documentId = text(document?.id || document?.ref?.id);
  const data = document?.data?.() || {};
  if (collectionName === 'senior_profiles' && documentId === uid) {
    return [`resumes/${uid}/profile/`];
  }
  if (collectionName === 'projects' && text(data.ownerId) === uid && documentId) {
    return [`project-attachments/${documentId}/`];
  }
  if (collectionName === 'user_proposals' && text(data.userId) === uid && documentId) {
    return [`resumes/${uid}/${documentId}/`];
  }
  return [];
}

function storagePathsForDocuments(documents, uid) {
  const paths = new Set();
  for (const document of documents) {
    const candidates = new Set();
    collectStoragePathValues(document.data?.(), candidates);
    const prefixes = ownedStoragePrefixes(document, uid);
    for (const path of candidates) {
      if (prefixes.some((prefix) => path.startsWith(prefix) && path.length > prefix.length)) {
        paths.add(path);
      }
    }
  }
  return [...paths];
}

export class AccountDeletionError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AccountDeletionError';
    this.status = status;
  }
}

export function createAccountRepository({ db = adminDb, storage = adminStorage } = {}) {
  return {
    async deleteCoreAccountData(uid) {
      const directReferences = [
        ...ROOT_COLLECTIONS.map((collectionName) => db.collection(collectionName).doc(uid)),
        db.collection('experience_cards').doc(uid),
      ];
      const directSnapshots = await Promise.all(
        directReferences.map((reference) => reference.get()),
      );
      const querySnapshots = await Promise.all(
        QUERY_COLLECTIONS.map(({ collectionName, field }) =>
          db.collection(collectionName).where(field, '==', uid).get(),
        ),
      );
      const companyProposalSnapshot = await db
        .collection('user_proposals')
        .where('projectOwnerId', '==', uid)
        .get();
      const documents = new Map();
      directSnapshots.filter((document) => document.exists).forEach((document) => {
        documents.set(document.ref.path, document);
      });
      querySnapshots.flatMap((snapshot) => snapshot.docs).forEach((document) => {
        documents.set(document.ref.path, document);
      });
      const linkedCompanyProposals = companyProposalSnapshot.docs.filter(
        (document) => !documents.has(document.ref.path),
      );

      const storagePaths = storagePathsForDocuments([...documents.values()], uid);
      for (let index = 0; index < storagePaths.length; index += STORAGE_DELETE_CONCURRENCY) {
        await Promise.all(
          storagePaths.slice(index, index + STORAGE_DELETE_CONCURRENCY).map((path) =>
            storage.bucket().file(path).delete({ ignoreNotFound: true }),
          ),
        );
      }

      const references = new Map(directReferences.map((reference) => [reference.path, reference]));
      documents.forEach((document) => references.set(document.ref.path, document.ref));
      const writer = db.bulkWriter();
      references.forEach((reference) => writer.delete(reference));
      const companyAccountDeletedAt = new Date().toISOString();
      linkedCompanyProposals.forEach((document) => {
        writer.set(
          document.ref,
          {
            companyAccountDeleted: true,
            companyAccountDeletedAt,
            emailDelivery: null,
            projectOwnerId: '',
            updatedAt: companyAccountDeletedAt,
          },
          { merge: true },
        );
      });
      await writer.close();
      return {
        anonymizedCompanyProposals: linkedCompanyProposals.length,
        deletedDocuments: references.size,
        deletedStorageObjects: storagePaths.length,
      };
    },
  };
}

function completedStepNames(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .filter(([, completed]) => completed === true)
    .map(([step]) => step);
}

export function createAccountDeletionJobStore(db = adminDb) {
  const jobReference = (uid) => db.collection(DELETION_JOB_COLLECTION).doc(uid);
  return {
    async claim(uid, requestId, nowMs) {
      const reference = jobReference(uid);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const current = snapshot.data?.() || {};
        if (
          current.status === 'running' &&
          current.requestId !== requestId &&
          Number(current.leaseUntilMs) > nowMs
        ) {
          throw new AccountDeletionError(
            409,
            '회원 탈퇴 처리가 진행 중입니다. 잠시 후 다시 확인해 주세요.',
          );
        }
        const updatedAt = new Date(nowMs).toISOString();
        transaction.set(
          reference,
          {
            createdAt: text(current.createdAt) || updatedAt,
            leaseUntilMs: nowMs + DELETION_LEASE_MS,
            requestId,
            status: 'running',
            steps: current.steps || {},
            uid,
            updatedAt,
          },
          { merge: true },
        );
        return { completedSteps: completedStepNames(current.steps) };
      });
    },
    async markStep(uid, requestId, step, nowMs) {
      const reference = jobReference(uid);
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const current = snapshot.data?.() || {};
        if (current.requestId !== requestId || current.status !== 'running') {
          throw new AccountDeletionError(409, '회원 탈퇴 작업 상태가 변경되었습니다.');
        }
        transaction.set(
          reference,
          {
            leaseUntilMs: nowMs + DELETION_LEASE_MS,
            steps: { ...(current.steps || {}), [step]: true },
            updatedAt: new Date(nowMs).toISOString(),
          },
          { merge: true },
        );
      });
    },
    async fail(uid, requestId, nowMs) {
      const reference = jobReference(uid);
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const current = snapshot.data?.() || {};
        if (current.requestId !== requestId || current.status !== 'running') return;
        transaction.set(
          reference,
          {
            failedAt: new Date(nowMs).toISOString(),
            leaseUntilMs: 0,
            status: 'failed',
            updatedAt: new Date(nowMs).toISOString(),
          },
          { merge: true },
        );
      });
    },
    async complete(uid, requestId, nowMs) {
      const reference = jobReference(uid);
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const current = snapshot.data?.() || {};
        if (current.requestId !== requestId) return;
        transaction.set(
          reference,
          {
            completedAt: new Date(nowMs).toISOString(),
            leaseUntilMs: 0,
            status: 'completed',
            updatedAt: new Date(nowMs).toISOString(),
          },
          { merge: true },
        );
      });
    },
  };
}

export function createAccountDeletionHandler({
  createRequestId = randomUUID,
  deleteAuthUser,
  deleteCommunityAccountData,
  deletePremiumAccountData,
  jobStore,
  now = () => Date.now(),
  repository,
  verifyIdToken,
}) {
  return async function accountDeletionHandler(request, response) {
    let claimedUid = '';
    let requestId = '';
    try {
      const token = bearerToken(request.headers);
      if (!token) throw new AccountDeletionError(401, '로그인 후 다시 시도해 주세요.');

      let user;
      try {
        user = await verifyIdToken(token);
      } catch {
        throw new AccountDeletionError(401, '로그인 정보를 다시 확인해 주세요.');
      }
      const uid = text(user?.uid);
      const authTime = Number(user?.auth_time);
      const nowSeconds = Math.floor(now() / 1000);
      if (
        !uid ||
        uid.includes('/') ||
        !Number.isFinite(authTime) ||
        authTime > nowSeconds + AUTH_CLOCK_SKEW_SECONDS ||
        nowSeconds - authTime > RECENT_AUTH_WINDOW_SECONDS
      ) {
        throw new AccountDeletionError(
          401,
          '보안을 위해 다시 로그인한 후 회원 탈퇴를 진행해 주세요.',
        );
      }

      requestId = createRequestId();
      const job = await jobStore.claim(uid, requestId, now());
      claimedUid = uid;
      const completedSteps = new Set(job.completedSteps || []);
      const steps = [
        ['core', () => repository.deleteCoreAccountData(uid)],
        ['community', () => deleteCommunityAccountData(uid)],
        ['premium', () => deletePremiumAccountData(uid)],
      ];
      for (const [step, operation] of steps) {
        if (completedSteps.has(step)) continue;
        await operation();
        await jobStore.markStep(uid, requestId, step, now());
      }

      try {
        await deleteAuthUser(uid);
      } catch (error) {
        if (error?.code !== 'auth/user-not-found') throw error;
      }
      await jobStore.complete(uid, requestId, now()).catch(() => undefined);
      return response.json({ deleted: true });
    } catch (error) {
      if (claimedUid && requestId) {
        await jobStore.fail(claimedUid, requestId, now()).catch(() => undefined);
      }
      const status = Number(error?.status) || 503;
      const message =
        error instanceof AccountDeletionError
          ? error.message
          : '회원 탈퇴를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      return response
        .status(status)
        .json({ deleted: false, error: message, retryable: status === 409 || status === 503 });
    }
  };
}

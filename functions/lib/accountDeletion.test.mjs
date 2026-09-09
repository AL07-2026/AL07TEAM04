import { describe, expect, it, vi } from 'vitest';

import {
  createAccountDeletionHandler,
  createAccountDeletionJobStore,
  createAccountRepository,
} from './accountDeletion.mjs';

function responseHarness() {
  return {
    body: undefined,
    statusCode: 200,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

function documentSnapshot(path, data, exists = true) {
  const id = path.split('/').at(-1);
  return {
    data: () => data,
    exists,
    id,
    ref: { id, path },
  };
}

function database(initialData) {
  const data = new Map(Object.entries(initialData));
  const deletedDocuments = [];
  const reference = (path) => ({
    id: path.split('/').at(-1),
    path,
    async get() {
      return documentSnapshot(path, data.get(path), data.has(path));
    },
  });
  const db = {
    bulkWriter: () => ({
      close: vi.fn(async () => undefined),
      delete: vi.fn((ref) => {
        deletedDocuments.push(ref.path);
        data.delete(ref.path);
      }),
      set: vi.fn((ref, value) => {
        data.set(ref.path, { ...(data.get(ref.path) || {}), ...value });
      }),
    }),
    collection: (collectionName) => ({
      doc: (id) => reference(`${collectionName}/${id}`),
      where: (field, operator, value) => ({
        get: vi.fn(async () => {
          expect(operator).toBe('==');
          const docs = [...data.entries()]
            .filter(([path, row]) => path.split('/').length === 2)
            .filter(([path]) => path.startsWith(`${collectionName}/`))
            .filter(([, row]) => row?.[field] === value)
            .map(([path, row]) => documentSnapshot(path, row));
          return { docs };
        }),
      }),
    }),
  };
  return { data, db, deletedDocuments };
}

function transactionDatabase(initialData = {}) {
  const data = new Map(Object.entries(initialData));
  const reference = (path) => ({ id: path.split('/').at(-1), path });
  const snapshot = (path) => ({
    data: () => data.get(path),
    exists: data.has(path),
    ref: reference(path),
  });
  return {
    data,
    db: {
      collection: (collectionName) => ({
        doc: (id) => reference(`${collectionName}/${id}`),
      }),
      runTransaction: async (operation) =>
        operation({
          get: async (ref) => snapshot(ref.path),
          set: (ref, value, options) => {
            const current = options?.merge ? data.get(ref.path) || {} : {};
            data.set(ref.path, { ...current, ...value });
          },
        }),
    },
  };
}

describe('account deletion API', () => {
  it('본문 UID를 무시하고 최근 로그인 토큰 UID의 데이터만 삭제한다', async () => {
    const order = [];
    const repository = {
      deleteCoreAccountData: vi.fn(async (uid) => order.push(`core:${uid}`)),
    };
    const deleteCommunityAccountData = vi.fn(async (uid) => order.push(`community:${uid}`));
    const deletePremiumAccountData = vi.fn(async (uid) => order.push(`premium:${uid}`));
    const deleteAuthUser = vi.fn(async (uid) => order.push(`auth:${uid}`));
    const jobStore = {
      claim: vi.fn().mockResolvedValue({ completedSteps: [] }),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
      markStep: vi.fn(async (_uid, _requestId, step) => order.push(`checkpoint:${step}`)),
    };
    const handler = createAccountDeletionHandler({
      createRequestId: () => 'request-1',
      deleteAuthUser,
      deleteCommunityAccountData,
      deletePremiumAccountData,
      jobStore,
      now: () => 1_000_000,
      repository,
      verifyIdToken: vi.fn().mockResolvedValue({ auth_time: 700, uid: 'token-user' }),
    });
    const response = responseHarness();

    await handler(
      {
        body: { uid: 'attacker-selected-user' },
        headers: { authorization: 'Bearer valid-token' },
      },
      response,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ deleted: true });
    expect(order).toEqual([
      'core:token-user',
      'checkpoint:core',
      'community:token-user',
      'checkpoint:community',
      'premium:token-user',
      'checkpoint:premium',
      'auth:token-user',
    ]);
    expect(order.at(-1)).toBe('auth:token-user');
    expect(jobStore.claim).toHaveBeenCalledWith('token-user', 'request-1', 1_000_000);
    expect(jobStore.complete).toHaveBeenCalledWith('token-user', 'request-1', 1_000_000);
  });

  it('인증이 없거나 최근 로그인이 아니면 정리를 시작하지 않는다', async () => {
    const repository = { deleteCoreAccountData: vi.fn() };
    const deleteAuthUser = vi.fn();
    const handler = createAccountDeletionHandler({
      createRequestId: () => 'request-1',
      deleteAuthUser,
      deleteCommunityAccountData: vi.fn(),
      deletePremiumAccountData: vi.fn(),
      jobStore: {
        claim: vi.fn(),
        complete: vi.fn(),
        fail: vi.fn(),
        markStep: vi.fn(),
      },
      now: () => 1_000_000,
      repository,
      verifyIdToken: vi.fn().mockResolvedValue({ auth_time: 600, uid: 'user-1' }),
    });

    const missingResponse = responseHarness();
    await handler({ headers: {} }, missingResponse);
    expect(missingResponse.statusCode).toBe(401);

    const staleResponse = responseHarness();
    await handler({ headers: { authorization: 'Bearer stale-token' } }, staleResponse);
    expect(staleResponse.statusCode).toBe(401);
    expect(staleResponse.body.error).toContain('다시 로그인');
    expect(repository.deleteCoreAccountData).not.toHaveBeenCalled();
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('실패한 단계에서 중단하고 체크포인트를 남겨 Auth 계정을 보존한다', async () => {
    const repository = {
      deleteCoreAccountData: vi.fn().mockRejectedValue(new Error('temporary firestore error')),
    };
    const deleteCommunityAccountData = vi.fn().mockResolvedValue(undefined);
    const deletePremiumAccountData = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn();
    const jobStore = {
      claim: vi.fn().mockResolvedValue({ completedSteps: [] }),
      complete: vi.fn(),
      fail: vi.fn().mockResolvedValue(undefined),
      markStep: vi.fn(),
    };
    const handler = createAccountDeletionHandler({
      createRequestId: () => 'request-1',
      deleteAuthUser,
      deleteCommunityAccountData,
      deletePremiumAccountData,
      jobStore,
      now: () => 1_000_000,
      repository,
      verifyIdToken: vi.fn().mockResolvedValue({ auth_time: 999, uid: 'user-1' }),
    });
    const response = responseHarness();

    await handler({ headers: { authorization: 'Bearer token' } }, response);

    expect(response.statusCode).toBe(503);
    expect(response.body).toMatchObject({ deleted: false, retryable: true });
    expect(deleteCommunityAccountData).not.toHaveBeenCalled();
    expect(deletePremiumAccountData).not.toHaveBeenCalled();
    expect(deleteAuthUser).not.toHaveBeenCalled();
    expect(jobStore.fail).toHaveBeenCalledWith('user-1', 'request-1', 1_000_000);
  });

  it('완료된 체크포인트는 건너뛰고 실패 지점부터 재시도한다', async () => {
    const repository = { deleteCoreAccountData: vi.fn() };
    const deleteCommunityAccountData = vi.fn();
    const deletePremiumAccountData = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);
    const jobStore = {
      claim: vi.fn().mockResolvedValue({ completedSteps: ['core', 'community'] }),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn(),
      markStep: vi.fn().mockResolvedValue(undefined),
    };
    const handler = createAccountDeletionHandler({
      createRequestId: () => 'request-2',
      deleteAuthUser,
      deleteCommunityAccountData,
      deletePremiumAccountData,
      jobStore,
      now: () => 1_000_000,
      repository,
      verifyIdToken: vi.fn().mockResolvedValue({ auth_time: 999, uid: 'user-1' }),
    });
    const response = responseHarness();

    await handler({ headers: { authorization: 'Bearer token' } }, response);

    expect(response.statusCode).toBe(200);
    expect(repository.deleteCoreAccountData).not.toHaveBeenCalled();
    expect(deleteCommunityAccountData).not.toHaveBeenCalled();
    expect(deletePremiumAccountData).toHaveBeenCalledWith('user-1');
    expect(deleteAuthUser).toHaveBeenCalledWith('user-1');
  });

  it('재시도에서 Auth 계정이 이미 없어도 성공으로 처리한다', async () => {
    const authError = Object.assign(new Error('missing'), { code: 'auth/user-not-found' });
    const handler = createAccountDeletionHandler({
      createRequestId: () => 'request-1',
      deleteAuthUser: vi.fn().mockRejectedValue(authError),
      deleteCommunityAccountData: vi.fn().mockResolvedValue(undefined),
      deletePremiumAccountData: vi.fn().mockResolvedValue(undefined),
      jobStore: {
        claim: vi.fn().mockResolvedValue({ completedSteps: [] }),
        complete: vi.fn().mockResolvedValue(undefined),
        fail: vi.fn(),
        markStep: vi.fn().mockResolvedValue(undefined),
      },
      now: () => 1_000_000,
      repository: { deleteCoreAccountData: vi.fn().mockResolvedValue(undefined) },
      verifyIdToken: vi.fn().mockResolvedValue({ auth_time: 999, uid: 'user-1' }),
    });
    const response = responseHarness();

    await handler({ headers: { authorization: 'Bearer token' } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ deleted: true });
  });
});

describe('account deletion job store', () => {
  it('유효한 lease가 있는 다른 요청의 동시 삭제를 차단한다', async () => {
    const { db } = transactionDatabase();
    const store = createAccountDeletionJobStore(db);

    await store.claim('user-1', 'request-1', 1_000);

    await expect(store.claim('user-1', 'request-2', 2_000)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('실패한 작업의 완료 단계는 다음 요청에서 보존해 재실행을 줄인다', async () => {
    const { data, db } = transactionDatabase();
    const store = createAccountDeletionJobStore(db);

    await store.claim('user-1', 'request-1', 1_000);
    await store.markStep('user-1', 'request-1', 'core', 1_500);
    await store.fail('user-1', 'request-1', 2_000);
    const retried = await store.claim('user-1', 'request-2', 3_000);

    expect(retried).toEqual({ completedSteps: ['core'] });
    expect(data.get('account_deletion_jobs/user-1')).toMatchObject({
      requestId: 'request-2',
      status: 'running',
      steps: { core: true },
    });
  });

  it('만료된 lease는 새 요청이 인계받을 수 있다', async () => {
    const { db } = transactionDatabase();
    const store = createAccountDeletionJobStore(db);

    await store.claim('user-1', 'request-1', 1_000);
    const claimed = await store.claim('user-1', 'request-2', 10 * 60 * 1_000 + 1_001);

    expect(claimed).toEqual({ completedSteps: [] });
  });
});

describe('account core repository', () => {
  it('소유 문서만 지우고 검증된 소유 경로의 첨부파일을 Firestore보다 먼저 삭제한다', async () => {
    const { data, db, deletedDocuments } = database({
      'users/user-1': { uid: 'user-1' },
      'senior_profiles/user-1': {
        resumeFile: { storagePath: 'resumes/user-1/profile/profile.pdf' },
      },
      'projects/project-1': {
        attachments: [
          { storagePath: 'project-attachments/project-1/brief.pdf' },
          { storagePath: 'project-attachments/project-2/not-owned.pdf' },
        ],
        ownerId: 'user-1',
      },
      'projects/project-2': { ownerId: 'other-user' },
      'user_proposals/proposal-1': {
        projectOwnerId: 'company-1',
        resumeFiles: [{ storagePath: 'resumes/user-1/proposal-1/resume.pdf' }],
        userId: 'user-1',
      },
      'user_proposals/proposal-2': {
        projectOwnerId: 'user-1',
        resumeFiles: [{ storagePath: 'resumes/other-user/proposal-2/resume.pdf' }],
        userId: 'other-user',
      },
    });
    const callOrder = [];
    const deletedStorage = [];
    const storage = {
      bucket: () => ({
        file: (path) => ({
          delete: vi.fn(async (options) => {
            expect(options).toEqual({ ignoreNotFound: true });
            callOrder.push(`storage:${path}`);
            deletedStorage.push(path);
          }),
        }),
      }),
    };
    const originalBulkWriter = db.bulkWriter;
    db.bulkWriter = () => {
      const writer = originalBulkWriter();
      const close = writer.close;
      writer.close = vi.fn(async () => {
        callOrder.push('firestore');
        await close();
      });
      return writer;
    };
    const repository = createAccountRepository({ db, storage });

    const result = await repository.deleteCoreAccountData('user-1');

    expect(result).toMatchObject({ deletedStorageObjects: 3 });
    expect(deletedStorage.sort()).toEqual([
      'project-attachments/project-1/brief.pdf',
      'resumes/user-1/profile/profile.pdf',
      'resumes/user-1/proposal-1/resume.pdf',
    ]);
    expect(callOrder.at(-1)).toBe('firestore');
    expect(deletedDocuments).toEqual(
      expect.arrayContaining([
        'users/user-1',
        'senior_profiles/user-1',
        'company_profiles/user-1',
        'companies/user-1',
        'experience_cards/user-1',
        'projects/project-1',
        'user_proposals/proposal-1',
      ]),
    );
    expect(data.has('projects/project-2')).toBe(true);
    expect(data.get('user_proposals/proposal-2')).toMatchObject({
      companyAccountDeleted: true,
      emailDelivery: null,
      projectOwnerId: '',
      userId: 'other-user',
    });
  });

  it('첨부파일 삭제가 실패하면 Firestore 문서와 회사 연결을 그대로 보존한다', async () => {
    const { data, db, deletedDocuments } = database({
      'senior_profiles/user-1': {
        resumeFile: { storagePath: 'resumes/user-1/profile/profile.pdf' },
      },
      'user_proposals/proposal-2': {
        projectOwnerId: 'user-1',
        userId: 'other-user',
      },
    });
    const storageError = new Error('temporary storage failure');
    const storage = {
      bucket: () => ({
        file: () => ({
          delete: vi.fn().mockRejectedValue(storageError),
        }),
      }),
    };
    const repository = createAccountRepository({ db, storage });

    await expect(repository.deleteCoreAccountData('user-1')).rejects.toBe(storageError);

    expect(deletedDocuments).toEqual([]);
    expect(data.has('senior_profiles/user-1')).toBe(true);
    expect(data.get('user_proposals/proposal-2')).toEqual({
      projectOwnerId: 'user-1',
      userId: 'other-user',
    });
  });
});

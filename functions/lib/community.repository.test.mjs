import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./firestoreAdmin.mjs', () => ({ adminDb: {}, adminAuth: {} }));

import { createCommunityRepository } from './community.mjs';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function database(initialDocuments = {}) {
  const documents = new Map(Object.entries(initialDocuments));
  const snapshot = (reference) => ({
    id: reference.id,
    ref: reference,
    exists: documents.has(reference.path),
    data: () => documents.get(reference.path),
  });
  const db = {
    update: vi.fn(async (reference, data) => {
      documents.set(reference.path, { ...documents.get(reference.path), ...data });
    }),
    set: vi.fn(),
    remove: vi.fn(),
    recursiveDelete: vi.fn(),
    bulkWriter: vi.fn(),
    getAll: vi.fn(async (...references) => references.map(snapshot)),
    runTransaction: vi.fn(async (callback) =>
      callback({
        get: async (reference) => snapshot(reference),
        set: db.set,
        update: db.update,
        delete: db.remove,
      }),
    ),
  };
  function collection(path) {
    const query = {
      predicates: [],
      direction: 'asc',
      max: Number.POSITIVE_INFINITY,
      doc(id) {
        const reference = {
          id,
          path: `${path}/${id}`,
          collection: (name) => collection(`${path}/${id}/${name}`),
          get: async () => snapshot(reference),
          update: (data) => db.update(reference, data),
        };
        return reference;
      },
      orderBy(field, direction) {
        this.sortField = field;
        this.direction = direction;
        return this;
      },
      limit(value) {
        this.max = value;
        return this;
      },
      where(field, _operator, value) {
        this.predicates.push([field, value]);
        return this;
      },
      get: vi.fn(async () => {
        let entries = [...documents.entries()].filter(
          ([key, data]) =>
            key.startsWith(`${path}/`) &&
            key.split('/').length === path.split('/').length + 1 &&
            query.predicates.every(([field, value]) => data[field] === value),
        );
        if (query.sortField) {
          entries = entries.sort((a, b) => {
            const result = String(a[1][query.sortField]).localeCompare(
              String(b[1][query.sortField]),
            );
            return query.direction === 'desc' ? -result : result;
          });
        }
        return {
          docs: entries
            .slice(0, query.max)
            .map(([key]) => snapshot(query.doc(key.split('/').at(-1)))),
        };
      }),
    };
    return query;
  }
  db.collection = vi.fn(collection);
  return db;
}

const post = {
  authorId: 'author-a',
  authorName: '이전 활동명',
  authorRole: 'senior',
  identityType: 'community-nickname',
  title: '경험 나누기',
  content: '프로젝트를 진행하며 배운 경험입니다.',
  createdAt: '2026-09-01T00:00:00.000Z',
  likeCount: 1,
};

function fixtures() {
  return {
    'community_posts/post-1': post,
    'community_posts/post-2': { ...post, createdAt: '2026-08-31T00:00:00.000Z' },
    'community_profiles/author-a': { nickname: '현재 활동명' },
    'community_posts/post-1/likes/author-a': { userId: 'author-a' },
    'community_posts/post-1/comments/comment-1': {
      authorId: 'author-a',
      authorName: '이전 활동명',
      identityType: 'community-nickname',
      content: '직접 작성한 댓글',
      createdAt: '2026-09-01T01:00:00.000Z',
    },
  };
}

describe('community repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('활동명 조회가 끝나기 전에 좋아요 조회를 시작하며 각각 한 번만 일괄 조회한다', async () => {
    const db = database(fixtures());
    const originalGetAll = db.getAll.getMockImplementation();
    const authors = deferred();
    db.getAll.mockImplementation((...references) =>
      references[0].path.startsWith('community_profiles/')
        ? authors.promise
        : originalGetAll(...references),
    );
    const repository = createCommunityRepository(db);

    const request = repository.listPosts('author-a');
    await Promise.resolve();
    await Promise.resolve();
    try {
      expect(db.getAll).toHaveBeenCalledTimes(2);
      expect(db.getAll.mock.calls[0].map((ref) => ref.path)).toEqual([
        'community_profiles/author-a',
      ]);
      expect(db.getAll.mock.calls[1].map((ref) => ref.path)).toEqual([
        'community_posts/post-1/likes/author-a',
        'community_posts/post-2/likes/author-a',
      ]);
    } finally {
      authors.resolve(await originalGetAll(db.collection('community_profiles').doc('author-a')));
      await request;
    }
    expect((await request)[0]).toMatchObject({
      authorName: '현재 활동명',
      ownedByMe: true,
      likedByMe: true,
    });
  });

  it('비로그인 목록은 활동명만 조회하고 좋아요 문서를 읽지 않는다', async () => {
    const db = database(fixtures());
    const posts = await createCommunityRepository(db).listPosts('');
    expect(db.getAll).toHaveBeenCalledTimes(1);
    expect(posts).toHaveLength(2);
    expect(posts.every((item) => !item.ownedByMe && !item.likedByMe)).toBe(true);
    expect(posts[0]).not.toHaveProperty('authorId');
    expect(posts[0]).not.toHaveProperty('authorRole');
    expect(posts[0]).not.toHaveProperty('identityType');
  });

  it('동일 저장소를 사용하는 서로 다른 계정과 비로그인의 개인 표시가 섞이지 않는다', async () => {
    const repository = createCommunityRepository(database(fixtures()));
    const [owner, other, anonymous] = await Promise.all([
      repository.listPosts('author-a'),
      repository.listPosts('author-b'),
      repository.listPosts(''),
    ]);
    expect(owner[0]).toMatchObject({ ownedByMe: true, likedByMe: true });
    expect(other[0]).toMatchObject({ ownedByMe: false, likedByMe: false });
    expect(anonymous[0]).toMatchObject({ ownedByMe: false, likedByMe: false });
    expect(owner[1].likedByMe).toBe(false);
  });

  it('빈 목록은 추가 getAll 조회 없이 반환한다', async () => {
    const db = database();
    expect(await createCommunityRepository(db).listPosts('author-a')).toEqual([]);
    expect(db.getAll).not.toHaveBeenCalled();
  });

  it('작성자 정보가 없으면 익명 처리하고 프로필 쿼리를 만들지 않는다', async () => {
    const db = database({ 'community_posts/legacy': { title: '오래된 글', authorName: '실명' } });
    const posts = await createCommunityRepository(db).listPosts('');
    expect(posts[0]).toMatchObject({ authorName: '익명 회원', ownedByMe: false, likedByMe: false });
    expect(db.getAll).not.toHaveBeenCalled();
  });

  it('조회 실패를 정상적인 빈 목록으로 삼키지 않는다', async () => {
    const db = database(fixtures());
    db.getAll.mockRejectedValue(new Error('temporary database error'));
    await expect(createCommunityRepository(db).listPosts('author-a')).rejects.toThrow(
      'temporary database error',
    );
  });

  it('목록은 기존 50개 상한을 유지하고 작성자 조회는 중복 제거한다', async () => {
    const data = Object.fromEntries(
      Array.from({ length: 51 }, (_, index) => [`community_posts/${index}`, post]),
    );
    const db = database(data);
    const posts = await createCommunityRepository(db).listPosts('author-a');
    expect(posts).toHaveLength(50);
    expect(db.getAll.mock.calls[0]).toHaveLength(1);
    expect(db.getAll.mock.calls[1]).toHaveLength(50);
  });

  it('댓글도 현재 활동명으로 표시하고 소유권은 현재 조회 계정으로 계산한다', async () => {
    const repository = createCommunityRepository(database(fixtures()));
    const mine = await repository.listComments('post-1', 'author-a');
    const other = await repository.listComments('post-1', 'author-b');
    expect(mine[0]).toMatchObject({ authorName: '현재 활동명', ownedByMe: true });
    expect(other[0]).toMatchObject({ authorName: '현재 활동명', ownedByMe: false });
    expect(mine[0]).not.toHaveProperty('authorId');
  });

  it.each(['updatePost', 'deletePost', 'updateComment', 'deleteComment'])(
    '%s는 실제 저장소의 작성자 UID 검증으로 타인의 쓰기를 거부한다',
    async (method) => {
      const db = database(fixtures());
      const repository = createCommunityRepository(db);
      const args = method.includes('Comment')
        ? ['post-1', 'comment-1', 'intruder', '바꾼 내용']
        : ['post-1', 'intruder', { title: '바꾼 제목' }];
      await expect(repository[method](...args)).rejects.toMatchObject({ status: 403 });
      expect(db.update).not.toHaveBeenCalled();
      expect(db.set).not.toHaveBeenCalled();
      expect(db.remove).not.toHaveBeenCalled();
      expect(db.recursiveDelete).not.toHaveBeenCalled();
    },
  );

  it('작성자는 자신의 글과 댓글을 수정할 수 있다', async () => {
    const db = database(fixtures());
    const repository = createCommunityRepository(db);
    expect(
      await repository.updatePost('post-1', 'author-a', { title: '수정한 제목' }),
    ).toMatchObject({ title: '수정한 제목' });
    expect(
      await repository.updateComment('post-1', 'comment-1', 'author-a', '수정한 댓글'),
    ).toMatchObject({ content: '수정한 댓글' });
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});

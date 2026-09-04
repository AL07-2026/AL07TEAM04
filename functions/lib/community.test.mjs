import { describe, expect, it, vi } from 'vitest';

import { createCommunityHandlers, validatePost } from './community.mjs';

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

function repository() {
  return {
    createComment: vi.fn(),
    createPost: vi.fn(),
    deleteComment: vi.fn(),
    deletePost: vi.fn(),
    getProfile: vi.fn().mockResolvedValue({ name: '김이어', role: 'senior' }),
    listComments: vi.fn().mockResolvedValue([]),
    listPosts: vi.fn().mockResolvedValue([]),
    reportPost: vi.fn(),
    toggleLike: vi.fn(),
    updatePost: vi.fn(),
  };
}

describe('community API', () => {
  it('게시글 길이와 게시판 값을 검증한다', () => {
    expect(() =>
      validatePost({ category: 'invalid', content: '충분히 긴 내용입니다.', title: '유효한 제목' }),
    ).toThrow('게시판');
    expect(() => validatePost({ category: 'experience', content: '짧음', title: '제목' })).toThrow(
      '제목',
    );
  });

  it('로그인 사용자의 서버 프로필로 게시글을 생성한다', async () => {
    const store = repository();
    store.createPost.mockImplementation(async (data) => ({ id: 'post-1', ...data }));
    const handlers = createCommunityHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-1', email: 'user@example.com' }),
    });
    const response = responseHarness();

    await handlers.createPost(
      {
        body: {
          category: 'experience',
          content: '현장에서 배운 업무 개선 경험입니다.',
          title: '업무 개선 경험 공유',
        },
        headers: { authorization: 'Bearer token' },
      },
      response,
    );

    expect(response.statusCode).toBe(200);
    expect(store.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: 'user-1', authorName: '김이어', authorRole: 'senior' }),
    );
  });

  it('비로그인 사용자의 글쓰기를 차단하되 목록은 공개한다', async () => {
    const store = repository();
    const handlers = createCommunityHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockRejectedValue(new Error('invalid')),
    });
    const createResponse = responseHarness();
    const listResponse = responseHarness();

    await handlers.createPost({ body: {}, headers: {} }, createResponse);
    await handlers.listPosts({ headers: {} }, listResponse);

    expect(createResponse.statusCode).toBe(401);
    expect(listResponse.statusCode).toBe(200);
    expect(store.listPosts).toHaveBeenCalledWith('');
  });
});

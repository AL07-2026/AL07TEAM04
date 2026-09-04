import { describe, expect, it, vi } from 'vitest';

import { createCommunityHandlers, validateNickname, validatePost } from './community.mjs';

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
    getCommunityProfile: vi.fn().mockResolvedValue({ nickname: '경험나눔이' }),
    listComments: vi.fn().mockResolvedValue([]),
    listPosts: vi.fn().mockResolvedValue([]),
    reportPost: vi.fn(),
    saveCommunityProfile: vi.fn(),
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

  it('활동명을 정규화하고 사용할 수 있는 문자를 검증한다', () => {
    expect(validateNickname('  경험   나눔이 ')).toEqual({
      nickname: '경험 나눔이',
      nicknameKey: '경험-나눔이',
    });
    expect(() => validateNickname('a')).toThrow('2자 이상');
    expect(() => validateNickname('메일@test')).toThrow('한글, 영문, 숫자');
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
      expect.objectContaining({
        authorId: 'user-1',
        authorName: '경험나눔이',
        identityType: 'community-nickname',
      }),
    );
    expect(response.body.post).not.toHaveProperty('authorId');
    expect(response.body.post).toMatchObject({ authorName: '경험나눔이', ownedByMe: true });
  });

  it('활동명이 없는 사용자의 게시글 작성을 차단한다', async () => {
    const store = repository();
    store.getCommunityProfile.mockResolvedValue(null);
    const handlers = createCommunityHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-1' }),
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

    expect(response.statusCode).toBe(412);
    expect(store.createPost).not.toHaveBeenCalled();
  });

  it('인증된 사용자의 활동명만 정규화해 저장한다', async () => {
    const store = repository();
    store.saveCommunityProfile.mockResolvedValue({ nickname: '경험 나눔이' });
    const handlers = createCommunityHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-1' }),
    });
    const response = responseHarness();

    await handlers.saveProfile(
      {
        body: { nickname: '  경험   나눔이 ' },
        headers: { authorization: 'Bearer token' },
      },
      response,
    );

    expect(response.statusCode).toBe(200);
    expect(store.saveCommunityProfile).toHaveBeenCalledWith('user-1', {
      nickname: '경험 나눔이',
      nicknameKey: '경험-나눔이',
    });
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, authStateReadyMock, getIdTokenMock } = vi.hoisted(() => {
  const authStateReady = vi.fn();
  return {
    authState: {
      authStateReady,
      currentUser: null as null | { uid?: string; getIdToken: () => Promise<string> },
    },
    authStateReadyMock: authStateReady,
    getIdTokenMock: vi.fn(),
  };
});

vi.mock('@/lib/firebase', () => ({ auth: authState }));

import {
  createCommunityComment,
  clearCommunityReadCache,
  createCommunityPost,
  deleteCommunityAccountData,
  getCommunityProfile,
  listCommunityPosts,
  listCommunityComments,
  deleteCommunityPost,
  reportCommunityPost,
  saveCommunityProfile,
  updateCommunityComment,
} from '@/services/communityService';

describe('communityService', () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    authState.currentUser = null;
    authStateReadyMock.mockReset().mockResolvedValue(undefined);
    getIdTokenMock.mockReset().mockResolvedValue('community-token');
    vi.restoreAllMocks();
    clearCommunityReadCache();
  });

  it('비로그인 상태에서도 게시글 목록을 조회한다', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ posts: [] }), { status: 200 }));

    await expect(listCommunityPosts()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/community/posts',
      expect.objectContaining({ headers: {} }),
    );
  });

  it('같은 계정의 동시 목록 요청과 20초 이내 재방문은 한 번만 읽는다', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ posts: [] }), { status: 200 })));
    await Promise.all([listCommunityPosts(), listCommunityPosts()]);
    await listCommunityPosts();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('캐시가 만료되면 서버에서 최신 목록을 다시 읽는다', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ posts: [] }), { status: 200 })));
    await listCommunityPosts();
    now.mockReturnValue(21001);
    await listCommunityPosts();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('계정 전환과 로그아웃 때 소유권·공감 캐시를 공유하지 않는다', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ posts: [] }), { status: 200 })));
    authState.currentUser = { uid: 'a', getIdToken: getIdTokenMock };
    await listCommunityPosts();
    authState.currentUser = { uid: 'b', getIdToken: getIdTokenMock };
    await listCommunityPosts();
    authState.currentUser = null;
    await listCommunityPosts();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).has('Authorization')).toBe(false);
  });

  it('댓글은 게시글별로 캐시하고 글 삭제 후 목록·댓글 캐시를 비운다', async () => {
    authState.currentUser = { uid: 'a', getIdToken: getIdTokenMock };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
      () => Promise.resolve(
        new Response(JSON.stringify({ posts: [], comments: [], deleted: true }), { status: 200 })),
      );
    await listCommunityPosts();
    await listCommunityComments('one');
    await listCommunityComments('two');
    await listCommunityComments('one');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await deleteCommunityPost('one');
    await listCommunityPosts();
    await listCommunityComments('two');
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('서버 오류 응답은 캐시하지 않는다', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: '일시 오류' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
    await expect(listCommunityPosts()).rejects.toThrow('일시 오류');
    await expect(listCommunityPosts()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('응답 시간 제한 후 로딩을 끝내고 다음 읽기는 재시도할 수 있다', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_url, options) =>
      new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))))
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
    const delayed = expect(listCommunityPosts()).rejects.toThrow('응답이 지연');
    await vi.advanceTimersByTimeAsync(15000);
    await delayed;
    await expect(listCommunityPosts()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('인증 복원 대기부터 전체 요청 시간 제한을 시작한다', async () => {
    vi.useFakeTimers();
    let finishAuth!: () => void;
    authStateReadyMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishAuth = resolve;
        }),
    );
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ posts: [] }), { status: 200 }));

    const request = listCommunityPosts();
    await Promise.resolve();
    try {
      expect(vi.getTimerCount()).toBe(1);
    } finally {
      finishAuth();
      await request;
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('인증 복원이 끝나지 않아도 전체 시간 제한으로 종료한다', async () => {
    vi.useFakeTimers();
    authStateReadyMock.mockImplementationOnce(() => new Promise<void>(() => {}));
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const delayed = expect(listCommunityPosts()).rejects.toThrow('응답이 지연');
    await vi.advanceTimersByTimeAsync(15_000);
    await delayed;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('인증 토큰 발급이 지연되어도 전체 시간 제한으로 종료한다', async () => {
    vi.useFakeTimers();
    authState.currentUser = { uid: 'slow-user', getIdToken: getIdTokenMock };
    getIdTokenMock.mockImplementationOnce(() => new Promise<string>(() => {}));
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const delayed = expect(listCommunityPosts()).rejects.toThrow('응답이 지연');
    await vi.advanceTimersByTimeAsync(15_000);
    await delayed;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('같은 지연 읽기에 합류한 호출도 사용자용 시간 제한 오류를 받는다', async () => {
    vi.useFakeTimers();
    authState.currentUser = { uid: 'slow-user', getIdToken: getIdTokenMock };
    getIdTokenMock.mockImplementationOnce(() => new Promise<string>(() => {}));

    const first = listCommunityPosts().catch((error: unknown) => error);
    await Promise.resolve();
    await Promise.resolve();
    const joined = listCommunityPosts().catch((error: unknown) => error);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(15_000);

    const [firstError, joinedError] = await Promise.all([first, joined]);
    expect(firstError).toBeInstanceOf(Error);
    expect(joinedError).toBeInstanceOf(Error);
    expect((firstError as Error).message).toContain('응답이 지연');
    expect((joinedError as Error).message).toContain('응답이 지연');
    expect(getIdTokenMock).toHaveBeenCalledTimes(1);
  });

  it('활동명 저장 후 이전 프로필과 목록을 다시 사용하지 않는다', async () => {
    authState.currentUser = { uid: 'owner', getIdToken: getIdTokenMock };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ profile: { nickname: '이전활동명' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ profile: { nickname: '새활동명' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ profile: { nickname: '새활동명' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
    await getCommunityProfile();
    await listCommunityPosts();
    await saveCommunityProfile('새활동명');
    await expect(getCommunityProfile()).resolves.toEqual({ nickname: '새활동명' });
    await listCommunityPosts();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('진행 중 읽기보다 쓰기가 먼저 완료되면 오래된 응답을 화면과 캐시에 되살리지 않는다', async () => {
    authState.currentUser = { uid: 'a', getIdToken: getIdTokenMock };
    let finish!: (response: Response) => void;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ deleted: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
    const stale = listCommunityPosts();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await deleteCommunityPost('one');
    finish(new Response(JSON.stringify({ posts: [{ id: 'one' }] }), { status: 200 }));
    await expect(stale).rejects.toThrow('내용이 변경');
    await expect(listCommunityPosts()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('이전 계정에서 늦게 도착한 응답을 새 계정의 캐시에 넣지 않는다', async () => {
    let finish!: (response: Response) => void;
    authState.currentUser = { uid: 'a', getIdToken: getIdTokenMock };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
    const oldRequest = listCommunityPosts();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    authState.currentUser = { uid: 'b', getIdToken: getIdTokenMock };
    await listCommunityPosts();
    finish(
      new Response(JSON.stringify({ posts: [{ id: 'a-only', ownedByMe: true }] }), { status: 200 }),
    );
    await expect(oldRequest).rejects.toThrow('로그인 상태가 변경');
    await expect(listCommunityPosts()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('로그인 사용자의 글쓰기 요청에 인증 토큰을 포함한다', async () => {
    authState.currentUser = { getIdToken: getIdTokenMock };
    const post = {
      authorId: 'user-1',
      authorName: '김이어',
      authorRole: 'senior' as const,
      category: 'experience' as const,
      commentCount: 0,
      content: '프로젝트에서 배운 경험을 공유합니다.',
      createdAt: '2026-09-04T00:00:00.000Z',
      id: 'post-1',
      likedByMe: false,
      likeCount: 0,
      ownedByMe: true,
      title: '프로젝트 경험 공유',
      updatedAt: '2026-09-04T00:00:00.000Z',
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ post }), { status: 200 }));

    await expect(
      createCommunityPost({
        category: post.category,
        content: post.content,
        title: post.title,
      }),
    ).resolves.toEqual(post);

    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(request?.method).toBe('POST');
    expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer community-token');
  });

  it('익명 활동명을 계정 프로필로 저장한다', async () => {
    authState.currentUser = { getIdToken: getIdTokenMock };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ profile: { nickname: '경험나눔이' } }), { status: 200 }),
        ),
      );

    await expect(saveCommunityProfile('경험나눔이')).resolves.toEqual({ nickname: '경험나눔이' });
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/community/profile');
    expect(request?.method).toBe('PUT');
    expect(request?.body).toBe(JSON.stringify({ nickname: '경험나눔이' }));
    await expect(getCommunityProfile()).resolves.toEqual({ nickname: '경험나눔이' });
  });

  it('인증되지 않은 상태에서 프로필 조회 시 오류를 던지지 않고 null을 반환한다', async () => {
    authState.currentUser = null;
    await expect(getCommunityProfile()).resolves.toBeNull();
  });

  it('서버 오류 메시지를 사용자에게 전달한다', async () => {
    authState.currentUser = { getIdToken: getIdTokenMock };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: '이미 신고한 게시글입니다.' }), { status: 409 }),
    );

    await expect(reportCommunityPost('post-1', 'spam')).rejects.toThrow(
      '이미 신고한 게시글입니다.',
    );
  });

  it('댓글 수정과 회원 데이터 삭제에 인증 토큰을 사용한다', async () => {
    authState.currentUser = { getIdToken: getIdTokenMock };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            comment: {
              authorName: '경험나눔이',
              content: '수정 댓글',
              createdAt: '2026-09-04T00:00:00.000Z',
              id: 'comment-1',
              ownedByMe: true,
              updatedAt: '2026-09-04T00:01:00.000Z',
            },
            deleted: true,
          }),
          { status: 200 },
        ),
      ),
    );

    await updateCommunityComment('post-1', 'comment-1', '수정 댓글');
    await deleteCommunityAccountData();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/community/posts/post-1/comments/comment-1');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/community/account');
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('DELETE');
  });

  it('대댓글 작성 시 parentId와 replyToAuthorName을 본문에 포함하여 요청한다', async () => {
    authState.currentUser = { getIdToken: getIdTokenMock };
    const reply = {
      authorName: '후배시니어',
      content: '좋은 팁 감사합니다!',
      createdAt: '2026-09-04T00:02:00.000Z',
      id: 'comment-2',
      ownedByMe: true,
      parentId: 'comment-1',
      replyToAuthorName: '선배시니어',
      updatedAt: '2026-09-04T00:02:00.000Z',
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ comment: reply }), { status: 200 }));

    await expect(
      createCommunityComment('post-1', '좋은 팁 감사합니다!', 'comment-1', '선배시니어'),
    ).resolves.toEqual(reply);

    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/community/posts/post-1/comments');
    expect(request?.method).toBe('POST');
    expect(JSON.parse(request?.body as string)).toEqual({
      content: '좋은 팁 감사합니다!',
      parentId: 'comment-1',
      replyToAuthorName: '선배시니어',
    });
    expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer community-token');
  });
});

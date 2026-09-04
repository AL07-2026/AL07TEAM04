import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, getIdTokenMock } = vi.hoisted(() => ({
  authState: { currentUser: null as null | { getIdToken: () => Promise<string> } },
  getIdTokenMock: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ auth: authState }));

import {
  createCommunityPost,
  deleteCommunityAccountData,
  getCommunityProfile,
  listCommunityPosts,
  reportCommunityPost,
  saveCommunityProfile,
  updateCommunityComment,
} from '@/services/communityService';

describe('communityService', () => {
  beforeEach(() => {
    authState.currentUser = null;
    getIdTokenMock.mockReset().mockResolvedValue('community-token');
    vi.restoreAllMocks();
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
});

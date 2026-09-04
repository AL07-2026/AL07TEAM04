import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type * as ReactRouter from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommunityPage } from '@/app/CommunityPage';
import * as communityService from '@/services/communityService';

const { authState, mockNavigate } = vi.hoisted(() => ({
  authState: { user: null as null | { uid: string } },
  mockNavigate: vi.fn(),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/authContext', () => ({ useAuth: () => authState }));
vi.mock('@/services/communityService', () => ({
  createCommunityComment: vi.fn(),
  createCommunityPost: vi.fn(),
  deleteCommunityComment: vi.fn(),
  deleteCommunityPost: vi.fn(),
  getCommunityProfile: vi.fn().mockResolvedValue(null),
  listCommunityComments: vi.fn().mockResolvedValue([]),
  listCommunityPosts: vi.fn().mockResolvedValue([]),
  reportCommunityPost: vi.fn(),
  saveCommunityProfile: vi.fn(),
  toggleCommunityLike: vi.fn(),
  updateCommunityComment: vi.fn(),
  updateCommunityPost: vi.fn(),
}));

describe('CommunityPage', () => {
  beforeEach(() => {
    authState.user = null;
    vi.clearAllMocks();
  });

  it('게시판 분류와 빈 상태를 표시한다', async () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '이어잡 커뮤니티', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '커뮤니티 게시판' })).toBeInTheDocument();
    expect(await screen.findByText('아직 게시글이 없습니다.')).toBeInTheDocument();
  });

  it('프로젝트보기 화면과 통일된 상단 헤더 네비게이션을 표시한다', async () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>,
    );

    await screen.findByText('아직 게시글이 없습니다.');
    expect(screen.getByRole('button', { name: '프로젝트' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '내 제안' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '내 정보' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '더보기 열기' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '더보기 열기' }));
    expect(screen.queryByRole('menuitem', { name: /프로젝트 보러가기/ })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /이어잡 소개/ })).toBeInTheDocument();
  });

  it('비로그인 사용자가 글쓰기를 누르면 로그인 화면으로 유도한다', async () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>,
    );

    await screen.findByText('아직 게시글이 없습니다.');
    fireEvent.click(screen.getByRole('button', { name: '글쓰기' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/login?redirect=%2Fcommunity',
      expect.objectContaining({
        state: {
          loginRequiredMessage: '로그인 후 이용할 수 있어요.',
        },
      }),
    );
    await waitFor(() => expect(communityService.createCommunityPost).not.toHaveBeenCalled());
  });

  it('로그인 사용자가 익명 활동명을 설정한다', async () => {
    authState.user = { uid: 'user-1' };
    vi.mocked(communityService.getCommunityProfile).mockResolvedValue(null);
    vi.mocked(communityService.saveCommunityProfile).mockResolvedValue({ nickname: '경험나눔이' });

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>,
    );

    await screen.findByText('아직 게시글이 없습니다.');
    fireEvent.click(screen.getByRole('button', { name: '활동명 설정' }));
    fireEvent.change(screen.getByLabelText('활동명'), { target: { value: '경험나눔이' } });
    fireEvent.click(screen.getByRole('button', { name: '활동명 저장' }));

    await waitFor(() =>
      expect(communityService.saveCommunityProfile).toHaveBeenCalledWith('경험나눔이'),
    );
    expect(await screen.findByRole('button', { name: '경험나눔이' })).toBeInTheDocument();
  });

  it('자신이 작성한 댓글을 수정한다', async () => {
    authState.user = { uid: 'user-1' };
    vi.mocked(communityService.getCommunityProfile).mockResolvedValue({ nickname: '경험나눔이' });
    vi.mocked(communityService.listCommunityPosts).mockResolvedValue([
      {
        authorName: '작성자',
        category: 'experience',
        commentCount: 1,
        content: '게시글 본문',
        createdAt: '2026-09-04T00:00:00.000Z',
        id: 'post-1',
        likeCount: 0,
        likedByMe: false,
        ownedByMe: false,
        title: '첫 번째 글',
        updatedAt: '2026-09-04T00:00:00.000Z',
      },
    ]);
    vi.mocked(communityService.listCommunityComments).mockResolvedValue([
      {
        authorName: '경험나눔이',
        content: '원래 댓글',
        createdAt: '2026-09-04T00:00:00.000Z',
        id: 'comment-1',
        ownedByMe: true,
        updatedAt: '2026-09-04T00:00:00.000Z',
      },
    ]);
    vi.mocked(communityService.updateCommunityComment).mockResolvedValue({
      authorName: '경험나눔이',
      content: '수정된 댓글 내용',
      createdAt: '2026-09-04T00:00:00.000Z',
      id: 'comment-1',
      ownedByMe: true,
      updatedAt: '2026-09-04T00:01:00.000Z',
    });

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('원래 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    const input = screen.getByLabelText('댓글 수정 내용');
    expect(input).toHaveValue('원래 댓글');
    fireEvent.change(input, { target: { value: '수정된 댓글 내용' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(communityService.updateCommunityComment).toHaveBeenCalledWith(
        'post-1',
        'comment-1',
        '수정된 댓글 내용',
      ),
    );
    expect(await screen.findByText('수정된 댓글 내용')).toBeInTheDocument();
  });
});

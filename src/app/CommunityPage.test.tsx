import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommunityPage } from '@/app/CommunityPage';
import * as communityService from '@/services/communityService';

vi.mock('@/lib/authContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/services/communityService', () => ({
  createCommunityComment: vi.fn(),
  createCommunityPost: vi.fn(),
  deleteCommunityComment: vi.fn(),
  deleteCommunityPost: vi.fn(),
  listCommunityComments: vi.fn().mockResolvedValue([]),
  listCommunityPosts: vi.fn().mockResolvedValue([]),
  reportCommunityPost: vi.fn(),
  toggleCommunityLike: vi.fn(),
  updateCommunityPost: vi.fn(),
}));

describe('CommunityPage', () => {
  beforeEach(() => vi.clearAllMocks());

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

  it('비로그인 사용자가 글쓰기를 누르면 로그인 안내를 표시한다', async () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>,
    );

    await screen.findByText('아직 게시글이 없습니다.');
    fireEvent.click(screen.getByRole('button', { name: '글쓰기' }));
    expect(screen.getByText(/글쓰기와 참여는 로그인 후 이용할 수 있습니다/)).toBeInTheDocument();
    await waitFor(() => expect(communityService.createCommunityPost).not.toHaveBeenCalled());
  });
});

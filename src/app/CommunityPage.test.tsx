import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommunityPage } from '@/app/CommunityPage';
import * as communityService from '@/services/communityService';

const { authState } = vi.hoisted(() => ({ authState: { user: null as null | { uid: string } } }));

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
});

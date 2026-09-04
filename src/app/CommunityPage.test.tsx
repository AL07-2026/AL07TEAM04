import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { CommunityPage } from '@/app/CommunityPage';

describe('CommunityPage', () => {
  it('준비 중인 커뮤니티 범위와 의견 접수 주소를 정직하게 안내한다', () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '이어잡 커뮤니티', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('커뮤니티 운영 준비 중')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '개설 의견 보내기' })).toHaveAttribute(
      'href',
      'mailto:ieojab2026@gmail.com?subject=이어잡 커뮤니티 의견',
    );
  });
});

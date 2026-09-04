import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingPage } from '@/app/LandingPage';

const navigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
    user: { role: 'senior' },
  }),
}));

describe('LandingPage alignment rail', () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it('헤더와 모든 랜딩 섹션을 같은 반응형 좌측 기준선에 맞춘다', () => {
    const { container } = render(<LandingPage />);
    const headerRail = screen.getByRole('button', { name: '이어잡 첫 화면' }).parentElement;
    const sectionRails = Array.from(container.querySelectorAll('main > section')).map(
      (section) => section.firstElementChild,
    );

    expect(headerRail).toHaveClass('max-w-6xl', 'px-5', 'sm:px-8');
    expect(sectionRails).toHaveLength(4);
    sectionRails.forEach((rail) => {
      expect(rail).toHaveClass('max-w-6xl', 'px-5', 'sm:px-8');
    });
  });

  it('랜딩 헤더 로고는 공통 28px 높이를 사용한다', () => {
    render(<LandingPage />);

    expect(screen.getByRole('img', { name: '이어잡' })).toHaveClass('h-7');
  });

  it('프로젝트 이동을 독립 아이콘 대신 메뉴 첫 항목으로 제공한다', () => {
    render(<LandingPage />);

    expect(screen.queryByRole('button', { name: '프로젝트 둘러보기' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '더보기 열기' }));
    expect(screen.getAllByRole('menuitem')[0]).toHaveTextContent('프로젝트 보러가기');
  });

  it('히어로 영상이 별도 중앙 폭을 사용하지 않고 본문 레일 전체를 사용한다', () => {
    render(<LandingPage />);
    const videoFrame = screen.getByTitle(
      '시니어의 경험과 기업의 과제가 만나는 이어잡 소개 영상',
    ).parentElement;

    expect(videoFrame).not.toHaveClass('max-w-5xl', 'mx-auto');
    expect(videoFrame).toHaveClass('w-full');
  });
});

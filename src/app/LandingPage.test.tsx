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

    expect(headerRail).toHaveClass('site-rail');
    expect(sectionRails).toHaveLength(4);
    sectionRails.forEach((rail) => {
      expect(rail).toHaveClass('site-rail');
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

  it('서비스 특징 카드는 불필요한 순번 없이 아이콘과 내용만 표시한다', () => {
    render(<LandingPage />);
    const section = screen
      .getByRole('heading', { name: '경험을 프로젝트로 연결하는 세 가지 방식', level: 2 })
      .closest('section');

    expect(screen.queryByText('01')).not.toBeInTheDocument();
    expect(screen.queryByText('02')).not.toBeInTheDocument();
    expect(screen.queryByText('03')).not.toBeInTheDocument();
    expect(section?.querySelectorAll('article svg')).toHaveLength(3);
  });

  it('중복 영문 제목을 제거하고 한국어 제목만으로 정보 위계를 구성한다', () => {
    render(<LandingPage />);

    expect(screen.queryByText('Experience Meets Opportunity')).not.toBeInTheDocument();
    expect(screen.queryByText('Service Features')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: '경험을 프로젝트로 연결하는 세 가지 방식',
        level: 2,
      }),
    ).toHaveClass('mt-2', 'text-[1.375rem]', 'font-black', 'text-[#17212B]');
    expect(screen.getByText('이어잡의 서비스 특징')).toHaveClass('font-bold', 'text-[#F06B4F]');
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('mt-5', 'sm:mt-6');
  });

  it.each(['이어잡이 만드는 새로운 연결', '이어잡의 서비스 특징', '고용노동부 연계 혜택'])(
    '%s 섹션 라벨은 오렌지 색상을 유지하고 굵기를 두 단계 낮춘다',
    (label) => {
      render(<LandingPage />);

      expect(screen.getByText(label)).toHaveClass('font-bold', 'text-[#F06B4F]');
      expect(screen.getByText(label)).not.toHaveClass('font-black');
    },
  );

  it('로그인 상태에서 통일된 인재 회원 뱃지와 내 홈, 로그아웃 버튼을 표시한다', () => {
    render(<LandingPage />);

    expect(screen.getByText('인재 회원')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '내 홈으로 이동' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });
});

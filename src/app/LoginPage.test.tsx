import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as UiModule from '@/app/wireframe/Ui';
import { LoginPage, RollingBanner } from '@/app/LoginPage';

const navigate = vi.fn();
const signIn = vi.fn();
const signInWithGoogle = vi.fn();
const loginBannerImages = [
  '/login-banners/senior-field-manufacturing-quality.png',
  '/login-banners/senior-field-logistics-operations.png',
  '/login-banners/senior-field-facilities-energy.png',
  '/login-banners/senior-office-project-operations.png',
  '/login-banners/senior-office-digital-process.png',
];

vi.mock('react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useLocation: () => ({
    key: 'default',
    pathname: '/login',
    search: '',
    state: null,
  }),
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({
    adminRole: null,
    isAdmin: false,
    refreshAdminAccess: vi.fn(() => Promise.resolve(null)),
    signIn,
    signInWithGoogle,
    signOut: vi.fn(),
    user: null,
  }),
}));

vi.mock('@/app/wireframe/Ui', async (importOriginal) => {
  const actual = await importOriginal<typeof UiModule>();
  return {
    ...actual,
    useViewportMode: () => ({ mode: 'desktop' }),
  };
});

describe('LoginPage rememberMe persistence', () => {
  beforeEach(() => {
    navigate.mockReset();
    signIn.mockReset();
    signInWithGoogle.mockReset();
  });

  it('로그인 상태 유지 체크박스가 기본으로 체크되어 있다', () => {
    render(<LoginPage />);

    const checkbox = screen.getByLabelText('로그인 상태 유지');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
    expect(
      screen.getByText('공용 PC나 다른 사람의 기기에서는 체크를 해제해 주세요.'),
    ).toBeInTheDocument();
  });

  it('기본 로그인 행동 버튼에 이어잡 오렌지 색상을 사용한다', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: '인재로 로그인' })).toHaveClass(
      'border-[#D85A3F]',
      'bg-[#F06B4F]',
    );
  });

  it('공개 로그인 헤더와 더보기 버튼에 공통 글래스 표면을 사용한다', () => {
    render(<LoginPage />);

    expect(screen.getByRole('banner')).toHaveClass('site-header', 'site-glass-header');
    expect(screen.getByRole('button', { name: '더보기 열기' })).toHaveClass('site-glass-control');
  });

  it('체크 상태 유지 시 signIn 호출 시 rememberMe=true가 전달된다', async () => {
    signIn.mockResolvedValueOnce({
      email: 'test@example.com',
      name: '테스트',
      role: 'senior',
      uid: 'u-1',
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('이메일을 입력하세요'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('비밀번호를 입력하세요'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: '인재로 로그인' }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123', 'senior', true);
    });
  });

  it('체크 해제 후 로그인 시 signIn에 rememberMe=false가 전달된다', async () => {
    signIn.mockResolvedValueOnce({
      email: 'test@example.com',
      name: '테스트',
      role: 'senior',
      uid: 'u-1',
    });

    render(<LoginPage />);

    const checkbox = screen.getByLabelText('로그인 상태 유지');
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.change(screen.getByPlaceholderText('이메일을 입력하세요'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('비밀번호를 입력하세요'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: '인재로 로그인' }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123', 'senior', false);
    });
  });

  it('구글 로그인 버튼 클릭 시 현재 rememberMe 상태가 signInWithGoogle에 전달된다', async () => {
    signInWithGoogle.mockResolvedValueOnce({
      email: 'google@example.com',
      name: '구글사용자',
      role: 'senior',
      uid: 'g-1',
    });

    render(<LoginPage />);

    const checkbox = screen.getByLabelText('로그인 상태 유지');
    fireEvent.click(checkbox); // 체크 해제 (false)

    fireEvent.click(screen.getByRole('button', { name: /Google 계정으로 로그인/i }));

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalledWith('senior', false);
    });
  });
});

describe('LoginPage rolling banner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('로그인 배너 5장을 6.5초마다 순환하고 원본 비율 프레임을 유지한다', async () => {
    vi.useFakeTimers();
    render(<RollingBanner slideSet="login" variant="login-desktop" />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', loginBannerImages[0]);
    expect(image.parentElement).toHaveClass('aspect-[849/463]');
    expect(screen.getByLabelText('5개 배너 중 1번째')).toBeInTheDocument();

    for (let index = 1; index < loginBannerImages.length; index += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6_500);
      });
      expect(screen.getByRole('img')).toHaveAttribute('src', loginBannerImages[index]);
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_500);
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', loginBannerImages[0]);
  });

  it('모바일에서도 자동 순환하며 일시정지와 수동 이동을 제공한다', async () => {
    vi.useFakeTimers();
    render(<RollingBanner isCompact slideSet="login" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_500);
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', loginBannerImages[1]);

    fireEvent.click(screen.getByRole('button', { name: '배너 일시정지' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(13_000);
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', loginBannerImages[1]);

    fireEvent.click(screen.getByRole('button', { name: '다음 배너' }));
    expect(screen.getByRole('img')).toHaveAttribute('src', loginBannerImages[2]);
    fireEvent.click(screen.getByRole('button', { name: '이전 배너' }));
    expect(screen.getByRole('img')).toHaveAttribute('src', loginBannerImages[1]);
  });
});

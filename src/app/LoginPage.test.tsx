import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as UiModule from '@/app/wireframe/Ui';
import { LoginPage } from '@/app/LoginPage';

const navigate = vi.fn();
const signIn = vi.fn();
const signInWithGoogle = vi.fn();

vi.mock('react-router', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
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

    fireEvent.click(screen.getByRole('button', { name: '인재로 로그인 →' }));

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

    fireEvent.click(screen.getByRole('button', { name: '인재로 로그인 →' }));

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

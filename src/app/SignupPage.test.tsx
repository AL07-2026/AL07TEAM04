import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as UiModule from '@/app/wireframe/Ui';
import { SignupPage } from './SignupPage';

const navigate = vi.fn();
const setSearchParams = vi.fn();
let currentSearchParams = new URLSearchParams('role=senior');
let authState: {
  oauthRedirectCompleted: boolean;
  user: null | { email: string; name: string; role: 'company' | 'senior'; uid: string };
};

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigate,
  useSearchParams: () => [currentSearchParams, setSearchParams],
}));

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({
    checkEmailVerified: vi.fn(),
    oauthRedirectCompleted: authState.oauthRedirectCompleted,
    sendVerificationEmail: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    user: authState.user,
  }),
}));

vi.mock('@/app/wireframe/Ui', async (importOriginal) => {
  const actual = await importOriginal<typeof UiModule>();
  return {
    ...actual,
    useViewportMode: () => ({ mode: 'mobile' }),
  };
});

describe('SignupPage 모바일 OAuth 역할 보존', () => {
  beforeEach(() => {
    navigate.mockReset();
    setSearchParams.mockReset();
    currentSearchParams = new URLSearchParams('role=senior');
    authState = { oauthRedirectCompleted: false, user: null };
    setSearchParams.mockImplementation((updater: (current: URLSearchParams) => URLSearchParams) => {
      currentSearchParams = updater(currentSearchParams);
    });
  });

  it('회사 회원가입을 선택하면 외부 브라우저에 전달될 URL 역할도 company로 바꾼다', () => {
    render(<SignupPage />);

    fireEvent.click(screen.getByRole('button', { name: '회사 회원가입' }));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(currentSearchParams.get('role')).toBe('company');
  });

  it('Google redirect가 완료되면 실제 계정 역할의 다음 단계로 이동한다', async () => {
    authState = {
      oauthRedirectCompleted: true,
      user: {
        email: 'company@example.com',
        name: '테스트 회사',
        role: 'company',
        uid: 'company-1',
      },
    };

    render(<SignupPage />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/company-info', { replace: true }));
  });
});

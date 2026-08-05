import { fireEvent, render, screen } from '@testing-library/react';

import { App } from '@/app/App';

describe('통합 화면 라우팅', () => {
  it('로그인 화면에서 역할 선택 화면으로 이동한다', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(
      await screen.findByRole('heading', { name: '어떤 역할로 시작할까요?' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/role');
  });

  it('회원가입을 완료하면 역할 선택 화면으로 이동한다', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: '계정이 없나요? 회원가입' }));

    expect(await screen.findByRole('heading', { name: '회원가입' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/signup');

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '테스트 사용자' } });
    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }));

    expect(
      await screen.findByRole('heading', { name: '어떤 역할로 시작할까요?' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/role');
  });

  it('회사 역할을 선택하면 회사 기본정보 화면으로 이동한다', async () => {
    window.history.pushState({}, '', '/role');
    render(<App />);

    fireEvent.click(
      screen.getByRole('button', {
        name: '회사 - 프로젝트를 등록하고 제안을 확인합니다.',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(await screen.findByRole('heading', { name: '회사 기본정보' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/company-info');
  });

  it('인재 역할로 진행하면 기본 프로필 화면으로 이동한다', async () => {
    window.history.pushState({}, '', '/role');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(await screen.findByText('새로운 기회', { selector: 'strong' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/basic-profile');
  });
});

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
});

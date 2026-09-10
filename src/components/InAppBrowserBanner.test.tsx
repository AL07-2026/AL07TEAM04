import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InAppBrowserBanner } from './InAppBrowserBanner';

const browserMocks = vi.hoisted(() => ({
  isInAppBrowser: vi.fn(() => true),
  isKakaoTalk: vi.fn(() => true),
  openInExternalBrowser: vi.fn(() => true),
}));

vi.mock('@/lib/inAppBrowser', () => browserMocks);

describe('InAppBrowserBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    browserMocks.isInAppBrowser.mockReturnValue(true);
    browserMocks.isKakaoTalk.mockReturnValue(true);
    browserMocks.openInExternalBrowser.mockReturnValue(true);
  });

  it('카카오톡에서는 모바일에서도 줄바꿈 가능한 외부 브라우저 안내를 표시한다', () => {
    render(<InAppBrowserBanner />);

    const banner = screen.getByRole('complementary', { name: '인앱 브라우저 안내' });
    expect(banner).toHaveClass('flex-col', 'sm:flex-row');
    expect(banner).not.toHaveClass('sticky');
    expect(screen.getByText('카카오톡 브라우저로 접속 중')).toBeInTheDocument();
  });

  it('기본 브라우저 버튼은 현재 query와 hash를 포함한 주소를 전달한다', () => {
    window.history.replaceState({}, '', '/login?role=company#google-login');
    render(<InAppBrowserBanner />);

    fireEvent.click(screen.getByRole('button', { name: /기본 브라우저로 열기/ }));

    expect(browserMocks.openInExternalBrowser).toHaveBeenCalledWith(
      expect.stringContaining('/login?role=company#google-login'),
    );
    expect(screen.getByText('기본 브라우저 열기를 시도했습니다.')).toBeInTheDocument();
  });

  it('안내를 닫으면 같은 세션에서는 다시 표시하지 않는다', () => {
    const first = render(<InAppBrowserBanner />);
    fireEvent.click(screen.getByRole('button', { name: '인앱 브라우저 안내 닫기' }));
    expect(screen.queryByRole('complementary', { name: '인앱 브라우저 안내' })).toBeNull();

    first.unmount();
    render(<InAppBrowserBanner />);
    expect(screen.queryByRole('complementary', { name: '인앱 브라우저 안내' })).toBeNull();
  });
});

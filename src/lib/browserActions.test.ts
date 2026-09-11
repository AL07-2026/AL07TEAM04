import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  copyTextToClipboard,
  getSafeWebUrl,
  openExternalUrl,
  prepareAsyncNavigation,
  type BrowserWindowLike,
} from './browserActions';

function createLegacyCopyDocument(result: boolean) {
  const copyDocument = document.implementation.createHTMLDocument('clipboard test');
  const execCommand = vi.fn(() => result);
  Object.defineProperty(copyDocument, 'execCommand', {
    configurable: true,
    value: execCommand,
  });
  return { copyDocument, execCommand };
}

function createBrowserWindow({ popup = null }: { popup?: Window | null } = {}) {
  const assign = vi.fn();
  const open = vi.fn(() => popup);
  const browserWindow = {
    location: { assign },
    open,
  } as unknown as BrowserWindowLike;

  return { assign, browserWindow, open };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('copyTextToClipboard', () => {
  it('Clipboard API가 성공한 경우에만 완료된다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { copyDocument, execCommand } = createLegacyCopyDocument(true);

    await copyTextToClipboard('복사할 내용', {
      document: copyDocument,
      navigator: { clipboard: { writeText } } as unknown as Navigator,
    });

    expect(writeText).toHaveBeenCalledWith('복사할 내용');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('인앱 브라우저에서 Clipboard API가 거부되면 legacy copy로 대체한다', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const { copyDocument, execCommand } = createLegacyCopyDocument(true);

    await copyTextToClipboard('카카오톡 복사', {
      document: copyDocument,
      navigator: { clipboard: { writeText } } as unknown as Navigator,
    });

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copyDocument.querySelector('textarea')).toBeNull();
  });

  it('모든 복사 방식이 실패하면 성공으로 오인하지 않도록 오류를 반환한다', async () => {
    const { copyDocument } = createLegacyCopyDocument(false);

    await expect(
      copyTextToClipboard('', {
        document: copyDocument,
        navigator: {} as Navigator,
      }),
    ).rejects.toThrow('클립보드에 복사하지 못했습니다.');
  });
});

describe('browser navigation helpers', () => {
  it('외부 주소를 noopener/noreferrer 새 창으로 연다', () => {
    const popup = { opener: {} } as Window;
    const { assign, browserWindow, open } = createBrowserWindow({ popup });

    expect(openExternalUrl('https://example.com/jobs/1', browserWindow)).toBe('new-tab');
    expect(open).toHaveBeenCalledWith(
      'https://example.com/jobs/1',
      '_blank',
      'noopener,noreferrer',
    );
    expect(popup.opener).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('새 창이 차단되면 같은 탭으로 이동한다', () => {
    const { assign, browserWindow } = createBrowserWindow();

    expect(openExternalUrl('https://example.com/jobs/2', browserWindow)).toBe('same-tab');
    expect(assign).toHaveBeenCalledWith('https://example.com/jobs/2');
  });

  it('수집 데이터에 실행 가능한 프로토콜이 들어오면 열지 않는다', () => {
    const { assign, browserWindow, open } = createBrowserWindow();

    expect(() => openExternalUrl('javascript:alert(1)', browserWindow)).toThrow(
      '안전하지 않거나 올바르지 않은 주소는 열 수 없습니다.',
    );
    expect(open).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('링크 렌더링용 주소도 http와 https만 허용한다', () => {
    expect(getSafeWebUrl('https://example.com/jobs/3')).toBe('https://example.com/jobs/3');
    expect(getSafeWebUrl('javascript:alert(1)')).toBeNull();
    expect(getSafeWebUrl('not a url')).toBeNull();
  });

  it('인앱 브라우저의 비동기 파일 URL은 새 창을 예약하지 않고 같은 탭에서 연다', () => {
    const { assign, browserWindow, open } = createBrowserWindow();

    const navigation = prepareAsyncNavigation({ browserWindow, preferSameTab: true });
    navigation.navigate('https://storage.example.com/resume.pdf');

    expect(open).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('https://storage.example.com/resume.pdf');
  });

  it('일반 브라우저는 사용자 클릭 시 새 창을 먼저 예약해 비동기 URL을 연다', () => {
    const replace = vi.fn();
    const close = vi.fn();
    const popup = {
      close,
      closed: false,
      location: { replace },
      opener: {},
    } as unknown as Window;
    const { assign, browserWindow, open } = createBrowserWindow({ popup });

    const navigation = prepareAsyncNavigation({ browserWindow, preferSameTab: false });
    navigation.navigate('https://storage.example.com/resume.pdf');

    expect(open).toHaveBeenCalledWith('about:blank', '_blank', 'noopener,noreferrer');
    expect(popup.opener).toBeNull();
    expect(replace).toHaveBeenCalledWith('https://storage.example.com/resume.pdf');
    expect(assign).not.toHaveBeenCalled();

    navigation.cancel();
    expect(close).not.toHaveBeenCalled();
  });

  it('비동기 URL 확인이 실패하면 미리 연 빈 창을 닫는다', () => {
    const close = vi.fn();
    const popup = {
      close,
      closed: false,
      location: { replace: vi.fn() },
      opener: null,
    } as unknown as Window;
    const { browserWindow } = createBrowserWindow({ popup });

    const navigation = prepareAsyncNavigation({ browserWindow, preferSameTab: false });
    navigation.cancel();

    expect(close).toHaveBeenCalledTimes(1);
  });
});

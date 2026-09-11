export interface BrowserWindowLike {
  location: Pick<Location, 'assign'>;
  open(url?: string | URL, target?: string, features?: string): Window | null;
}

interface ClipboardEnvironment {
  document?: Document;
  navigator?: Navigator;
}

interface AsyncNavigationOptions {
  browserWindow?: BrowserWindowLike;
  preferSameTab: boolean;
}

export interface PreparedAsyncNavigation {
  cancel(): void;
  navigate(url: string): void;
}

function getBrowserWindow(browserWindow?: BrowserWindowLike): BrowserWindowLike {
  if (browserWindow) return browserWindow;
  if (typeof window !== 'undefined') return window;
  throw new Error('브라우저에서만 주소를 열 수 있습니다.');
}

export function getSafeWebUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return null;
  }
  return parsedUrl.toString();
}

function requireSafeWebUrl(url: string): string {
  const safeUrl = getSafeWebUrl(url);
  if (!safeUrl) throw new Error('안전하지 않거나 올바르지 않은 주소는 열 수 없습니다.');
  return safeUrl;
}

/**
 * Clipboard API가 제한된 모바일 WebView에서는 textarea + execCommand로 한 번 더 시도한다.
 * 두 방식 모두 실패하면 호출자가 성공 안내를 표시하지 않도록 오류를 반환한다.
 */
export async function copyTextToClipboard(
  text: string,
  environment: ClipboardEnvironment = {},
): Promise<void> {
  const navigatorRef =
    environment.navigator ?? (typeof navigator !== 'undefined' ? navigator : undefined);
  const documentRef =
    environment.document ?? (typeof document !== 'undefined' ? document : undefined);

  if (navigatorRef?.clipboard?.writeText) {
    try {
      await navigatorRef.clipboard.writeText(text);
      return;
    } catch {
      // KakaoTalk 같은 WebView에서는 권한 오류가 날 수 있으므로 legacy 방식을 이어서 시도한다.
    }
  }

  if (!documentRef?.body || typeof documentRef.execCommand !== 'function') {
    throw new Error('클립보드에 복사하지 못했습니다.');
  }

  const previouslyFocused = documentRef.activeElement as HTMLElement | null;
  const textarea = documentRef.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute('aria-hidden', 'true');
  Object.assign(textarea.style, {
    fontSize: '16px',
    height: '1px',
    left: '-9999px',
    opacity: '0',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: '1px',
  });

  let copied: boolean;
  try {
    documentRef.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    copied = documentRef.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    try {
      previouslyFocused?.focus({ preventScroll: true });
    } catch {
      // 포커스 복구 실패는 복사 결과에 영향을 주지 않는다.
    }
  }

  if (!copied) {
    throw new Error('클립보드에 복사하지 못했습니다.');
  }
}

/** 새 탭 열기가 차단된 WebView에서는 같은 탭으로 이동한다. */
export function openExternalUrl(
  url: string,
  browserWindow?: BrowserWindowLike,
): 'new-tab' | 'same-tab' {
  if (!url.trim()) throw new Error('열 수 있는 주소가 없습니다.');
  const safeUrl = requireSafeWebUrl(url);
  const targetWindow = getBrowserWindow(browserWindow);

  let popup: Window | null;
  try {
    popup = targetWindow.open(safeUrl, '_blank', 'noopener,noreferrer');
  } catch {
    popup = null;
  }

  if (popup) {
    try {
      popup.opener = null;
    } catch {
      // noopener 기능 문자열이 이미 opener 연결을 차단한다.
    }
    return 'new-tab';
  }

  targetWindow.location.assign(safeUrl);
  return 'same-tab';
}

/**
 * 비동기로 파일 URL을 구하기 전에 일반 브라우저에서는 빈 탭을 예약한다.
 * 인앱 브라우저이거나 팝업이 차단되면 URL 확인 후 현재 탭에서 연다.
 */
export function prepareAsyncNavigation({
  browserWindow,
  preferSameTab,
}: AsyncNavigationOptions): PreparedAsyncNavigation {
  const targetWindow = getBrowserWindow(browserWindow);
  let popup: Window | null = null;
  let settled = false;

  if (!preferSameTab) {
    try {
      popup = targetWindow.open('about:blank', '_blank', 'noopener,noreferrer');
      if (popup) popup.opener = null;
    } catch {
      popup = null;
    }
  }

  const cancel = () => {
    if (settled) return;
    settled = true;
    if (popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // 이미 닫힌 탭은 별도 처리가 필요 없다.
      }
    }
  };

  return {
    cancel,
    navigate(url: string) {
      if (settled) return;

      let safeUrl: string;
      try {
        safeUrl = requireSafeWebUrl(url);
      } catch (error) {
        cancel();
        throw error;
      }

      if (popup && !popup.closed) {
        try {
          popup.location.replace(safeUrl);
          settled = true;
          return;
        } catch {
          // WebView가 빈 탭 제어를 막으면 현재 탭으로 대체한다.
        }
      }

      targetWindow.location.assign(safeUrl);
      settled = true;
    },
  };
}

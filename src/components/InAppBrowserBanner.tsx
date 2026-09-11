import { ExternalLink, Globe2, X } from 'lucide-react';
import { useState } from 'react';

import { isInAppBrowser, isKakaoTalk, openInExternalBrowser } from '@/lib/inAppBrowser';

export function InAppBrowserBanner() {
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const isDismissed = sessionStorage.getItem('eojob_inapp_banner_dismissed') === 'true';
      return !isDismissed && isInAppBrowser();
    } catch {
      return isInAppBrowser();
    }
  });
  const [handoffMessage, setHandoffMessage] = useState('');

  const [isKakao] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isKakaoTalk();
  });

  if (!showBanner) return null;

  const handleOpenExternal = () => {
    const opened = openInExternalBrowser(window.location.href);
    setHandoffMessage(
      opened
        ? '기본 브라우저 열기를 시도했습니다.'
        : '카카오톡 메뉴에서 다른 브라우저로 열어 주세요.',
    );
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('eojob_inapp_banner_dismissed', 'true');
    } catch {
      // 일부 WebView는 sessionStorage를 막으므로 현재 화면에서만 닫는다.
    }
  };

  return (
    <aside
      aria-label="인앱 브라우저 안내"
      className="relative z-50 flex w-full flex-col items-stretch gap-2.5 border-b border-[#F06B4F]/30 bg-[#FFF5F2] pb-2.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.625rem,env(safe-area-inset-top))] text-[#173F3A] shadow-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2 text-xs sm:items-center sm:text-sm">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#B84734] text-white">
          <Globe2 aria-hidden="true" className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2">
          <span className="font-bold text-[#E05A3E]">
            {isKakao ? '카카오톡 브라우저로 접속 중' : '인앱 브라우저로 접속 중'}
          </span>
          <span className="hidden text-[#53606E] sm:inline">|</span>
          <span className="block text-[12px] leading-5 text-[#53606E] break-keep sm:text-[13px]">
            구글 보안 정책으로 인해 크롬/사파리에서 더 원활하게 로그인하실 수 있습니다.
          </span>
          {handoffMessage ? (
            <span
              aria-live="polite"
              className="block text-[11px] font-bold text-[#B84734] sm:hidden"
            >
              {handoffMessage}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        <button
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#173F3A] px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#235851] active:scale-95 sm:flex-none"
          onClick={handleOpenExternal}
          type="button"
        >
          <span>기본 브라우저로 열기</span>
          <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
        </button>
        <button
          aria-label="인앱 브라우저 안내 닫기"
          className="flex size-11 items-center justify-center rounded-full text-[#667684] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
          onClick={handleDismiss}
          type="button"
        >
          <X aria-hidden="true" className="size-4" strokeWidth={2.25} />
        </button>
      </div>
    </aside>
  );
}

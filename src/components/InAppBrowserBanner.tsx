import { ExternalLink, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

import { isInAppBrowser, isKakaoTalk, openInExternalBrowser } from '@/lib/inAppBrowser';

export function InAppBrowserBanner() {
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isDismissed = sessionStorage.getItem('eojob_inapp_banner_dismissed') === 'true';
    return !isDismissed && isInAppBrowser();
  });

  const [isKakao] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isKakaoTalk();
  });

  if (!showBanner) return null;

  const handleOpenExternal = () => {
    openInExternalBrowser(window.location.href);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('eojob_inapp_banner_dismissed', 'true');
  };

  return (
    <aside
      aria-label="인앱 브라우저 안내"
      className="sticky top-0 z-50 flex w-full items-center justify-between gap-3 border-b border-[#F06B4F]/30 bg-[#FFF5F2] px-4 py-2.5 text-[#173F3A] shadow-xs backdrop-blur-md"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 text-xs sm:text-sm">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F06B4F] text-white">
          <Sparkles className="size-3.5" />
        </span>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="font-bold text-[#E05A3E]">
            {isKakao ? '카카오톡 브라우저로 접속 중' : '인앱 브라우저로 접속 중'}
          </span>
          <span className="hidden text-[#53606E] sm:inline">|</span>
          <span className="text-[12px] text-[#53606E] break-keep sm:text-[13px]">
            구글 보안 정책으로 인해 크롬/사파리에서 더 원활하게 로그인하실 수 있습니다.
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#173F3A] px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#235851] active:scale-95"
          onClick={handleOpenExternal}
          type="button"
        >
          <span>기본 브라우저로 열기</span>
          <ExternalLink className="size-3.5" />
        </button>
        <button
          aria-label="닫기"
          className="flex size-7 items-center justify-center rounded-full text-[#7A8A99] hover:bg-black/5"
          onClick={handleDismiss}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
}

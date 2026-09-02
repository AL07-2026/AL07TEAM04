/**
 * 인앱 브라우저(카카오톡, 인스타그램, 네이버, 페이스북 등) 감지 및 외부 브라우저 탈출 유틸리티
 */

export function getUserAgent(customUa?: string): string {
  if (customUa !== undefined) return customUa;
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent;
  }
  return '';
}

/**
 * 카카오톡 인앱 브라우저 여부 감지
 */
export function isKakaoTalk(customUa?: string): boolean {
  const ua = getUserAgent(customUa);
  return /KAKAOTALK/i.test(ua);
}

/**
 * 일반 인앱 브라우저(카카오톡, 인스타, 페이스북, 라인, 네이버앱 등) 여부 감지
 */
export function isInAppBrowser(customUa?: string): boolean {
  const ua = getUserAgent(customUa);
  return /KAKAOTALK|Instagram|FB_IAB|FB4A|FBAN|FBIOS|NAVER|Line|DaumApps/i.test(ua);
}

/**
 * 안드로이드 환경 여부 감지
 */
export function isAndroid(customUa?: string): boolean {
  const ua = getUserAgent(customUa);
  return /Android/i.test(ua);
}

/**
 * iOS(iPhone, iPad, iPod) 환경 여부 감지
 */
export function isIOS(customUa?: string): boolean {
  const ua = getUserAgent(customUa);
  return /iPhone|iPad|iPod/i.test(ua);
}

/**
 * 환경에 맞는 외부 브라우저 호출 URL/스킴 반환
 */
export function getExternalBrowserUrl(
  targetUrl: string = typeof window !== 'undefined' ? window.location.href : '',
  customUa?: string,
): string {
  if (!targetUrl) return '';

  const ua = getUserAgent(customUa);

  // 1. 카카오톡 인앱 브라우저인 경우 (카카오톡 전용 외부 브라우저 스킴)
  if (isKakaoTalk(ua)) {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`;
  }

  // 2. 안드로이드 일반 인앱 브라우저인 경우 (Chrome Intent 스킴)
  if (isAndroid(ua)) {
    const cleanUrl = targetUrl.replace(/^https?:\/\//i, '');
    return `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  // 3. iOS 또는 기타 환경
  return targetUrl;
}

/**
 * 외부 브라우저(Chrome / Safari / Samsung Internet 등)로 현재 페이지 열기
 */
export function openInExternalBrowser(
  targetUrl: string = typeof window !== 'undefined' ? window.location.href : '',
  customUa?: string,
): boolean {
  if (typeof window === 'undefined' || !targetUrl) return false;

  const externalUrl = getExternalBrowserUrl(targetUrl, customUa);
  try {
    window.location.href = externalUrl;
    return true;
  } catch {
    return false;
  }
}

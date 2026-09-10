import { describe, expect, it } from 'vitest';
import {
  getExternalBrowserUrl,
  isAndroid,
  isIOS,
  isInAppBrowser,
  isKakaoTalk,
  openInExternalBrowser,
} from './inAppBrowser';

describe('inAppBrowser utility', () => {
  const KAKAO_ANDROID_UA =
    'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 KAKAOTALK/10.8.3 (INAPP)';
  const KAKAO_IOS_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1 KAKAOTALK/10.8.2 (INAPP)';
  const CHROME_ANDROID_UA =
    'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  const SAFARI_IOS_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
  const INSTAGRAM_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.19.108';

  it('카카오톡 인앱 브라우저를 올바르게 감지한다', () => {
    expect(isKakaoTalk(KAKAO_ANDROID_UA)).toBe(true);
    expect(isKakaoTalk(KAKAO_IOS_UA)).toBe(true);
    expect(isKakaoTalk(CHROME_ANDROID_UA)).toBe(false);
    expect(isKakaoTalk(SAFARI_IOS_UA)).toBe(false);
  });

  it('일반 인앱 브라우저(카카오톡, 인스타 등)를 감지한다', () => {
    expect(isInAppBrowser(KAKAO_ANDROID_UA)).toBe(true);
    expect(isInAppBrowser(INSTAGRAM_UA)).toBe(true);
    expect(isInAppBrowser(CHROME_ANDROID_UA)).toBe(false);
    expect(isInAppBrowser(SAFARI_IOS_UA)).toBe(false);
  });

  it('Android 및 iOS 환경을 올바르게 감지한다', () => {
    expect(isAndroid(KAKAO_ANDROID_UA)).toBe(true);
    expect(isAndroid(SAFARI_IOS_UA)).toBe(false);
    expect(isIOS(KAKAO_IOS_UA)).toBe(true);
    expect(isIOS(CHROME_ANDROID_UA)).toBe(false);
  });

  it('카카오톡 인앱 브라우저에서 외부 브라우저 호출 스킴을 올바르게 생성한다', () => {
    const targetUrl = 'https://eojob.web.app/login';
    const externalUrl = getExternalBrowserUrl(targetUrl, KAKAO_ANDROID_UA);
    expect(externalUrl).toBe(
      'kakaotalk://web/openExternal?url=https%3A%2F%2Feojob.web.app%2Flogin',
    );

    const fakeLocation = { href: targetUrl };
    const result = openInExternalBrowser(targetUrl, KAKAO_ANDROID_UA, fakeLocation);
    expect(result).toBe(true);
    expect(fakeLocation.href).toBe(externalUrl);
  });

  it('안드로이드 일반 인앱 브라우저에서 Chrome Intent 스킴을 올바르게 생성한다', () => {
    const targetUrl = 'https://eojob.web.app/login';
    const externalUrl = getExternalBrowserUrl(targetUrl, INSTAGRAM_UA + ' Android');
    expect(externalUrl).toBe(
      'intent://eojob.web.app/login#Intent;scheme=https;package=com.android.chrome;end',
    );

    const fakeLocation = { href: targetUrl };
    const result = openInExternalBrowser(targetUrl, INSTAGRAM_UA + ' Android', fakeLocation);
    expect(result).toBe(true);
    expect(fakeLocation.href).toBe(externalUrl);
  });
});

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { Capacitor } from '@capacitor/core';

/**
 * App Check（未設定時はスキップして既存動作を維持）。
 * 本番: VITE_APPCHECK_RECAPTCHA_SITE_KEY
 * 開発/審査: VITE_APPCHECK_DEBUG_TOKEN（Console で登録したデバッグトークン）
 */
export function initAppCheck(app) {
  if (typeof window === 'undefined') return;

  const siteKey = import.meta.env.VITE_APPCHECK_RECAPTCHA_SITE_KEY?.trim();
  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN?.trim();

  if (debugToken) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  if (!siteKey) {
    if (import.meta.env.DEV) {
      console.warn(
        '[App Check] VITE_APPCHECK_RECAPTCHA_SITE_KEY が未設定のため App Check をスキップします'
      );
    }
    return;
  }

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    if (import.meta.env.DEV) {
      console.info(
        `[App Check] 初期化しました (${Capacitor.isNativePlatform() ? 'native' : 'web'})`
      );
    }
  } catch (err) {
    console.warn('[App Check] 初期化に失敗しました:', err);
  }
}

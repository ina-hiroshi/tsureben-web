import { Capacitor } from '@capacitor/core';

/** Google 公式テスト ID（開発・審査用） */
export const ADMOB_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
export const ADMOB_TEST_IOS_BANNER_ID = 'ca-app-pub-3940256099942544/2934735716';
export const ADMOB_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const ADMOB_TEST_ANDROID_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

const ADMOB_TEST_BANNER_IDS = new Set([
  ADMOB_TEST_IOS_BANNER_ID,
  ADMOB_TEST_ANDROID_BANNER_ID,
]);

export function getAdMobIosBannerId() {
  return import.meta.env.VITE_ADMOB_IOS_BANNER_ID || ADMOB_TEST_IOS_BANNER_ID;
}

export function getAdMobAndroidBannerId() {
  return import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID || ADMOB_TEST_ANDROID_BANNER_ID;
}

/** 現在のネイティブプラットフォーム向けバナー ID */
export function getAdMobNativeBannerId() {
  if (Capacitor.getPlatform() === 'android') {
    return getAdMobAndroidBannerId();
  }
  return getAdMobIosBannerId();
}

export function isAdMobTestBannerId(adId) {
  return ADMOB_TEST_BANNER_IDS.has(adId);
}

/** TestFlight / 開発中は Google 公式テスト広告を使う（app-ads.txt 未承認時など） */
export function shouldUseAdMobTestMode(adId) {
  return (
    import.meta.env.DEV ||
    isAdMobTestBannerId(adId) ||
    import.meta.env.VITE_ADMOB_FORCE_TEST === 'true'
  );
}

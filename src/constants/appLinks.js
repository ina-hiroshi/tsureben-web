// App Store Connect で発行された App Apple ID（数字）に差し替えてください。
export const APP_STORE_APP_ID = '';

/** Google Play オープンテスト参加リンク（Play Console で確認） */
export const PLAY_STORE_OPEN_TEST_URL =
  'https://play.google.com/apps/testing/com.tsureben.app';

export function getAppStoreUrl() {
  if (APP_STORE_APP_ID) {
    return `https://apps.apple.com/app/id${APP_STORE_APP_ID}`;
  }
  return null;
}

export function getPlayStoreOpenTestUrl() {
  return PLAY_STORE_OPEN_TEST_URL;
}

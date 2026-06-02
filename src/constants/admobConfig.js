/** Google 公式テスト ID（開発・審査用） */
export const ADMOB_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
export const ADMOB_TEST_IOS_BANNER_ID = 'ca-app-pub-3940256099942544/2934735716';

export function getAdMobIosBannerId() {
  return import.meta.env.VITE_ADMOB_IOS_BANNER_ID || ADMOB_TEST_IOS_BANNER_ID;
}

export function isAdMobTestBannerId(adId) {
  return adId === ADMOB_TEST_IOS_BANNER_ID;
}

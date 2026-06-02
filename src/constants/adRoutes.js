/** 下部バナー広告を表示するルート（第一弾） */
export const AD_BANNER_ROUTES = ['/home', '/studyplan', '/studyrecord', '/turebenmate'];

export function isAdBannerRoute(pathname) {
  return AD_BANNER_ROUTES.includes(pathname);
}

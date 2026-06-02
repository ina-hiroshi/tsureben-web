// App Store Connect で発行された App Apple ID（数字）に差し替えてください。
export const APP_STORE_APP_ID = '';

export function getAppStoreUrl() {
  if (APP_STORE_APP_ID) {
    return `https://apps.apple.com/app/id${APP_STORE_APP_ID}`;
  }
  return null;
}

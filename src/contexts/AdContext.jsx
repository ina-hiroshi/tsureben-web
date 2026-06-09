import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AdMob, MaxAdContentRating } from '@capacitor-community/admob';
import { getAdMobNativeBannerId, shouldUseAdMobTestMode } from '../constants/admobConfig';
import { isNativeMobile } from '../utils/platformAccess';

const AdContext = createContext(null);

/** バナー読み込み前の下部余白見積もり（px） */
export const AD_BANNER_RESERVE_HEIGHT = 50;

export function AdProvider({ children }) {
  const [initialized, setInitialized] = useState(!isNativeMobile());
  const [bannerHeight, setBannerHeight] = useState(0);

  useEffect(() => {
    if (!isNativeMobile()) return;

    let active = true;
    const adId = getAdMobNativeBannerId();

    AdMob.initialize({
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      maxAdContentRating: MaxAdContentRating.General,
      initializeForTesting: shouldUseAdMobTestMode(adId),
    })
      .catch((err) => {
        console.warn('AdMob initialize failed:', err);
      })
      .finally(() => {
        if (active) setInitialized(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const reportBannerHeight = useCallback((height) => {
    setBannerHeight(typeof height === 'number' && height > 0 ? height : 0);
  }, []);

  const value = useMemo(
    () => ({
      initialized,
      bannerHeight,
      reportBannerHeight,
    }),
    [initialized, bannerHeight, reportBannerHeight]
  );

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAdContext() {
  return useContext(AdContext);
}

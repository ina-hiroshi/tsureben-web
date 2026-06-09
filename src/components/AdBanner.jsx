import { useEffect, useRef } from 'react';
import {
  AdMob,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
} from '@capacitor-community/admob';
import { getAdMobNativeBannerId, shouldUseAdMobTestMode } from '../constants/admobConfig';
import { AD_BANNER_RESERVE_HEIGHT, useAdContext } from '../contexts/AdContext';
import { isNativeMobile } from '../utils/platformAccess';

async function ensureAdMobInitialized(adId) {
  await AdMob.initialize({
    tagForChildDirectedTreatment: true,
    tagForUnderAgeOfConsent: true,
    maxAdContentRating: MaxAdContentRating.General,
    initializeForTesting: shouldUseAdMobTestMode(adId),
  });
}

export default function AdBanner() {
  const { reportBannerHeight } = useAdContext();
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isNativeMobile()) return undefined;

    mountedRef.current = true;
    const adId = getAdMobNativeBannerId();
    const listeners = [];

    const setup = async () => {
      try {
        await ensureAdMobInitialized(adId);

        const sizeListener = await AdMob.addListener(
          BannerAdPluginEvents.SizeChanged,
          (info) => {
            if (!mountedRef.current) return;
            reportBannerHeight(info?.height ?? 0);
          }
        );
        listeners.push(sizeListener);

        const failListener = await AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          (info) => {
            if (!mountedRef.current) return;
            console.warn('AdBanner: failed to load', info);
            reportBannerHeight(AD_BANNER_RESERVE_HEIGHT);
          }
        );
        listeners.push(failListener);

        reportBannerHeight(AD_BANNER_RESERVE_HEIGHT);

        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          isTesting: shouldUseAdMobTestMode(adId),
          npa: true,
        });
      } catch (err) {
        console.warn('AdBanner: showBanner failed', err);
        if (mountedRef.current) reportBannerHeight(AD_BANNER_RESERVE_HEIGHT);
      }
    };

    setup();

    return () => {
      mountedRef.current = false;
      reportBannerHeight(0);
      listeners.forEach((handle) => {
        handle.remove().catch(() => {});
      });
      AdMob.removeBanner().catch(() => {});
    };
  }, [reportBannerHeight]);

  return null;
}

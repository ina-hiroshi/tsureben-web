import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';
import { getAdMobIosBannerId, isAdMobTestBannerId } from '../constants/admobConfig';
import { AD_BANNER_RESERVE_HEIGHT, useAdContext } from '../contexts/AdContext';

export default function AdBanner() {
  const { initialized, reportBannerHeight } = useAdContext();
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !initialized) return undefined;

    mountedRef.current = true;
    const adId = getAdMobIosBannerId();
    const listeners = [];

    const setup = async () => {
      try {
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
          () => {
            if (!mountedRef.current) return;
            reportBannerHeight(0);
          }
        );
        listeners.push(failListener);

        reportBannerHeight(AD_BANNER_RESERVE_HEIGHT);

        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          isTesting: import.meta.env.DEV || isAdMobTestBannerId(adId),
          npa: true,
        });
      } catch (err) {
        console.warn('AdBanner: showBanner failed', err);
        if (mountedRef.current) reportBannerHeight(0);
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
  }, [initialized, reportBannerHeight]);

  return null;
}

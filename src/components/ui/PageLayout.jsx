import { useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import StudyTimerMiniBar from '../StudyTimerMiniBar';
import AdBanner from '../AdBanner';
import { isAdBannerRoute } from '../../constants/adRoutes';
import { AD_BANNER_RESERVE_HEIGHT, useAdContext } from '../../contexts/AdContext';
import { useAdEligibility } from '../../hooks/useAdEligibility';

/** モバイルは中央寄せ max-w-2xl、md+ はサイドバー横の残り幅いっぱい */
const MAIN_WIDTH = {
  default: 'max-w-2xl mx-auto md:max-w-none md:mx-0',
  wide: 'max-w-2xl mx-auto md:max-w-none md:mx-0',
  narrow: 'max-w-2xl mx-auto md:max-w-xl md:mx-auto',
  settings: 'max-w-2xl mx-auto md:max-w-none md:mx-0 lg:max-w-6xl lg:mx-auto',
};

export default function PageLayout({
  children,
  showNav = true,
  className = '',
  contentWidth = 'default',
}) {
  const mainWidthClass = MAIN_WIDTH[contentWidth] || MAIN_WIDTH.default;
  const location = useLocation();
  const { eligible: adEligible } = useAdEligibility();
  const { bannerHeight } = useAdContext() ?? {};
  const showAdSlot = adEligible && isAdBannerRoute(location.pathname);
  const adReservePx =
    showAdSlot && bannerHeight > 0 ? bannerHeight : showAdSlot ? AD_BANNER_RESERVE_HEIGHT : 0;

  return (
    <div
      className={`min-h-dvh flex flex-col md:flex-row bg-tsure-bg text-tsure-on-primary md:pb-0 ${className}`}
      style={{
        paddingBottom: showAdSlot
          ? `calc(1rem + ${adReservePx}px + var(--safe-bottom))`
          : 'calc(1rem + var(--safe-bottom))',
      }}
    >
      {showNav && <AppSidebar />}
      <div className="flex-1 flex flex-col min-w-0">
      {showNav && <AppHeader />}
      <div className="shrink-0">
        {showNav && <StudyTimerMiniBar />}
      </div>
      <main
          className={`flex-1 w-full px-4 md:px-6 lg:px-8 pb-4 ${
            showNav
              ? 'pt-1 md:pt-0'
              : 'pt-[calc(var(--safe-top)+1rem)] md:pt-8 flex flex-col justify-center sm:justify-start'
          } ${mainWidthClass}`}
        >
          {children}
        </main>
        {showAdSlot && <AdBanner key={location.pathname} />}
      </div>
    </div>
  );
}

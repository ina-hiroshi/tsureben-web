import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import StudyTimerMiniBar from '../StudyTimerMiniBar';

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

  return (
    <div
      className={`min-h-full flex flex-col md:flex-row md:min-h-dvh bg-tsure-bg text-tsure-on-primary pb-[calc(1rem+var(--safe-bottom))] md:pb-0 ${className}`}
    >
      {showNav && <AppSidebar />}
      <div className="flex-1 flex flex-col min-w-0">
      {showNav && <AppHeader />}
      <div className="shrink-0">
        {showNav && <StudyTimerMiniBar />}
      </div>
      <main
          className={`flex-1 w-full px-4 md:px-6 lg:px-8 pt-1 md:pt-0 pb-4 ${mainWidthClass}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

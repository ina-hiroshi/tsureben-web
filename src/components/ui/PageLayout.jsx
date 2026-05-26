import AppHeader from './AppHeader';

export default function PageLayout({ children, showNav = true, className = '' }) {
  return (
    <div
      className={`min-h-full flex flex-col bg-tsure-bg text-tsure-on-primary pb-[calc(1rem+var(--safe-bottom))] ${className}`}
    >
      {showNav && <AppHeader />}
      <main className="flex-1 px-4 max-w-2xl mx-auto w-full pt-1">{children}</main>
    </div>
  );
}

import ThemedProgressBar from './ThemedProgressBar';

export default function LoadingOverlay({
  open = true,
  label,
  message,
  sublabel = '完了するまでお待ちください',
}) {
  if (!open) return null;
  const title = label || message || '読み込み中…';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        paddingTop: 'calc(1rem + var(--safe-top))',
        paddingBottom: 'calc(1rem + var(--safe-bottom))',
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-0 bg-tsure-overlay backdrop-blur-[1px]" aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-tsure-surface border border-tsure-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-tsure-primary" aria-hidden="true" />
        <div className="p-6 space-y-4">
          <p className="text-center font-semibold text-tsure-primary">{title}</p>
          <ThemedProgressBar />
          {sublabel && (
            <p className="text-xs text-center text-tsure-muted">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmModal({
  title,
  message,
  confirmText,
  cancelText,
  tone = 'default',
  onConfirm,
  onCancel,
}) {
  const confirmClass =
    tone === 'danger'
      ? 'bg-red-700 hover:bg-red-800'
      : 'bg-tsure-primary hover:bg-tsure-muted';

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-tsure-overlay backdrop-blur-[1px]"
        aria-label="閉じる"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md bg-tsure-surface border border-tsure-border rounded-2xl shadow-2xl overflow-hidden"
        style={{ marginBottom: 'var(--safe-bottom)' }}
      >
        <div className="h-1.5 bg-tsure-primary" />
        <div className="p-6">
          <h2 id="confirm-modal-title" className="text-lg font-bold text-tsure-primary mb-3">
            {title}
          </h2>
          {message && (
            <p className="text-sm text-tsure-primary/90 whitespace-pre-wrap leading-relaxed mb-6">
              {message}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 min-h-touch rounded-xl border border-tsure-border text-tsure-primary hover:bg-tsure-surface-hover font-semibold"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2.5 min-h-touch rounded-xl text-white font-semibold shadow ${confirmClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

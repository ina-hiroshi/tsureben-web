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
      ? 'bg-[#9c4a3a] hover:bg-[#b85a48]'
      : 'bg-[#5a3e28] hover:bg-[#7a5639]';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#2a211c]/60 backdrop-blur-[1px]"
        aria-label="閉じる"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md bg-[#ede3d2] border border-[#c4b5a0] rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="h-1.5 bg-[#5a3e28]" />
        <div className="p-6">
          <h2 id="confirm-modal-title" className="text-lg font-bold text-[#5a3e28] mb-3">
            {title}
          </h2>
          {message && (
            <p className="text-sm text-[#5a3e28]/90 whitespace-pre-wrap leading-relaxed mb-6">
              {message}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-[#8f735a] text-[#5a3e28] hover:bg-[#f5ebe0] font-semibold"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${confirmClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

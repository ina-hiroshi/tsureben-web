import ThemedProgressBar from './ThemedProgressBar';

export default function LoadingOverlay({ open, label, sublabel = '完了するまでお待ちください' }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-0 bg-[#2a211c]/60 backdrop-blur-[1px]" aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-[#ede3d2] border border-[#c4b5a0] rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-[#5a3e28]" aria-hidden="true" />
        <div className="p-6 space-y-4">
          <p className="text-center font-semibold text-[#5a3e28]">{label}</p>
          <ThemedProgressBar />
          {sublabel && (
            <p className="text-xs text-center text-[#5a3e28]/70">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}

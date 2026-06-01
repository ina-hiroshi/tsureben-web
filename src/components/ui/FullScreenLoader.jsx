import ThemedProgressBar from './ThemedProgressBar';

// 起動スプラッシュ（#4b4039）と同じ配色のブランド全画面ローダー。
// 認証初期化待ちなどで画面が空白になるのを防ぐ。
export default function FullScreenLoader({ label = '読み込み中…' }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-tsure-bg text-tsure-on-primary"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="font-script text-5xl leading-none">TsureBen</div>
      <div className="w-48">
        <ThemedProgressBar />
      </div>
      <p className="text-xs text-tsure-on-primary/70">{label}</p>
    </div>
  );
}

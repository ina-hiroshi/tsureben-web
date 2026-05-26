import './ThemedProgressBar.css';

export default function ThemedProgressBar({ className = '' }) {
  return (
    <div
      className={`themed-progress-track ${className}`.trim()}
      role="progressbar"
      aria-valuetext="処理中"
    >
      <div className="themed-progress-bar themed-progress-bar--indeterminate" />
    </div>
  );
}

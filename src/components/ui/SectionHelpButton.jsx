export default function SectionHelpButton({ onClick, ariaLabel = '説明を表示' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full border border-tsure-border/80 bg-tsure-surface text-xs font-bold leading-none text-tsure-muted hover:bg-tsure-surface-hover hover:text-tsure-primary"
    >
      ?
    </button>
  );
}

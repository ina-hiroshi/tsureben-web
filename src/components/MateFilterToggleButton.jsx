import { ChevronDown, ChevronUp, ListFilter } from 'lucide-react';
import AppIcon from './ui/AppIcon';

export default function MateFilterToggleButton({
  open,
  onToggle,
  hasActive = false,
}) {
  const label = open ? '閉じる' : hasActive ? '絞り込み中' : '絞り込み';
  const ariaLabel = open
    ? '検索・絞り込みを閉じる'
    : hasActive
      ? '検索・絞り込み（条件あり）'
      : '検索・絞り込みを表示';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-tsure-primary/35 bg-tsure-primary/15 text-xs font-semibold text-tsure-primary shadow-tsure-chip hover:bg-tsure-primary/25 active:bg-tsure-primary/30 transition shrink-0"
    >
      <AppIcon icon={ListFilter} size="sm" className="text-tsure-muted" />
      <span>{label}</span>
      <AppIcon
        icon={open ? ChevronUp : ChevronDown}
        size="sm"
        className="text-tsure-muted"
      />
    </button>
  );
}

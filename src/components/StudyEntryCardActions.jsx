import { Pencil, Trash2 } from 'lucide-react';
import AppIcon from './ui/AppIcon';

export default function StudyEntryCardActions({ entry, onEdit, onDelete }) {
  if (!onEdit && !onDelete) return null;

  return (
    <div className="absolute top-1.5 right-1.5 sm:inset-y-0 sm:top-auto sm:right-1 flex items-center gap-0.5 sm:gap-1 z-10">
      {onEdit && (
        <button
          type="button"
          className="min-w-10 min-h-10 sm:min-w-[3rem] sm:min-h-[3rem] flex items-center justify-center rounded-lg sm:rounded-xl text-tsure-muted hover:text-tsure-primary hover:bg-tsure-surface-hover transition"
          onClick={() => onEdit(entry)}
          aria-label="編集"
        >
          <AppIcon icon={Pencil} size="sm" className="sm:hidden" />
          <AppIcon icon={Pencil} size="lg" className="hidden sm:block" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="min-w-10 min-h-10 sm:min-w-[3rem] sm:min-h-[3rem] flex items-center justify-center rounded-lg sm:rounded-xl text-red-600 hover:text-red-800 hover:bg-red-50 transition"
          onClick={() => onDelete(entry)}
          aria-label="削除"
        >
          <AppIcon icon={Trash2} size="sm" className="sm:hidden" />
          <AppIcon icon={Trash2} size="lg" className="hidden sm:block" />
        </button>
      )}
    </div>
  );
}

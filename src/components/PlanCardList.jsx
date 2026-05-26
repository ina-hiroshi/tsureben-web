import Card from './ui/Card';
import { Pencil, Trash2 } from 'lucide-react';
import AppIcon from './ui/AppIcon';
import { subjectColorClass } from '../utils/planUtils';
import EntryDetails from './StudyEntryDetails';

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function planDurationMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export default function PlanCardList({
  entries = [],
  compact = false,
  onEdit,
  onDelete,
  emptyMessage = '予定はありません',
}) {
  if (!entries.length) {
    return <p className="text-sm text-tsure-muted text-center py-6">{emptyMessage}</p>;
  }

  return (
    <ul className={compact ? 'space-y-2' : 'space-y-3'}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <Card className="relative">
            <div className={`border-l-4 pl-3 ${subjectColorClass(entry.subject).split(' ')[0]}`}>
              <div className="flex justify-between items-baseline gap-3 mb-1.5">
                <p className="text-base font-bold text-tsure-muted tabular-nums tracking-wide">
                  {entry.start}–{entry.end}
                </p>
                <p className="text-xl font-bold text-tsure-primary tabular-nums shrink-0">
                  {formatDuration(planDurationMinutes(entry.start, entry.end))}
                </p>
              </div>
              <EntryDetails
                entry={entry}
                actions={
                  (onEdit || onDelete) && (
                    <div className="flex gap-1 shrink-0">
                      {onEdit && (
                        <button
                          type="button"
                          className="min-w-touch min-h-touch flex items-center justify-center text-tsure-muted hover:text-tsure-primary"
                          onClick={() => onEdit(entry)}
                          aria-label="編集"
                        >
                          <AppIcon icon={Pencil} size="sm" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          className="min-w-touch min-h-touch flex items-center justify-center text-red-600 hover:text-red-800"
                          onClick={() => onDelete(entry)}
                          aria-label="削除"
                        >
                          <AppIcon icon={Trash2} size="sm" />
                        </button>
                      )}
                    </div>
                  )
                }
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

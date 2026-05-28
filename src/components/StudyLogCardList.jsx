import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import { subjectAccentBgClass } from '../utils/planUtils';
import StudyEntryCardActions from './StudyEntryCardActions';
import AppIcon from './ui/AppIcon';
import { CircleCheck } from 'lucide-react';
import { STUDY_LOG_EMPTY } from '../content/emptyStatePresets';

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function LogCardContent({ entry, showActions }) {
  const durationMins = entry.duration || 0;
  const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
  const detail = entry.content || entry.book || '';
  const startLabel = entry.startTime ? `${entry.startTime}開始` : '時刻未入力';

  return (
    <div className={`flex gap-3 min-w-0 ${showActions ? 'pr-1 sm:pr-24' : ''}`}>
      <div
        className={`shrink-0 w-1 rounded-full self-stretch ${subjectAccentBgClass(entry.subject)}`}
        aria-hidden
      />
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-2xl sm:text-3xl font-extrabold text-tsure-primary tabular-nums leading-none">
              {formatDuration(durationMins)}
            </p>
            <AppIcon icon={CircleCheck} size="sm" className="text-tsure-accent mt-0.5" />
          </div>
          <p className="text-xs sm:text-sm text-tsure-muted tabular-nums mt-1">{startLabel}</p>
        </div>
        <div className="min-w-0 sm:border-l sm:border-tsure-border sm:pl-4">
          <p className="text-base sm:text-lg font-bold text-tsure-primary leading-snug">
            {subjectLine || '—'}
          </p>
          {detail && (
            <p className="text-sm text-tsure-muted mt-1 leading-snug line-clamp-3">{detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudyLogCardList({
  entries = [],
  readOnly = false,
  onEdit,
  onDelete,
  emptyState = STUDY_LOG_EMPTY,
  emptyAction,
}) {
  if (!entries.length) {
    return <EmptyState {...emptyState} action={emptyAction} />;
  }

  const showActions = !readOnly;

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Card className="relative !p-3 sm:!p-4">
            <StudyEntryCardActions
              entry={entry}
              onEdit={showActions ? onEdit : undefined}
              onDelete={showActions ? onDelete : undefined}
            />
            <LogCardContent entry={entry} showActions={showActions} />
          </Card>
        </li>
      ))}
    </ul>
  );
}

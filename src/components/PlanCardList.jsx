import EmptyState from './ui/EmptyState';
import { subjectAccentBgClass } from '../utils/planUtils';
import StudyEntryCardActions from './StudyEntryCardActions';
import AppIcon from './ui/AppIcon';
import { CalendarClock } from 'lucide-react';

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

function PlanCardContent({ entry, showActions }) {
  const timeRange =
    entry.start && entry.end ? `${entry.start}–${entry.end}` : entry.start || '—';
  const durationMins = planDurationMinutes(entry.start, entry.end);
  const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
  const detail = entry.content || entry.book || '';

  return (
    <div className={`flex gap-3 min-w-0 ${showActions ? 'pr-1 sm:pr-24' : ''}`}>
      <span
        className={`w-1.5 shrink-0 rounded-full self-stretch ${subjectAccentBgClass(entry.subject)}`}
        aria-hidden
      />
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-tsure-muted mb-0.5">
            <AppIcon icon={CalendarClock} size="xs" />
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
              予定
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-tsure-primary tabular-nums leading-none">
            {timeRange}
          </p>
          <p className="text-sm text-tsure-muted tabular-nums mt-1">{formatDuration(durationMins)}</p>
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

export default function PlanCardList({
  entries = [],
  compact = false,
  readOnly = false,
  onEdit,
  onDelete,
  emptyState,
  emptyAction,
}) {
  if (!entries.length) {
    return <EmptyState {...emptyState} action={emptyAction} />;
  }

  const showActions = !readOnly;

  return (
    <ul className={compact ? 'space-y-2' : 'space-y-3'}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <div className="relative rounded-xl border border-tsure-border bg-white shadow-tsure-chip p-3 sm:p-4">
            <StudyEntryCardActions
              entry={entry}
              onEdit={showActions ? onEdit : undefined}
              onDelete={showActions ? onDelete : undefined}
            />
            <PlanCardContent entry={entry} showActions={showActions} />
          </div>
        </li>
      ))}
    </ul>
  );
}

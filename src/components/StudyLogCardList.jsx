import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import { subjectColorClass } from '../utils/planUtils';
import EntryDetails from './StudyEntryDetails';
import StudyEntryCardActions from './StudyEntryCardActions';
import { STUDY_LOG_EMPTY } from '../content/emptyStatePresets';

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function formatTimeRange(startTime, durationMins) {
  if (!startTime) return '時刻未入力';
  const [h, m] = startTime.split(':').map(Number);
  const endTotal = h * 60 + m + (Number(durationMins) || 0);
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  return `${startTime}–${end}`;
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
            <div
              className={`border-l-4 pl-2.5 sm:pl-3 ${showActions ? 'pr-1 sm:pr-24' : 'pr-1'} ${subjectColorClass(entry.subject).split(' ')[0]}`}
            >
              <EntryDetails
                entry={entry}
                timeRange={formatTimeRange(entry.startTime, entry.duration)}
                durationLabel={formatDuration(entry.duration || 0)}
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

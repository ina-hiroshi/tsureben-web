import Card from './ui/Card';
import { subjectColorClass } from '../utils/planUtils';
import EntryDetails from './StudyEntryDetails';
import StudyEntryCardActions from './StudyEntryCardActions';

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
          <Card className="relative !p-3 sm:!p-4">
            <StudyEntryCardActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
            <div
              className={`border-l-4 pl-2.5 sm:pl-3 pr-1 sm:pr-24 ${subjectColorClass(entry.subject).split(' ')[0]}`}
            >
              <EntryDetails
                entry={entry}
                timeRange={`${entry.start}–${entry.end}`}
                durationLabel={formatDuration(planDurationMinutes(entry.start, entry.end))}
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

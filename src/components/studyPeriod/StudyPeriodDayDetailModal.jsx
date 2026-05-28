import Modal from '../ui/Modal';
import { subjectBorderColorClass } from '../../utils/subjectColors';
import { formatDayHeading, formatDuration } from '../../utils/studyPeriod';

function PlanEntryItem({ entry }) {
  const timeRange =
    entry.start && entry.end ? `${entry.start}–${entry.end}` : entry.start || '—';
  const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
  const detail = entry.content || entry.book || '';

  return (
    <li
      className={`rounded-xl border border-tsure-border bg-white p-3 border-l-[3px] ${subjectBorderColorClass(
        entry.subject
      )}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs text-tsure-muted tabular-nums">{timeRange}</p>
        <span className="text-xs font-bold text-tsure-primary tabular-nums shrink-0">
          {formatDuration(entry.plannedMinutes || 0)}
        </span>
      </div>
      <p className="text-sm font-semibold text-tsure-primary">{subjectLine || '—'}</p>
      {detail && <p className="text-xs text-tsure-muted mt-1">{detail}</p>}
    </li>
  );
}

function LogEntryItem({ entry }) {
  const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
  const detail = entry.content || entry.book || '';

  return (
    <li
      className={`rounded-xl border border-tsure-border bg-white p-3 border-l-[3px] ${subjectBorderColorClass(
        entry.subject
      )}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs text-tsure-muted tabular-nums">{entry.startTime || '—'}</p>
        <span className="text-xs font-bold text-tsure-primary tabular-nums shrink-0">
          {formatDuration(entry.duration || 0)}
        </span>
      </div>
      <p className="text-sm font-semibold text-tsure-primary">{subjectLine || '—'}</p>
      {detail && <p className="text-xs text-tsure-muted mt-1">{detail}</p>}
    </li>
  );
}

export default function StudyPeriodDayDetailModal({
  open,
  onClose,
  dateKey,
  type = 'plan',
  totalMinutes = 0,
  entries = [],
}) {
  if (!dateKey) return null;

  const isPlan = type === 'plan';
  const sortedEntries = [...entries].sort((a, b) => {
    const timeKey = isPlan ? 'start' : 'startTime';
    return (a[timeKey] || '').localeCompare(b[timeKey] || '');
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatDayHeading(dateKey)}
      fullScreenMobile
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-tsure-border bg-tsure-surface px-3 py-2.5">
          <p className="text-xs text-tsure-muted mb-0.5">
            {isPlan ? '予定時間合計' : '学習時間合計'}
          </p>
          <p className="text-lg font-bold text-tsure-primary tabular-nums">
            {formatDuration(totalMinutes)}
          </p>
          <p className="text-xs text-tsure-muted mt-1">
            {sortedEntries.length > 0
              ? `${sortedEntries.length}件`
              : isPlan
                ? '計画なし'
                : '記録なし'}
          </p>
        </div>

        {sortedEntries.length > 0 ? (
          <ul className="space-y-2">
            {sortedEntries.map((entry) =>
              isPlan ? (
                <PlanEntryItem key={entry.id} entry={entry} />
              ) : (
                <LogEntryItem key={entry.id} entry={entry} />
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-tsure-muted text-center py-6">
            {isPlan ? 'この日の計画はありません' : 'この日の記録はありません'}
          </p>
        )}
      </div>
    </Modal>
  );
}

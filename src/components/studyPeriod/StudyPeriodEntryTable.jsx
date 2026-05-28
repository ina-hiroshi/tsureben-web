import SubSectionTitle from '../ui/SubSectionTitle';
import { subjectBorderColorClass } from '../../utils/subjectColors';
import { formatDayShort, formatDuration } from '../../utils/studyPeriod';

function PlanEntryCard({ entry }) {
  const timeRange =
    entry.start && entry.end ? `${entry.start}–${entry.end}` : entry.start || '—';
  const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
  const detail = entry.content || entry.book || '';

  return (
    <div
      className={`rounded-xl border border-tsure-border bg-tsure-surface p-3 border-l-[3px] ${subjectBorderColorClass(
        entry.subject
      )}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-tsure-primary tabular-nums">
          {formatDayShort(entry.dateKey)}
        </span>
        <span className="text-xs font-bold text-tsure-primary tabular-nums shrink-0">
          {formatDuration(entry.plannedMinutes || 0)}
        </span>
      </div>
      <p className="text-xs text-tsure-muted tabular-nums">{timeRange}</p>
      <p className="text-sm font-semibold text-tsure-primary mt-1">{subjectLine || '—'}</p>
      {detail && <p className="text-xs text-tsure-muted mt-1 line-clamp-2">{detail}</p>}
    </div>
  );
}

function LogEntryCard({ entry }) {
  const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
  const detail = entry.content || entry.book || '';

  return (
    <div className="rounded-xl border border-tsure-border bg-tsure-surface p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-tsure-primary tabular-nums">
          {formatDayShort(entry.dateKey)}
        </span>
        <span className="text-xs font-bold text-tsure-primary tabular-nums shrink-0">
          {formatDuration(entry.duration || 0)}
        </span>
      </div>
      <p className="text-xs text-tsure-muted tabular-nums">{entry.startTime || '—'}</p>
      <p className="text-sm font-semibold text-tsure-primary mt-1">{subjectLine || '—'}</p>
      {detail && <p className="text-xs text-tsure-muted mt-1 line-clamp-2">{detail}</p>}
    </div>
  );
}

function PlanRow({ entry }) {
  const timeRange =
    entry.start && entry.end ? `${entry.start}–${entry.end}` : entry.start || '—';
  const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');

  return (
    <tr className="border-b border-tsure-border last:border-b-0 hover:bg-tsure-surface/60">
      <td className="px-3 py-2.5 tabular-nums text-tsure-primary whitespace-nowrap">
        {formatDayShort(entry.dateKey)}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-tsure-muted whitespace-nowrap">{timeRange}</td>
      <td className="px-3 py-2.5 text-tsure-primary min-w-[8rem]">{subjectLine || '—'}</td>
      <td className="px-3 py-2.5 text-tsure-muted hidden md:table-cell max-w-[12rem] truncate">
        {entry.content || entry.book || '—'}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-tsure-primary whitespace-nowrap">
        {formatDuration(entry.plannedMinutes || 0)}
      </td>
    </tr>
  );
}

function LogRow({ entry }) {
  const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');

  return (
    <tr className="border-b border-tsure-border last:border-b-0 hover:bg-tsure-surface/60">
      <td className="px-3 py-2.5 tabular-nums text-tsure-primary whitespace-nowrap">
        {formatDayShort(entry.dateKey)}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-tsure-muted whitespace-nowrap">
        {entry.startTime || '—'}
      </td>
      <td className="px-3 py-2.5 text-tsure-primary min-w-[8rem]">{subjectLine || '—'}</td>
      <td className="px-3 py-2.5 text-tsure-muted hidden md:table-cell max-w-[12rem] truncate">
        {entry.content || entry.book || '—'}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-tsure-primary whitespace-nowrap">
        {formatDuration(entry.duration || 0)}
      </td>
    </tr>
  );
}

export default function StudyPeriodEntryTable({ type, entries, title, onDark = false }) {
  if (!entries.length) return null;

  const isPlan = type === 'plan';

  return (
    <section>
      <SubSectionTitle onDark={onDark}>{title}</SubSectionTitle>

      <div className="md:hidden space-y-2">
        {entries.map((entry) =>
          isPlan ? (
            <PlanEntryCard key={`${entry.dateKey}-${entry.id}`} entry={entry} />
          ) : (
            <LogEntryCard key={`${entry.dateKey}-${entry.id}`} entry={entry} />
          )
        )}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-xl border border-tsure-border bg-tsure-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tsure-border bg-tsure-surface-hover text-left">
              <th className="px-3 py-2 font-semibold text-tsure-muted">日付</th>
              <th className="px-3 py-2 font-semibold text-tsure-muted">
                {isPlan ? '時間帯' : '開始'}
              </th>
              <th className="px-3 py-2 font-semibold text-tsure-muted">教科 / 科目</th>
              <th className="px-3 py-2 font-semibold text-tsure-muted hidden md:table-cell">
                {isPlan ? '内容' : 'メモ'}
              </th>
              <th className="px-3 py-2 font-semibold text-tsure-muted text-right">
                {isPlan ? '予定' : '時間'}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) =>
              isPlan ? (
                <PlanRow key={`${entry.dateKey}-${entry.id}`} entry={entry} />
              ) : (
                <LogRow key={`${entry.dateKey}-${entry.id}`} entry={entry} />
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

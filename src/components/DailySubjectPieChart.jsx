import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import SectionTitle from './ui/SectionTitle';
import EmptyState from './ui/EmptyState';
import AppIcon from './ui/AppIcon';
import { DAILY_SUBJECT_EMPTY } from '../content/emptyStatePresets';

const SUBJECT_COLORS = {
  国語: 'bg-pink-400',
  数学: 'bg-blue-400',
  英語: 'bg-purple-400',
  理科: 'bg-green-400',
  社会: 'bg-amber-400',
  情報: 'bg-indigo-400',
  その他: 'bg-gray-400',
};

function barColor(subject) {
  return SUBJECT_COLORS[subject] || 'bg-tsure-muted';
}

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

export default function DailySubjectPieChart({
  totalMinutes = 0,
  bySubject = {},
  emptyState = DAILY_SUBJECT_EMPTY,
  emptyAction,
  footerNote = '選択した日の記録を表示しています',
  onDark = false,
  embedded = false,
}) {
  const subjects = useMemo(
    () =>
      Object.entries(bySubject)
        .map(([name, minutes]) => ({ name, minutes }))
        .sort((a, b) => b.minutes - a.minutes),
    [bySubject]
  );

  if (!subjects.length || totalMinutes <= 0) {
    const emptyBody = <EmptyState {...emptyState} action={emptyAction} />;
    return (
      <div>
        <SectionTitle onDark={onDark}>教科別の学習時間</SectionTitle>
        {embedded ? emptyBody : (
          <div className="rounded-xl border border-tsure-border bg-tsure-surface p-4">{emptyBody}</div>
        )}
      </div>
    );
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const chartBody = (
    <>
      <div className="flex items-end justify-center gap-1 tabular-nums text-tsure-primary mb-4">
        {hours > 0 && (
          <>
            <span className="text-4xl font-bold leading-none">{hours}</span>
            <span className="text-sm font-medium text-tsure-muted pb-1">時間</span>
          </>
        )}
        <span className="text-4xl font-bold leading-none">{hours > 0 ? mins : totalMinutes}</span>
        <span className="text-sm font-medium text-tsure-muted pb-1">分</span>
        <span className="text-xs text-tsure-muted pb-1 ml-1">（合計）</span>
      </div>

      <div
        className="flex h-3 rounded-full overflow-hidden bg-tsure-surface-hover mb-4"
        role="img"
        aria-label={`教科別 ${formatDuration(totalMinutes)}`}
      >
        {subjects.map(({ name, minutes }) => (
          <div
            key={name}
            className={`${barColor(name)} transition-all`}
            style={{ width: `${(minutes / totalMinutes) * 100}%` }}
            title={`${name} ${minutes}分`}
          />
        ))}
      </div>

      <ul className="space-y-2.5">
        {subjects.map(({ name, minutes }) => {
          const pct = Math.round((minutes / totalMinutes) * 100);
          return (
            <li key={name} className="flex items-center gap-3 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${barColor(name)}`} />
              <span className="text-sm font-medium text-tsure-primary shrink-0 w-12">{name}</span>
              <div className="flex-1 h-2 rounded-full bg-tsure-surface-hover overflow-hidden min-w-0">
                <div
                  className={`h-full rounded-full ${barColor(name)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-tsure-muted tabular-nums shrink-0 w-10 text-right">
                {pct}%
              </span>
              <span className="text-sm text-tsure-primary tabular-nums shrink-0 w-14 text-right">
                {minutes}分
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-tsure-muted">
        <AppIcon icon={BookOpen} size="sm" />
        {footerNote}
      </p>
    </>
  );

  return (
    <div className="w-full">
      <SectionTitle onDark={onDark}>教科別の学習時間</SectionTitle>
      {embedded ? chartBody : (
        <div className="rounded-xl border border-tsure-border bg-tsure-surface p-4">{chartBody}</div>
      )}
    </div>
  );
}

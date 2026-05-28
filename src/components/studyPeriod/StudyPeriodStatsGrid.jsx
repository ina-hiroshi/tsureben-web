import { formatDuration } from '../../utils/studyPeriod';

export default function StudyPeriodStatsGrid({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-tsure-border bg-tsure-surface px-3 py-2"
        >
          <p className="text-xs text-tsure-muted mb-0.5">{label}</p>
          <p className="text-base font-bold text-tsure-primary tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}

export { formatDuration };

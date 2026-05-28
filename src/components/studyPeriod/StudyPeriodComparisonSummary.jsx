import { formatDuration } from '../../utils/studyPeriod';

function achievementTone(actualMinutes, plannedMinutes) {
  if (!plannedMinutes || !actualMinutes) return 'neutral';
  const ratio = actualMinutes / plannedMinutes;
  if (ratio >= 1) return 'success';
  return 'accent';
}

export default function StudyPeriodComparisonSummary({
  plannedMinutes = 0,
  actualMinutes = 0,
  onDark = false,
}) {
  const hasPlan = plannedMinutes > 0;
  const tone = achievementTone(actualMinutes, plannedMinutes);
  const achievementRate = hasPlan
    ? Math.min(Math.round((actualMinutes / plannedMinutes) * 100), 999)
    : null;
  const progressPercent = hasPlan
    ? Math.min(Math.round((actualMinutes / plannedMinutes) * 100), 100)
    : 0;

  const barClass =
    tone === 'success'
      ? 'bg-green-600'
      : tone === 'accent'
        ? 'bg-tsure-accent'
        : 'bg-tsure-border';

  const shellClass = onDark
    ? 'border-tsure-border bg-tsure-surface shadow-tsure-chip'
    : 'border-tsure-border bg-white shadow-tsure-chip';
  const labelClass = 'text-tsure-muted';
  const valueClass = 'text-tsure-primary';

  return (
    <section className={`rounded-2xl border px-4 py-3 ${shellClass}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className={`text-xs font-semibold ${labelClass}`}>計画との比較</p>
          {hasPlan ? (
            <p className={`text-sm sm:text-base font-bold tabular-nums mt-1 ${valueClass}`}>
              予定 {formatDuration(plannedMinutes)}
              <span className={`mx-1.5 font-normal ${labelClass}`}>/</span>
              実績 {formatDuration(actualMinutes)}
            </p>
          ) : (
            <p className={`text-sm mt-1 ${labelClass}`}>この期間の計画はありません</p>
          )}
        </div>
        {hasPlan && achievementRate !== null && (
          <p className={`text-lg sm:text-xl font-extrabold tabular-nums shrink-0 ${valueClass}`}>
            {achievementRate}%
          </p>
        )}
      </div>

      {hasPlan && (
        <>
          <div
            className="h-2.5 rounded-full overflow-hidden bg-tsure-surface-hover"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`計画達成率 ${achievementRate}%`}
          >
            <div
              className={`h-full rounded-full transition-all ${barClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className={`text-xs mt-2 ${labelClass}`}>
            {tone === 'success'
              ? '計画以上の学習ができています'
              : tone === 'accent'
                ? '計画に対する達成率'
                : '実績を記録すると達成率が表示されます'}
          </p>
        </>
      )}
    </section>
  );
}

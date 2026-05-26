export default function EntryDetails({ entry, timeRange, durationLabel }) {
  const hasContent = Boolean(entry.content?.trim());

  return (
    <div
      className={`grid grid-cols-1 items-start ${
        hasContent
          ? 'sm:grid-cols-[9.5rem_minmax(0,1fr)_minmax(0,1fr)]'
          : 'sm:grid-cols-[9.5rem_minmax(0,1fr)]'
      }`}
    >
      <section
        aria-label="学習時間"
        className="flex flex-col items-start gap-0.5 pb-2 pr-[4.75rem] sm:pr-4 sm:block sm:pb-0 sm:border-r border-tsure-border"
      >
        <p className="text-sm sm:text-base font-bold text-tsure-muted tabular-nums tracking-wide leading-snug">
          {timeRange}
        </p>
        <p className="text-xl sm:text-2xl font-bold text-tsure-primary tabular-nums leading-none sm:mt-1 shrink-0">
          {durationLabel}
        </p>
      </section>

      <section
        aria-label="教科・科目"
        className={`py-2 sm:py-0 sm:px-4 border-t sm:border-t-0 border-tsure-border ${
          hasContent ? 'sm:border-r' : ''
        }`}
      >
        <p className="text-base sm:text-lg font-bold text-tsure-primary leading-snug">
          {entry.subject}
          {entry.topic ? ` / ${entry.topic}` : ''}
        </p>
        {entry.book && (
          <p className="text-sm sm:text-base text-tsure-muted mt-0.5 sm:mt-1 leading-snug">{entry.book}</p>
        )}
      </section>

      {hasContent && (
        <section
          aria-label="学習内容"
          className="pt-2 sm:pt-0 sm:pl-4 border-t sm:border-t-0 border-tsure-border"
        >
          <p className="text-sm sm:text-base font-semibold text-tsure-primary leading-snug">{entry.content}</p>
        </section>
      )}
    </div>
  );
}

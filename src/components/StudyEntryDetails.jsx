export default function EntryDetails({ entry, actions }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 min-w-0">
        <div className="min-w-0 sm:flex-1">
          <p className="font-bold text-tsure-primary">
            {entry.subject}
            {entry.topic ? ` / ${entry.topic}` : ''}
          </p>
          {entry.book && (
            <p className="text-sm text-tsure-muted mt-0.5">{entry.book}</p>
          )}
        </div>
        {entry.content && (
          <div className="min-w-0 sm:flex-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-tsure-border sm:border-l sm:pl-3">
            <p className="text-base font-semibold text-tsure-primary leading-snug">{entry.content}</p>
          </div>
        )}
      </div>
      {actions}
    </div>
  );
}

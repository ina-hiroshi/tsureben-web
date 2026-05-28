import SubSectionTitle from '../ui/SubSectionTitle';

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

export default function StudyPeriodSubjectTable({
  bySubject,
  totalValue,
  valueLabel = '時間',
  formatValue,
  title = '教科別の内訳',
  showCount = false,
  onDark = false,
}) {
  const rows = Object.entries(bySubject)
    .map(([name, value]) => {
      const numericValue = typeof value === 'number' ? value : value.minutes;
      const count = typeof value === 'number' ? null : value.count;
      return { name, numericValue, count };
    })
    .filter((row) => row.numericValue > 0)
    .sort((a, b) => b.numericValue - a.numericValue);

  if (!rows.length || totalValue <= 0) return null;

  const hasCount = showCount && rows.some((row) => row.count != null);

  return (
    <section>
      <SubSectionTitle onDark={onDark}>{title}</SubSectionTitle>
      <div className="overflow-x-auto rounded-xl border border-tsure-border bg-tsure-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tsure-border bg-tsure-surface-hover text-left">
              <th className="px-3 py-2 font-semibold text-tsure-muted">教科</th>
              {hasCount && (
                <th className="px-3 py-2 font-semibold text-tsure-muted text-right">件数</th>
              )}
              <th className="px-3 py-2 font-semibold text-tsure-muted text-right">{valueLabel}</th>
              <th className="px-3 py-2 font-semibold text-tsure-muted text-right hidden sm:table-cell">
                割合
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ name, numericValue, count }) => {
              const pct = Math.round((numericValue / totalValue) * 100);
              return (
                <tr key={name} className="border-b border-tsure-border last:border-b-0">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${barColor(name)}`} />
                      <span className="font-medium text-tsure-primary">{name}</span>
                    </div>
                  </td>
                  {hasCount && (
                    <td className="px-3 py-2.5 text-right tabular-nums text-tsure-primary">
                      {count != null ? `${count}件` : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-tsure-primary">
                    {formatValue(numericValue)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-tsure-muted hidden sm:table-cell">
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MateDetailSection({ title, items }) {
  if (!items.length) {
    return (
      <div>
        <p className="text-xs font-semibold text-tsure-primary mb-1">{title}</p>
        <p className="text-xs text-tsure-muted">なし</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-tsure-primary mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className={`text-xs ${
              item.kind === 'external' ? 'text-tsure-muted italic' : 'text-tsure-primary'
            }`}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TeacherMateDetailSections({ mateSummary }) {
  if (!mateSummary) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <MateDetailSection title="仲間" items={mateSummary.mutual} />
      <MateDetailSection title="送信中" items={mateSummary.sent} />
      <MateDetailSection title="受信中" items={mateSummary.received} />
    </div>
  );
}

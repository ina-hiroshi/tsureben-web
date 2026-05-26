export default function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-8 px-4">
      <p className="font-semibold text-tsure-primary mb-1">{title}</p>
      {description && <p className="text-sm text-tsure-muted mb-4">{description}</p>}
      {action}
    </div>
  );
}

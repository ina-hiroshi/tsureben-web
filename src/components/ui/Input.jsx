export default function Input({ label, className = '', id, ...props }) {
  const inputId = id || label;
  return (
    <label className="block space-y-1">
      {label && (
        <span className="text-sm font-medium text-tsure-primary">{label}</span>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2.5 min-h-touch rounded-xl border border-tsure-border bg-white text-tsure-primary placeholder:text-tsure-muted focus:outline-none focus:ring-2 focus:ring-tsure-accent/50 ${className}`}
        {...props}
      />
    </label>
  );
}

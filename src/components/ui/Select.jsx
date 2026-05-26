export default function Select({ label, children, className = '', id, ...props }) {
  const selectId = id || label;
  return (
    <label className="block space-y-1">
      {label && (
        <span className="text-sm font-medium text-tsure-primary">{label}</span>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2.5 min-h-touch rounded-xl border border-tsure-border bg-white text-tsure-primary focus:outline-none focus:ring-2 focus:ring-tsure-accent/50 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

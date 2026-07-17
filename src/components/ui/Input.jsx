import { FIELD_CONTROL, FIELD_CONTROL_TIME } from './fieldStyles';

export default function Input({ label, className = '', id, type, ...props }) {
  const inputId = id || label;
  const controlClass =
    type === 'time' || type === 'datetime-local' ? FIELD_CONTROL_TIME : FIELD_CONTROL;
  return (
    <label className="block min-w-0 space-y-1">
      {label && (
        <span className="text-sm font-medium text-tsure-primary">{label}</span>
      )}
      <input
        id={inputId}
        type={type}
        className={`${controlClass} ${className}`}
        {...props}
      />
    </label>
  );
}

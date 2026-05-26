export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div
      className={`bg-tsure-surface border border-tsure-border rounded-2xl shadow-tsure-raised ${padding ? 'p-4' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

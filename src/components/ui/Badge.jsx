export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-tsure-surface-hover text-tsure-primary border-tsure-border',
    live: 'bg-tsure-live/15 text-tsure-live border-tsure-live/30',
    accent: 'bg-tsure-accent/20 text-tsure-primary border-tsure-accent/40',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

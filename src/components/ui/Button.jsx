import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'bg-tsure-primary text-tsure-on-primary shadow-tsure-button',
  // ログアウト（dark 上の bg-white/15）と同系。カード（surface）上は primary の半透明
  secondary:
    'bg-tsure-primary/15 text-tsure-primary border border-tsure-primary/35 shadow-tsure-chip hover:bg-tsure-primary/25 active:bg-tsure-primary/30',
  surface: 'bg-tsure-surface text-tsure-primary border border-tsure-border shadow-tsure-button',
  white:
    'bg-white text-tsure-primary border border-tsure-border shadow-tsure-chip hover:bg-tsure-surface-hover/50 active:bg-tsure-surface-hover/70',
  accent: 'bg-tsure-accent text-tsure-primary shadow-tsure-button',
  ghost: 'bg-transparent text-tsure-on-primary',
  danger: 'bg-red-700 text-white shadow-tsure-button',
};

const SIZES = {
  sm: 'px-3 py-2 text-sm min-h-touch',
  md: 'px-4 py-2.5 text-base min-h-touch',
  lg: 'px-6 py-3 text-lg min-h-touch',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  to,
  type = 'button',
  ...props
}) {
  const classes = `inline-flex items-center justify-center rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

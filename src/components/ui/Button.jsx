import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'bg-tsure-primary text-tsure-on-primary shadow-tsure-button',
  secondary: 'bg-tsure-surface text-tsure-primary border border-tsure-border shadow-tsure-button',
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

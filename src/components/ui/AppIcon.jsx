const SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
};

export default function AppIcon({ icon: Icon, size = 'md', className = '', strokeWidth = 2 }) {
  if (!Icon) return null;
  const px = SIZES[size] || SIZES.md;
  return (
    <Icon
      size={px}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}

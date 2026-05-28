export default function SubSectionTitle({ children, onDark = false, className = '' }) {
  return (
    <h3
      className={`text-sm font-bold mb-3 ${
        onDark ? 'text-tsure-on-primary' : 'text-tsure-primary'
      } ${className}`}
    >
      {children}
    </h3>
  );
}

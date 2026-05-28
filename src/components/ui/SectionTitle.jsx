export default function SectionTitle({ children, action, className = '', onDark = false }) {
  return (
    <div className={`flex items-center justify-between gap-2 mb-3 ${className}`}>
      <h2
        className={`text-base font-bold min-w-0 flex-1 ${onDark ? 'text-tsure-on-primary' : 'text-tsure-primary'}`}
      >
        {children}
      </h2>
      {action}
    </div>
  );
}

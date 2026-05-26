import { FaPenNib } from 'react-icons/fa';

export default function AppLogo({ variant = 'header', theme = 'light', className = '' }) {
  const isHeader = variant === 'header';
  const colorClass = theme === 'dark' ? 'text-tsure-on-primary' : 'text-tsure-primary';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`font-script leading-none ${theme === 'light' ? 'drop-shadow-sm' : ''} ${colorClass} ${
          isHeader
            ? theme === 'dark'
              ? 'text-4xl sm:text-5xl'
              : 'text-4xl sm:text-6xl'
            : 'text-4xl'
        }`}
      >
        TsureBen
      </span>
      <FaPenNib
        className={`shrink-0 ${colorClass} ${
          isHeader
            ? theme === 'dark'
              ? 'w-7 h-7 sm:w-8 sm:h-8'
              : 'w-8 h-8 sm:w-12 sm:h-12 mt-1'
            : 'w-7 h-7'
        }`}
        aria-hidden="true"
      />
    </span>
  );
}

import { Link } from 'react-router-dom';
import AppIcon from './AppIcon';

export default function NavCard({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="w-full flex flex-col items-center gap-2 py-3 px-1 rounded-2xl bg-tsure-surface border border-tsure-border shadow-tsure-raised text-tsure-primary no-underline active:scale-[0.98] transition min-h-touch"
    >
      <div className="flex items-center justify-center text-tsure-primary">
        <AppIcon icon={Icon} size="3xl" strokeWidth={1.75} />
      </div>
      <div className="text-center w-full">
        <div className="font-semibold text-xs leading-tight">{label}</div>
        {description && (
          <div className="text-[10px] text-tsure-muted mt-0.5 leading-tight">{description}</div>
        )}
      </div>
    </Link>
  );
}

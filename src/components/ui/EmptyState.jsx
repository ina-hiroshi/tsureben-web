import { Inbox } from 'lucide-react';
import AppIcon from './AppIcon';

const BASE = {
  container: 'border border-dashed border-tsure-border bg-tsure-surface',
  title: 'text-tsure-primary',
  description: 'text-tsure-muted',
  step: 'text-tsure-primary/85',
  stepNumber: 'bg-tsure-primary/10 text-tsure-primary',
  iconWrap: 'bg-tsure-primary/10 text-tsure-primary',
  stepsLabel: 'text-tsure-muted',
};

export default function EmptyState({
  icon = Inbox,
  title,
  description,
  steps = [],
  stepsLabel = '次のステップ',
  action,
  variant = 'default',
  compact = false,
  className = '',
}) {
  const isCompact = compact || variant === 'compact';
  const container = isCompact
    ? `${BASE.container} rounded-xl`
    : `${BASE.container} rounded-2xl`;

  return (
    <div
      className={`text-center ${isCompact ? 'py-5 px-3' : 'py-8 px-4'} ${container} ${className}`}
      role="status"
    >
      {icon && (
        <div
          className={`inline-flex items-center justify-center rounded-full mb-3 ${BASE.iconWrap} ${
            isCompact ? 'w-10 h-10' : 'w-12 h-12'
          }`}
        >
          <AppIcon icon={icon} size={isCompact ? 'md' : 'lg'} />
        </div>
      )}
      <p className={`font-semibold mb-1 ${isCompact ? 'text-sm' : 'text-base'} ${BASE.title}`}>{title}</p>
      {description && (
        <p
          className={`text-sm text-left max-w-sm mx-auto ${steps.length > 0 || action ? 'mb-4' : ''} ${BASE.description}`}
        >
          {description}
        </p>
      )}
      {steps.length > 0 && (
        <div className={`text-left max-w-sm mx-auto ${action ? 'mb-4' : ''}`}>
          <p className={`text-xs font-semibold mb-2 ${BASE.stepsLabel}`}>{stepsLabel}</p>
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={step} className={`flex gap-2.5 text-sm ${BASE.step}`}>
                <span
                  className={`flex shrink-0 items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${BASE.stepNumber}`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {action && <div className="flex flex-col items-center gap-2">{action}</div>}
    </div>
  );
}

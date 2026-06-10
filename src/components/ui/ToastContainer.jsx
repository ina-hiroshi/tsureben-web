import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import AppIcon from './AppIcon';

const TYPE_STYLES = {
  success: {
    bar: 'bg-tsure-primary',
    icon: CheckCircle2,
    iconClass: 'text-tsure-primary',
  },
  error: {
    bar: 'bg-red-700',
    icon: AlertCircle,
    iconClass: 'text-red-700',
  },
  warning: {
    bar: 'bg-amber-600',
    icon: AlertCircle,
    iconClass: 'text-amber-600',
  },
  info: {
    bar: 'bg-tsure-muted',
    icon: Info,
    iconClass: 'text-tsure-muted',
  },
};

export default function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 p-4 pointer-events-none"
      style={{
        paddingTop: 'calc(1rem + var(--safe-top))',
        paddingBottom: 'calc(1rem + var(--safe-bottom))',
      }}
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-[min(100%,22rem)] bg-white border-2 border-tsure-primary/20 rounded-xl shadow-tsure-raised ring-1 ring-black/10 overflow-hidden animate-[toastFadeIn_0.25s_ease-out]"
          >
            <div className={`h-1 ${style.bar}`} />
            <div className="flex items-start gap-3 p-4">
              <AppIcon icon={style.icon} size="md" className={`mt-0.5 ${style.iconClass}`} />
              <p className="flex-1 text-sm font-medium text-tsure-primary whitespace-pre-wrap leading-relaxed">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-tsure-muted hover:text-tsure-primary shrink-0 min-w-touch min-h-touch flex items-center justify-center"
                aria-label="閉じる"
              >
                <AppIcon icon={X} size="sm" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

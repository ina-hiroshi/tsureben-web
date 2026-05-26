import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const TYPE_STYLES = {
  success: {
    bar: 'bg-[#5a3e28]',
    icon: FaCheckCircle,
    iconClass: 'text-[#5a3e28]',
  },
  error: {
    bar: 'bg-[#9c4a3a]',
    icon: FaExclamationCircle,
    iconClass: 'text-[#9c4a3a]',
  },
  warning: {
    bar: 'bg-[#b8860b]',
    icon: FaExclamationCircle,
    iconClass: 'text-[#b8860b]',
  },
  info: {
    bar: 'bg-[#726256]',
    icon: FaInfoCircle,
    iconClass: 'text-[#726256]',
  },
};

export default function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 p-4 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-[min(100%,22rem)] bg-[#ede3d2] border border-[#c4b5a0] rounded-xl shadow-2xl overflow-hidden animate-[toastFadeIn_0.25s_ease-out]"
          >
            <div className={`h-1 ${style.bar}`} />
            <div className="flex items-start gap-3 p-4">
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.iconClass}`} />
              <p className="flex-1 text-sm text-[#5a3e28] whitespace-pre-wrap leading-relaxed">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-[#8f735a] hover:text-[#5a3e28] shrink-0"
                aria-label="閉じる"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

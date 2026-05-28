import { X } from 'lucide-react';
import AppIcon from './AppIcon';

const PANEL_WIDTH = {
  default: 'sm:max-w-lg',
  wide: 'sm:max-w-3xl lg:max-w-4xl sm:w-[min(100%,56rem)]',
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  fullScreenMobile = true,
  size = 'default',
  showHeaderClose = true,
}) {
  if (!open) return null;

  const widthClass = PANEL_WIDTH[size] || PANEL_WIDTH.default;

  const panelClass = fullScreenMobile
    ? `fixed inset-0 z-[100] flex flex-col bg-tsure-surface sm:inset-auto sm:relative ${widthClass} sm:mx-auto sm:my-8 sm:rounded-2xl sm:max-h-[90vh]`
    : `relative w-full ${widthClass} bg-tsure-surface rounded-2xl max-h-[90vh] flex flex-col`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-tsure-overlay backdrop-blur-[1px]"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`${panelClass} shadow-tsure-raised overflow-hidden`}
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="h-1 bg-tsure-primary shrink-0" />
        <div className="flex items-center justify-between px-4 py-3 border-b border-tsure-border shrink-0">
          <h2 className="text-lg font-bold text-tsure-primary">{title}</h2>
          {showHeaderClose && (
            <button
              type="button"
              className="min-w-touch min-h-touch flex items-center justify-center rounded-lg hover:bg-tsure-surface-hover text-tsure-primary"
              onClick={onClose}
              aria-label="閉じる"
            >
              <AppIcon icon={X} size="md" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';
import ToastContainer from '../components/ui/ToastContainer';

const UiFeedbackContext = createContext(null);

const TOAST_DURATION_MS = 4200;

let toastIdCounter = 0;

export function UiFeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolverRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info') => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
      return id;
    },
    [dismissToast]
  );

  const toast = useMemo(
    () => ({
      show: showToast,
      success: (message) => showToast(message, 'success'),
      error: (message) => showToast(message, 'error'),
      info: (message) => showToast(message, 'info'),
      warning: (message) => showToast(message, 'warning'),
    }),
    [showToast]
  );

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({
        title: options.title ?? '確認',
        message: options.message ?? '',
        confirmText: options.confirmText ?? 'OK',
        cancelText: options.cancelText ?? 'キャンセル',
        tone: options.tone ?? 'default',
      });
    });
  }, []);

  const closeConfirm = useCallback((result) => {
    confirmResolverRef.current?.(result);
    confirmResolverRef.current = null;
    setConfirmState(null);
  }, []);

  return (
    <UiFeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {confirmState && (
        <ConfirmModal
          {...confirmState}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
        />
      )}
    </UiFeedbackContext.Provider>
  );
}

export function useUiFeedback() {
  const ctx = useContext(UiFeedbackContext);
  if (!ctx) {
    throw new Error('useUiFeedback must be used within UiFeedbackProvider');
  }
  return ctx;
}

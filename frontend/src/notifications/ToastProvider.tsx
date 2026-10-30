import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { toastReducer, type Toast } from './model';

type ToastContextValue = {
  toasts: Toast[];
  notify: (message: string, options?: { kind?: Toast['kind']; scope?: string }) => void;
  dismiss: (id: number) => void;
  clearScope: (scope: string) => void;
};
const ToastContext = createContext<ToastContextValue | null>(null);
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('ToastProvider is required');
  return context;
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const nextId = useRef(0);
  const notify = useCallback((message: string, options: { kind?: Toast['kind']; scope?: string } = {}) => {
    dispatch({ type: 'show', toast: { id: ++nextId.current, message, kind: options.kind || 'success', scope: options.scope } });
  }, []);
  const dismiss = useCallback((id: number) => dispatch({ type: 'dismiss', id }), []);
  const clearScope = useCallback((scope: string) => dispatch({ type: 'clearScope', scope }), []);
  return <ToastContext.Provider value={{ toasts, notify, dismiss, clearScope }}>
    {children}
    <ToastViewport />
  </ToastContext.Provider>;
}
function ToastMessage({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    // Errors remain until dismissed. Success messages pause on hover/keyboard focus.
    if (toast.kind === 'error' || paused) return;
    const timer = window.setTimeout(() => dismiss(toast.id), 8000);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.kind, paused, dismiss]);
  return <div className={`toast-message pointer-events-auto flex min-w-0 items-start gap-2 rounded-2xl border p-3 shadow-lg ${toast.kind === 'error' ? 'border-red-300 bg-red-50 text-red-900' : 'border-green-300 bg-[#eef8ef] text-[#183d20]'}`}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <span aria-hidden="true" className="mt-2 shrink-0">{toast.kind === 'error' ? '!' : '✓'}</span>
    <p role={toast.kind === 'error' ? 'alert' : 'status'} aria-atomic="true" className="min-w-0 flex-1 break-words py-2 text-sm [overflow-wrap:anywhere]">{toast.message}</p>
    <button type="button" aria-label={`Закрыть уведомление: ${toast.message}`} onClick={() => dismiss(toast.id)}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">×</button>
  </div>;
}
export function ToastViewport({ scope }: { scope?: string }) {
  const { toasts, dismiss } = useToast();
  const visible = toasts.filter((toast) => toast.scope === scope);
  return <section aria-label="Уведомления" className="toast-viewport pointer-events-none fixed z-50 flex flex-col gap-3">
    {visible.map((toast) => <ToastMessage key={toast.id} toast={toast} dismiss={dismiss} />)}
  </section>;
}

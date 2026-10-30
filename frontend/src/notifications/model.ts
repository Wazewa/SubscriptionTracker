export type Toast = { id: number; message: string; kind: 'success' | 'error'; scope?: string };
export type ToastAction = { type: 'show'; toast: Toast } | { type: 'dismiss'; id: number } | { type: 'clearScope'; scope: string };
export function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  if (action.type === 'dismiss') return state.filter((toast) => toast.id !== action.id);
  if (action.type === 'clearScope') return state.filter((toast) => toast.scope !== action.scope);
  if (!action.toast.message.trim()) return state;
  // Repeated errors replace their previous copy and restart the display lifetime.
  return [...state.filter((toast) => toast.scope !== action.toast.scope || toast.message !== action.toast.message).slice(-2), action.toast];
}

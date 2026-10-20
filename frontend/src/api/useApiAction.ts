import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../auth/api';
import { readSession, TOKEN_KEY } from '../auth/session';
import { HttpError } from './client';
export function useApiAction(onError?: (message: string) => void) {
  const { logout, user } = useAuth();
  const [pending, setPending] = useState(false); const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  async function run<T>(operation: (token: string, signal: AbortSignal) => Promise<T>): Promise<{ value: T } | null> {
    if (controller.current) return null;
    if (user?.isDemo) { const message = 'Демо-режим: изменения не отправляются на сервер.'; setError(message); onError?.(message); return null; }
    const current = new AbortController(); controller.current = current; setPending(true); setError('');
    try { const value = await operation(readSession(TOKEN_KEY) || '', current.signal); return !current.signal.aborted && mounted.current ? { value } : null; }
    catch (error) {
      if (!current.signal.aborted && mounted.current) {
        if ((error instanceof HttpError || error instanceof ApiError) && error.status === 401) logout();
        else {
          const message = error instanceof Error ? error.message : 'Не удалось выполнить действие.';
          setError(message); onError?.(message);
        }
      }
      return null;
    } finally { if (mounted.current) setPending(false); if (controller.current === current) controller.current = null; }
  }
  return { pending, error, run };
}

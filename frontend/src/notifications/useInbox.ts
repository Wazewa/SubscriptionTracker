import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { readSession, TOKEN_KEY } from '../auth/session';
import { HttpError } from '../api/client';
import { createInboxApi, type PaymentCandidate } from './api';
import type { InboxNotification } from './inboxModel';

type InboxResult = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: InboxNotification[] };
export function useInbox(enabled: boolean, open: boolean) {
  const { logout } = useAuth();
  const [state, setState] = useState<InboxResult>({ kind: 'loading' });
  const [paymentState, setPaymentState] = useState<{ kind: 'loading' | 'error' | 'ready'; items: PaymentCandidate[] }>({ kind: 'loading', items: [] });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const api = createInboxApi(import.meta.env.VITE_API_BASE_URL || '/api');
    const unauthorized = (error: unknown) => { if (error instanceof HttpError && error.status === 401) logout(); };
    setState({ kind: 'loading' });
    api.list(readSession(TOKEN_KEY) ?? '', controller.signal).then(items => { if (!controller.signal.aborted) setState({ kind: 'ready', items }); })
      .catch(error => { if (!controller.signal.aborted) { unauthorized(error); setState({ kind: 'error' }); } });
    if (open) {
      setPaymentState({ kind: 'loading', items: [] });
      api.payments(readSession(TOKEN_KEY) ?? '', controller.signal).then(items => { if (!controller.signal.aborted) setPaymentState({ kind: 'ready', items }); })
        .catch(error => { if (!controller.signal.aborted) { unauthorized(error); setPaymentState({ kind: 'error', items: [] }); } });
    }
    return () => controller.abort();
  }, [enabled, open, revision, logout]);
  return { state, paymentState, reload };
}

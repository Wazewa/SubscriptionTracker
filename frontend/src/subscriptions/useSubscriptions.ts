import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { createSubscriptionsApi, SubscriptionsApiError } from './api';
import type { Subscription, SubscriptionFilters } from './model';
import { buildSubscriptionsQuery } from './query';

export type DemoScenario = 'data' | 'empty' | 'loading' | 'error';
type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; rows: Subscription[] };

export function useSubscriptions(scenario: DemoScenario, filters: SubscriptionFilters) {
  const { user, logout } = useAuth();
  const isDemo = import.meta.env.DEV && user?.isDemo === true;
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const apiEnabled = import.meta.env.VITE_SUBSCRIPTIONS_API_ENABLED === 'true';
  const query = buildSubscriptionsQuery(filters);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const serverQuery = isDemo ? '' : debouncedQuery;
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => { setCategories([]); }, [user?.email, isDemo]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    setState({ kind: 'loading' });
    const fail = (error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof SubscriptionsApiError && error.status === 401) { logout(); return; }
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Не удалось загрузить подписки.' });
    };
    if (isDemo) {
      if (scenario !== 'loading') timer = window.setTimeout(async () => {
        try {
          if (scenario === 'error') throw new Error('Демонстрация ошибки загрузки.');
          const { createDemoSubscriptions } = await import('./demo');
          if (!controller.signal.aborted) setState({ kind: 'ready', rows: scenario === 'empty' ? [] : createDemoSubscriptions() });
        } catch (error) { fail(error); }
      }, 650);
    } else if (!apiEnabled) {
      setState({ kind: 'error', message: 'API подписок ещё не подключён. Реальный список появится после готовности backend.' });
    } else {
      let token = '';
      try { token = sessionStorage.getItem('subscription-tracker.token') || ''; } catch { /* Handled as an expired session. */ }
      const params = new URLSearchParams(serverQuery);
      const requestFilters = { search: params.get('search') || '', category: params.get('category') || '', period: params.get('period') || '' };
      createSubscriptionsApi(import.meta.env.VITE_API_BASE_URL || '/api').list(token, controller.signal, requestFilters)
        .then((rows) => {
          if (controller.signal.aborted) return;
          setCategories((previous) => [...new Set([...previous, ...rows.map((row) => row.category)])]);
          setState({ kind: 'ready', rows });
        }).catch(fail);
    }
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [isDemo, user?.email, scenario, attempt, logout, apiEnabled, serverQuery]);
  return { state, isDemo, apiEnabled, categories, reload: () => setAttempt((value) => value + 1) };
}

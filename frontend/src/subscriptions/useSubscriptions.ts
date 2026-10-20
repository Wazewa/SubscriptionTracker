import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { readSession, TOKEN_KEY } from '../auth/session';
import { createSubscriptionsApi, SubscriptionsApiError } from './api';
import type { Category, Subscription } from './model';
export type DemoScenario = 'data' | 'empty' | 'loading' | 'error';
type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; rows: Subscription[]; categories: Category[] };
export function useSubscriptions(scenario: DemoScenario = 'data') {
  const { user, logout } = useAuth();
  const isDemo = import.meta.env.DEV && user?.isDemo === true;
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: number | undefined;
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
          const { createDemoSubscriptions, demoCategories } = await import('./demo');
          if (!controller.signal.aborted) setState({ kind: 'ready', rows: scenario === 'empty' ? [] : createDemoSubscriptions(), categories: demoCategories });
        } catch (error) { fail(error); }
      }, 650);
    } else {
      const token = readSession(TOKEN_KEY) || ''; const api = createSubscriptionsApi(import.meta.env.VITE_API_BASE_URL || '/api');
      Promise.all([api.categories(token, controller.signal), api.list(token, controller.signal)]).then(([categories, rows]) => {
        if (!controller.signal.aborted) setState({ kind: 'ready', categories,
          rows: rows.map((row) => ({ ...row, category: categories.find((item) => item.id === row.categoryId)?.name || row.category })) });
      }).catch(fail);
    }
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [isDemo, user?.email, scenario, attempt, logout]);
  return { state, isDemo, reload: () => setAttempt((value) => value + 1) };
}

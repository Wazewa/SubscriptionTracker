import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { readSession, TOKEN_KEY } from '../auth/session';
import { HttpError } from '../api/client';
import { createDashboardApi, type DashboardCurrency } from './api';
import { localDateKey, validateDashboard, type DashboardData } from './model';
import type { DashboardStats } from './statsModel';
export type DemoScenario = 'data' | 'empty' | 'error' | 'loading';
type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: DashboardData; stats: DashboardStats };
export function useDashboard(scenario: DemoScenario, month = localDateKey().slice(0, 7), currency: DashboardCurrency = 'RUB') {
  const { user, logout } = useAuth();
  const isDemo = import.meta.env.DEV && user?.isDemo === true;
  const [stored, setState] = useState<{ key: string; state: State }>({ key: '', state: { kind: 'loading' } });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([user?.email, isDemo, month, currency, scenario, attempt]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    const complete = (state: State) => { if (!controller.signal.aborted) setState({ key, state }); };
    complete({ kind: 'loading' });
    const fail = (error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof HttpError && error.status === 401) { logout(); return; }
      complete({ kind: 'error', message: error instanceof HttpError && error.status === 403
        ? 'Нет доступа к статистике.' : 'Не удалось загрузить сводку. Проверьте соединение и повторите загрузку.' });
    };
    if (isDemo) {
      if (scenario !== 'loading') timer = window.setTimeout(async () => {
        try {
          if (scenario === 'error') throw new Error('Демонстрация ошибки загрузки.');
          const { createDemoDashboard } = await import('./demo');
          const data = scenario === 'empty'
            ? { month: localDateKey().slice(0, 7), currency: 'RUB', subscriptionCount: 0, totalMinor: 0, categories: [], upcoming: [] }
            : createDemoDashboard();
          const { createDemoDashboardStats } = await import('./statsDemo');
          complete({ kind: 'ready', data: validateDashboard(data), stats: createDemoDashboardStats(scenario === 'empty') });
        } catch (error) { fail(error); }
      }, 650);
    } else {
      createDashboardApi(import.meta.env.VITE_API_BASE_URL || '/api')
        .load(readSession(TOKEN_KEY) || '', month, currency, controller.signal)
        .then(result => complete({ kind: 'ready', ...result })).catch(fail);
    }
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [key, isDemo, scenario, month, currency, logout]);
  return { state: stored.key === key ? stored.state : { kind: 'loading' } as State, isDemo, reload: () => setAttempt(value => value + 1) };
}

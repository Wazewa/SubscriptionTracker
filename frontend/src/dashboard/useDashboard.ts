import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { localDateKey, validateDashboard, type DashboardData } from './model';

export type DemoScenario = 'data' | 'empty' | 'error' | 'loading';
type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: DashboardData };

export function useDashboard(scenario: DemoScenario) {
  const { user } = useAuth();
  const isDemo = import.meta.env.DEV && user?.isDemo === true;
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    if (!isDemo) {
      // Task #11: replace this branch with an agreed API adapter when backend is available.
      setState({ kind: 'error', message: 'API сводки пока не подключён. Реальные данные станут доступны после интеграции с backend.' });
      return;
    }
    if (scenario === 'loading') return;
    const timer = window.setTimeout(async () => {
      try {
        if (scenario === 'error') throw new Error('Демонстрация ошибки загрузки. Попробуйте ещё раз.');
        const { createDemoDashboard } = await import('./demo');
        const data = scenario === 'empty'
          ? { month: localDateKey().slice(0, 7), currency: 'RUB', subscriptionCount: 0, totalMinor: 0, categories: [], upcoming: [] }
          : createDemoDashboard();
        if (!cancelled) setState({ kind: 'ready', data: validateDashboard(data) });
      } catch (error) {
        if (!cancelled) setState({ kind: 'error', message: error instanceof Error ? error.message : 'Не удалось загрузить сводку.' });
      }
    }, 650);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [isDemo, scenario, attempt]);
  return { state, isDemo, reload: () => setAttempt((value) => value + 1) };
}

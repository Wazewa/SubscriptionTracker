import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { HttpError } from '../api/client';
import { loadDashboardStats, type DashboardStatsLoader, type DashboardStatsState } from './statsModel';
import type { DemoScenario } from './useDashboard';

export function useDashboardStats(scenario: DemoScenario, loader?: DashboardStatsLoader) {
  const { user, logout } = useAuth();
  const isDemo = import.meta.env.DEV && user?.isDemo === true;
  const [state, setState] = useState<DashboardStatsState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    setState({ kind: 'loading' });
    const complete = (source?: DashboardStatsLoader) => {
      loadDashboardStats(source, controller.signal).then((result) => {
        if (!controller.signal.aborted) setState(result);
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof HttpError && error.status === 401) { logout(); return; }
        // Never render raw server errors or replace a failed request with demo/zero sums.
        setState({ kind: 'error' });
      });
    };

    if (isDemo) {
      if (scenario !== 'loading') timer = window.setTimeout(() => complete(async () => {
        if (scenario === 'error') throw new Error('Демо ошибки загрузки.');
        const { createDemoDashboardStats } = await import('./statsDemo');
        return createDemoDashboardStats(scenario === 'empty');
      }), 650);
    } else {
      // No endpoint is called until backend #69 provides an agreed adapter.
      complete(loader);
    }
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [isDemo, user?.email, scenario, attempt, loader, logout]);

  return { state, reload: () => setAttempt((value) => value + 1) };
}

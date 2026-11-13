import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryChart from '../components/CategoryChart';
import CategoryDetailsModal from '../components/CategoryDetailsModal';
import UpcomingPaymentsModal from '../components/UpcomingPaymentsModal';
import DashboardSkeleton from '../components/DashboardSkeleton';
import DashboardStatsCards from '../components/DashboardStatsCards';
import UpcomingPayments, { type UpcomingPaymentsState } from '../components/UpcomingPayments';
import { useDashboard, type DemoScenario } from '../dashboard/useDashboard';
import { createDashboardApi, dashboardCurrencies, type DashboardCurrency } from '../dashboard/api';
import { readSession, TOKEN_KEY } from '../auth/session';
import { HttpError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { localDateKey } from '../dashboard/model';
import type { DashboardStatsState } from '../dashboard/statsModel';

const scenarios: { value: DemoScenario; title: string }[] = [
  { value: 'data', title: 'Есть данные' }, { value: 'empty', title: 'Нет подписок' },
  { value: 'loading', title: 'Загрузка' }, { value: 'error', title: 'Ошибка' },
];
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f445db] px-5 py-3 text-sm text-white shadow-sm hover:bg-[#dc34c4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a91e9e]';

export default function Dashboard() {
  const { logout } = useAuth();
  const [modal, setModal] = useState<'payments' | 'categories' | null>(null);
  const [scenario, setScenario] = useState<DemoScenario>('data');
  const [month, setMonth] = useState(localDateKey().slice(0, 7));
  const [currency, setCurrency] = useState<DashboardCurrency>('RUB');
  const { state, isDemo, reload } = useDashboard(scenario, month, currency);
  const loadCategories = useCallback(async (period: string, signal: AbortSignal) => {
    try { return await createDashboardApi(import.meta.env.VITE_API_BASE_URL || '/api').categories(readSession(TOKEN_KEY) || '', period, currency, signal); }
    catch (error) { if (!signal.aborted && error instanceof HttpError && error.status === 401) logout(); throw error; }
  }, [currency, logout]);
  const statsState: DashboardStatsState = state.kind === 'ready' ? { kind: 'ready', data: state.stats } : { kind: state.kind };
  const upcomingState: UpcomingPaymentsState = state.kind === 'ready' ? { kind: 'ready', payments: state.data.upcoming } : { kind: state.kind };
  return (
    <div className="max-w-[1200px]">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3" aria-label="Панель Dashboard">
        {isDemo && <p className="mr-auto text-xs text-[#687468]">Демо · тестовые данные</p>}
        <span title="Сводка за месяц" className="inline-flex min-h-11 items-center rounded-full border border-[#e1e5dc] bg-white px-5 text-sm text-[#183d20] shadow-sm">месяц</span>
        {!isDemo && <>
          <label className="text-sm">Месяц <input type="month" aria-label="Месяц сводки" value={month} onChange={e => { if (/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) { setMonth(e.target.value); setModal(null); } }} className="min-h-11 rounded-xl border bg-white px-2" /></label>
          <label className="text-sm">Валюта <select aria-label="Валюта сводки" value={currency} onChange={e => { setCurrency(e.target.value as DashboardCurrency); setModal(null); }} className="min-h-11 rounded-xl border bg-white px-2">{dashboardCurrencies.map(c => <option key={c}>{c}</option>)}</select></label>
        </>}
        <Link to="/subscriptions/new" className={actionClass}><span aria-hidden="true">＋</span>Добавить подписку</Link>
      </div>
      <DashboardStatsCards state={statsState} onRetry={() => {
        if (isDemo && scenario === 'error') setScenario('data');
        else reload();
      }} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        {state.kind === 'loading' && <DashboardSkeleton />}
        {state.kind === 'error' && <section role="alert" className="rounded-3xl border border-[#cbdcc7] bg-white p-7">
          <h2 className="font-unbounded text-lg">Не удалось загрузить сводку</h2>
          <p className="mt-3 text-sm text-[#687468]">{state.message}</p>
          <button type="button" onClick={() => { if (scenario === 'error') setScenario('data'); else reload(); }} className={`${actionClass} mt-5`}>Повторить загрузку</button>
        </section>}
        {state.kind === 'ready' && <div className="min-w-0">
          {state.data.subscriptionCount === 0 ? <section className="rounded-3xl border border-[#cbdcc7] bg-white p-8 text-center">
            <h2 className="font-unbounded text-xl">У вас пока нет подписок</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#687468]">Добавьте первую подписку, чтобы видеть расходы по категориям и ближайшие списания.</p>
            <Link to="/subscriptions/new" className={`${actionClass} mt-6`}>Добавить первую подписку</Link>
          </section> : <CategoryChart currency={state.data.currency} categories={state.data.categories} onOpenDetails={() => setModal('categories')} />}
        </div>}
        <UpcomingPayments currency={currency} state={upcomingState} onShowAll={() => setModal('payments')} onRetry={() => { if (isDemo && scenario === 'error') setScenario('data'); else reload(); }} />
      </div>
      {isDemo && <section aria-label="Режим демонстрации" className="mt-6 rounded-2xl border border-[#cbdcc7] bg-[#eef4e9] px-4 py-3 text-xs">
        <details>
          <summary className="cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-green-700">Состояния демонстрации</summary>
          <p className="mt-2 text-[#45643b]">Демо-данные — не реальные подписки. В деморежиме запросы к backend не выполняются.</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Состояния демо">
            {scenarios.map((item) => <button key={item.value} type="button" aria-pressed={scenario === item.value} onClick={() => setScenario(item.value)} className={`min-h-11 rounded-lg border px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-green-700 ${scenario === item.value ? 'border-[#285d25] bg-white text-[#285d25]' : 'border-transparent hover:bg-white'}`}>{item.title}</button>)}
          </div>
        </details>
      </section>}
      {modal === 'payments' && state.kind === 'ready' && <UpcomingPaymentsModal currency={state.data.currency} payments={state.data.upcoming} onClose={() => setModal(null)} />}
      {modal === 'categories' && state.kind === 'ready' && <CategoryDetailsModal loadCategories={isDemo ? undefined : loadCategories} currency={state.data.currency} categories={state.data.categories} month={state.data.month} onClose={() => setModal(null)} />}
    </div>
  );
}

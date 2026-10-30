import { useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryChart from '../components/CategoryChart';
import DashboardSkeleton from '../components/DashboardSkeleton';
import DashboardStatsCards from '../components/DashboardStatsCards';
import { formatMoney, formatPaymentDate, nearestPayments } from '../dashboard/model';
import { useDashboard, type DemoScenario } from '../dashboard/useDashboard';
import { useDashboardStats } from '../dashboard/useDashboardStats';

const scenarios: { value: DemoScenario; title: string }[] = [
  { value: 'data', title: 'Есть данные' }, { value: 'empty', title: 'Нет подписок' },
  { value: 'loading', title: 'Загрузка' }, { value: 'error', title: 'Ошибка' },
];
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f445db] px-5 py-3 text-sm text-white shadow-sm hover:bg-[#dc34c4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a91e9e]';

export default function Dashboard() {
  const [scenario, setScenario] = useState<DemoScenario>('data');
  const { state, isDemo, reload } = useDashboard(scenario);
  const stats = useDashboardStats(scenario);
  const payments = state.kind === 'ready' ? nearestPayments(state.data.upcoming) : [];
  return (
    <div className="max-w-[1200px]">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3" aria-label="Панель Dashboard">
        {isDemo && <p className="mr-auto text-xs text-[#687468]">Демо · тестовые данные</p>}
        <span title="Доступна сводка за месяц. Другие периоды пока не подключены." className="inline-flex min-h-11 items-center rounded-full border border-[#e1e5dc] bg-white px-5 text-sm text-[#183d20] shadow-sm">месяц</span>
        <Link to="/subscriptions/new" className={actionClass}><span aria-hidden="true">＋</span>Добавить подписку</Link>
      </div>
      <DashboardStatsCards state={stats.state} onRetry={() => {
        if (isDemo && scenario === 'error') setScenario('data');
        else stats.reload();
      }} />
      {!isDemo && <p className="rounded-3xl border border-[#e1e5dc] bg-white p-6 text-sm text-[#687468]">График расходов и ближайшие списания будут подключены отдельно. Демо доступно только в режиме разработки.</p>}
      {isDemo && state.kind === 'loading' && <DashboardSkeleton />}
      {isDemo && state.kind === 'error' && <section role="alert" className="rounded-3xl border border-[#cbdcc7] bg-white p-7">
        <h2 className="font-unbounded text-lg">Не удалось загрузить сводку</h2>
        <p className="mt-3 text-sm text-[#687468]">{state.message}</p>
        <button type="button" onClick={reload} className={`${actionClass} mt-5`}>Повторить загрузку</button>
      </section>}
      {state.kind === 'ready' && <div className="grid gap-5 lg:grid-cols-2">
        {state.data.subscriptionCount === 0 ? <section className="rounded-3xl border border-[#cbdcc7] bg-white p-8 text-center lg:col-span-2">
          <h2 className="font-unbounded text-xl">У вас пока нет подписок</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#687468]">Добавьте первую подписку, чтобы видеть расходы по категориям и ближайшие списания.</p>
          <Link to="/subscriptions/new" className={`${actionClass} mt-6`}>Добавить первую подписку</Link>
        </section> : <>
          <CategoryChart categories={state.data.categories} />
          <section className="rounded-3xl border border-[#cbdcc7] bg-white p-6 sm:p-7" aria-labelledby="upcoming-title">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 id="upcoming-title" className="font-unbounded text-lg text-[#101b10]">Ближайшие списания</h2><Link to="/subscriptions" className="rounded px-1 text-sm text-[#2e9b62] hover:underline focus-visible:outline-2 focus-visible:outline-green-700">Все</Link></div>
            {payments.length === 0 ? <p className="text-sm text-[#687468]">Предстоящих списаний нет.</p> : <ul aria-label="Топ-5 ближайших списаний" className="divide-y divide-[#edf0e8]">
              {payments.map((payment) => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0"><p className="break-words text-sm">{payment.name}</p><time dateTime={payment.date} className="mt-1 block text-xs text-[#687468]">{formatPaymentDate(payment.date)}</time></div>
                <p className="text-sm">{formatMoney(payment.amountMinor)}</p>
              </li>)}
            </ul>}
          </section>
        </>}
      </div>}
      {isDemo && <section aria-label="Режим демонстрации" className="mt-6 rounded-2xl border border-[#cbdcc7] bg-[#eef4e9] px-4 py-3 text-xs">
        <details>
          <summary className="cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-green-700">Состояния демонстрации</summary>
          <p className="mt-2 text-[#45643b]">Демо-данные — не реальные подписки. Backend пока не подключён.</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Состояния демо">
            {scenarios.map((item) => <button key={item.value} type="button" aria-pressed={scenario === item.value} onClick={() => setScenario(item.value)} className={`min-h-11 rounded-lg border px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-green-700 ${scenario === item.value ? 'border-[#285d25] bg-white text-[#285d25]' : 'border-transparent hover:bg-white'}`}>{item.title}</button>)}
          </div>
        </details>
      </section>}
    </div>
  );
}

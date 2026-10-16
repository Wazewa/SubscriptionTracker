import { useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryChart from '../components/CategoryChart';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { formatMoney, formatPaymentDate, nearestPayments } from '../dashboard/model';
import { useDashboard, type DemoScenario } from '../dashboard/useDashboard';

const scenarios: { value: DemoScenario; title: string }[] = [
  { value: 'data', title: 'Есть данные' }, { value: 'empty', title: 'Нет подписок' },
  { value: 'loading', title: 'Загрузка' }, { value: 'error', title: 'Ошибка' },
];
const actionClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#2e9b62] px-5 py-3 text-sm text-white hover:bg-[#257c4e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700';

export default function Dashboard() {
  const [scenario, setScenario] = useState<DemoScenario>('data');
  const { state, isDemo, reload } = useDashboard(scenario);
  const payments = state.kind === 'ready' ? nearestPayments(state.data.upcoming) : [];
  return (
    <div className="max-w-[1200px]">
      {isDemo && <section aria-label="Режим демонстрации" className="mb-6 rounded-2xl border border-[#cbdcc7] bg-[#eef4e9] p-4">
        <p className="text-sm">Демо-данные — не реальные подписки. Backend пока не подключён.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Состояния демо">
          {scenarios.map((item) => <button key={item.value} type="button" aria-pressed={scenario === item.value} onClick={() => setScenario(item.value)} className={`rounded-lg border px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-green-700 ${scenario === item.value ? 'border-[#285d25] bg-white text-[#285d25]' : 'border-transparent hover:bg-white'}`}>{item.title}</button>)}
        </div>
      </section>}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#687468]">Обзор ваших подписок</p>
        <Link to="/subscriptions/new" className={actionClass}><span aria-hidden="true">＋</span>Добавить подписку</Link>
      </div>
      {state.kind === 'loading' && <DashboardSkeleton />}
      {state.kind === 'error' && <section role="alert" className="rounded-3xl border border-[#cbdcc7] bg-white p-7">
        <h2 className="font-unbounded text-lg">Не удалось загрузить сводку</h2>
        <p className="mt-3 text-sm text-[#687468]">{state.message}</p>
        <button type="button" onClick={reload} className={`${actionClass} mt-5`}>Повторить загрузку</button>
      </section>}
      {state.kind === 'ready' && <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#cbdcc7] bg-[#eef4e9] p-6 sm:p-7 lg:col-span-2">
          <h2 className="text-sm text-[#45643b]">Сумма за месяц</h2>
          <p className="font-unbounded mt-3 break-words text-3xl text-[#123d12] sm:text-4xl">{formatMoney(state.data.totalMinor)}</p>
          <p className="mt-3 text-sm text-[#45643b]">{new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(`${state.data.month}-01T12:00:00`))}</p>
        </section>
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
    </div>
  );
}

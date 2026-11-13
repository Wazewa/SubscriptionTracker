import { useId } from 'react';
import { formatPaymentDate, nearestPayments, type UpcomingPayment } from '../dashboard/model';
import { formatStatsMoney } from '../dashboard/statsModel';

export type UpcomingPaymentsState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; payments: UpcomingPayment[] };

export function PaymentRows({ payments, currency = 'RUB' }: { payments: UpcomingPayment[]; currency?: string }) {
  return <table className="w-full table-fixed text-sm">
    <caption className="sr-only">Подписки, суммы и даты предстоящих платежей</caption>
    <thead className="sr-only"><tr><th scope="col">Подписка и категория</th><th scope="col">Сумма и дата списания</th></tr></thead>
    <tbody>
      {payments.map((payment) => <tr key={payment.id}>
        <td className="w-[62%] py-3 pr-2 align-middle">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e2f2e6] text-xs font-bold text-[#195637]">
              {Array.from(payment.name.trim()).slice(0, 2).join('').toLocaleUpperCase('ru-RU')}
            </span>
            <div className="min-w-0">
              <p className="break-words font-semibold text-[#101b10] [overflow-wrap:anywhere]">{payment.name}</p>
              <p className="mt-0.5 break-words text-xs text-[#687468] [overflow-wrap:anywhere]">{payment.categoryName ?? 'Категория не указана'}</p>
            </div>
          </div>
        </td>
        <td className="w-[38%] py-3 text-right align-middle">
          <p className="break-words font-semibold text-[#101b10] [overflow-wrap:anywhere]">{formatStatsMoney(payment.amountMinor, currency)}</p>
          <time dateTime={payment.date} className="mt-0.5 block text-[11px] text-[#687468]">{formatPaymentDate(payment.date)}</time>
        </td>
      </tr>)}
    </tbody>
  </table>;
}

export default function UpcomingPayments({ state, onRetry, onShowAll, today, currency = 'RUB' }: {
  state: UpcomingPaymentsState;
  onRetry: () => void;
  onShowAll?: () => void;
  today?: string;
  currency?: string;
}) {
  const titleId = useId();
  const rows = state.kind === 'ready' ? nearestPayments(state.payments, today) : [];
  return <section aria-labelledby={titleId} aria-busy={state.kind === 'loading'}
    className="relative min-w-0 rounded-3xl border border-[#e1e5dc] bg-white p-5 sm:p-6">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 id={titleId} className="font-unbounded text-lg text-[#285d25]">Ближайшие списания</h2>
      <button type="button" aria-label="Все ближайшие списания" aria-haspopup="dialog" onClick={onShowAll}
        disabled={!onShowAll || state.kind !== 'ready' || rows.length === 0}
        title={!onShowAll ? 'Полный список списаний скоро будет доступен' : undefined}
        className="min-h-11 rounded-lg px-2 text-sm text-[#2e9b62] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50">Все</button>
    </div>
    {state.kind === 'loading' && <>
      <p role="status" className="sr-only">Загружаем ближайшие списания…</p>
      <div aria-hidden="true">{[1, 2, 3, 4].map((row) => <div key={row} className="flex min-h-20 items-center gap-3">
        <div className="skeleton h-9 w-9 shrink-0 !rounded-full" />
        <div className="min-w-0 flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>
        <div className="w-16 space-y-2"><div className="skeleton h-4 w-full" /><div className="skeleton h-3 w-full" /></div>
      </div>)}</div>
    </>}
    {state.kind === 'unavailable' && <p role="status" className="py-6 text-sm leading-relaxed text-[#687468]">API ближайших списаний пока не подключён. Платежи появятся после интеграции с backend.</p>}
    {state.kind === 'error' && <div role="alert" className="py-6 text-sm text-[#687468]">
      <p>Не удалось загрузить ближайшие списания.</p>
      <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg px-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-green-700">Повторить загрузку списаний</button>
    </div>}
    {state.kind === 'ready' && (rows.length > 0 ? <PaymentRows payments={rows} currency={currency} /> : <p role="status" className="py-6 text-sm text-[#687468]">Предстоящих списаний нет.</p>)}
    {state.kind === 'ready' && rows.length > 0 && !onShowAll && <p className="mt-3 text-xs leading-relaxed text-[#687468]">Полный список списаний скоро будет доступен.</p>}
  </section>;
}

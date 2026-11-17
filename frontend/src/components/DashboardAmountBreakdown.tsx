import { useId } from 'react';
import { formatStatsMoney } from '../dashboard/statsModel';
import { breakdownGroups, type AmountBreakdown } from '../dashboard/amountBreakdownModel';
import { dashboardRetryClass } from './DashboardBlockHeader';

type BreakdownState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: AmountBreakdown };
const pluralRules = new Intl.PluralRules('ru-RU');
const countLabel = (count: number) => `${count} ${{ one: 'подписка', few: 'подписки', many: 'подписок', other: 'подписки', zero: 'подписок', two: 'подписки' }[pluralRules.select(count)]}`;

export default function DashboardAmountBreakdown({ state, onRetry }: {
  state: BreakdownState;
  onRetry: () => void;
}) {
  const titleId = useId();
  const empty = state.kind === 'ready' && state.data.groups.every(group => group.count === 0);

  return (
    <section aria-labelledby={titleId} aria-busy={state.kind === 'loading'}
      className="mb-4 min-w-0 rounded-3xl border border-[#e1e5dc] bg-white p-5 sm:p-6">
      <h2 id={titleId} className="font-unbounded break-words text-base leading-snug text-[#285d25] sm:text-lg">
        Из чего складывается сумма — по периодичности
      </h2>
      {state.kind === 'loading' && <>
        <p role="status" className="sr-only">Загружаем разбивку по периодичности…</p>
        <div aria-hidden="true">
          <div className="skeleton mt-3 h-3.5 w-full !rounded-full" />
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-5">
            {breakdownGroups.map((item) => <div key={item.id} className="min-w-0 rounded-3xl border border-[#e1e5dc] bg-white px-3 py-3 shadow-[0_2px_5px_rgba(25,44,22,0.12)]">
              <div className="skeleton h-3 w-3/4" />
              <div className="mt-2 flex justify-between gap-2"><div className="skeleton h-3 w-1/2" /><div className="skeleton h-3 w-6" /></div>
              <div className="skeleton mt-2 h-7 w-3/4" />
            </div>)}
          </div>
        </div>
      </>}
      {state.kind === 'error' && <div role="alert" className="py-6 text-sm text-[#687468]">
        <p>Не удалось загрузить разбивку по периодичности.</p>
        <button type="button" onClick={onRetry} className={dashboardRetryClass}>Повторить загрузку</button>
      </div>}
      {state.kind === 'ready' && empty && <p role="status" className="py-6 text-sm text-[#687468]">Нет данных для разбивки по периодичности.</p>}
      {state.kind === 'ready' && !empty && <>
      <div aria-hidden="true" className="mt-3 flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-[#eef4e9]">
        {state.data.groups.filter(item => item.amountMinor > 0).map((item) => (
          <span key={item.title} className="min-w-0 rounded-full"
            style={{ backgroundColor: item.color, flex: `${item.amountMinor} 1 0%` }} />
        ))}
      </div>

      <ul className="mt-3 grid min-w-0 grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-5">
        {state.data.groups.map((item) => (
          <li key={item.title} className="min-w-0 rounded-3xl border border-[#e1e5dc] bg-white px-3 py-3 shadow-[0_2px_5px_rgba(25,44,22,0.12)]">
            <div className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 h-[10px] min-w-[10px] w-[10px] flex-none rounded-full" style={{ backgroundColor: item.color }} />
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-xs leading-snug text-[#285d25]">{item.title}</h3>
                <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] leading-snug text-[#687468]">
                  <span>{countLabel(item.count)}</span>
                  <span aria-label={`Доля: ${item.percentage}%`}>{item.percentage}%</span>
                </div>
              </div>
            </div>
            <p className="font-unbounded mt-1 pl-2 break-words text-[clamp(1.25rem,2.3vw,1.75rem)] leading-tight tracking-tight text-[#195637] [overflow-wrap:anywhere]">
              {formatStatsMoney(item.amountMinor, state.data.currency)}
            </p>
          </li>
        ))}
      </ul>
      </>}
    </section>
  );
}

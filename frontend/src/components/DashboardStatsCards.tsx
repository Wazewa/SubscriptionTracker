import { localDateKey } from '../dashboard/model';
import { formatStatsMoney, scheduledChargesTitle, type DashboardStatsState } from '../dashboard/statsModel';

export default function DashboardStatsCards({ state, onRetry }: {
  state: DashboardStatsState;
  onRetry: () => void;
}) {
  const month = state.kind === 'ready' ? state.data.month : localDateKey().slice(0, 7);
  const period = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
    .format(new Date(`${month}-01T12:00:00`));
  const cards = [
    {
      id: 'monthly-equivalent', title: 'Подписки обходятся в месяц',
      amount: state.kind === 'ready' ? state.data.monthlyEquivalentMinor : undefined,
      description: 'Средняя стоимость активных подписок, приведённая к месяцу.',
      primary: true,
    },
    {
      id: 'scheduled-charges', title: scheduledChargesTitle(month),
      amount: state.kind === 'ready' ? state.data.scheduledChargesMinor : undefined,
      description: 'Сумма списаний по календарю месяца, а не подтверждение оплаты.',
      primary: false,
    },
  ];

  return (
    <section aria-label="Карточки статистики подписок" aria-busy={state.kind === 'loading'} className="relative mb-4">
      <p className="sr-only">Период сводки: {period}</p>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.id} aria-labelledby={`${card.id}-title`} aria-describedby={`${card.id}-description`}
            className={`relative flex min-h-[164px] min-w-0 flex-col rounded-[26px] border px-5 py-4 shadow-[0_2px_5px_rgba(25,44,22,0.12)] sm:px-6 ${card.primary
              ? 'border-[#176b39] bg-[#176b39] text-white'
              : 'border-[#e1e5dc] bg-white text-[#101b10]'}`}>
            <h2 id={`${card.id}-title`} className={`break-words text-sm leading-snug sm:text-base ${card.primary ? 'text-white' : 'text-[#285d25]'}`}>{card.title}</h2>
            {state.kind === 'loading'
              ? <div aria-hidden="true" className={`skeleton mb-2 mt-1 h-12 w-3/4 max-w-60 ${card.primary ? '!bg-white/25' : ''}`} />
              : <p className="font-unbounded mb-1 mt-1 break-words text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.15] tracking-tight [overflow-wrap:anywhere]">
                {card.amount === undefined ? <><span aria-hidden="true">—</span><span className="sr-only">Данные недоступны</span></> : formatStatsMoney(card.amount)}
              </p>}
            <p id={`${card.id}-description`} className="sr-only">{card.description}</p>
            <p className={`text-[11px] leading-snug ${card.primary ? 'text-[#d5eadc]' : 'text-[#45643b]'}`}>в сравнении с прошлым месяцем</p>
            <span title="Нет данных для сравнения с прошлым месяцем" className={`mt-2 inline-flex min-h-6 w-fit items-center rounded-full px-3 py-1 text-[11px] leading-none ${card.primary
              ? 'bg-white/15 text-white' : 'bg-[#f445db] text-white'}`}>
              <span aria-hidden="true">—</span><span className="ml-1.5">нет данных</span>
            </span>
          </article>
        ))}
      </div>
      {state.kind === 'loading' && <p role="status" className="sr-only">Загружаем суммы по подпискам…</p>}
      {state.kind === 'unavailable' && <p role="status" className="mt-3 rounded-xl border border-[#cbdcc7] bg-[#eef4e9] p-4 text-sm text-[#285d25]">
        API статистики ещё не подключён. Суммы появятся после интеграции с backend — прочерки не означают нулевые расходы.
      </p>}
      {state.kind === 'error' && <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>Не удалось загрузить суммы по подпискам. Проверьте соединение и повторите загрузку.</p>
        <button type="button" onClick={onRetry} className="mt-2 min-h-11 rounded-lg px-2 py-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">Повторить загрузку сумм</button>
      </div>}
    </section>
  );
}

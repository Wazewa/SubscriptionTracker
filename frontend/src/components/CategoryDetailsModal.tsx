import { useEffect, useId, useState } from 'react';
import DashboardModal from './DashboardModal';
import { Link } from 'react-router-dom';
import { categorySegments } from '../dashboard/categoryChartModel';
import {
  categoryPercentages,
  formatMoney,
  type CategoryTotal,
} from '../dashboard/model';

type CategoryDetailsModalProps = {
  categories: CategoryTotal[];
  currency?: string;
  loadCategories?: (month: string, signal: AbortSignal) => Promise<CategoryTotal[]>;
  month: string;
  onClose: () => void;
};

function formatMonth(month: string) {
  const value = new Date(`${month}-01T00:00:00`);
  const result = value.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  return result.charAt(0).toUpperCase() + result.slice(1);
}

// Последние 12 месяцев, включая текущий.
function getAvailableMonths(currentMonth: string) {
  const months: string[] = [];
  const [year, month] = currentMonth.split('-').map(Number);
  const currentIndex = year * 12 + month - 1;

  for (let offset = 0; offset < 12; offset += 1) {
    const index = currentIndex - offset;
    const itemYear = Math.floor(index / 12);
    const itemMonth = (index % 12) + 1;

    months.push(`${itemYear}-${String(itemMonth).padStart(2, '0')}`);
  }

  return months;
}

export default function CategoryDetailsModal({
  categories,
  currency = 'RUB',
  loadCategories,
  month,
  onClose,
}: CategoryDetailsModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(month);

  const titleId = useId();
  const periodId = useId();
  const availableMonths = getAvailableMonths(month);

  const [result, setResult] = useState<{ month: string; kind: 'loading' | 'error' | 'ready'; rows: CategoryTotal[] }>({ month, kind: 'ready', rows: categories });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (selectedMonth === month || !loadCategories) return;
    const controller = new AbortController();
    setResult({ month: selectedMonth, kind: 'loading', rows: [] });
    loadCategories(selectedMonth, controller.signal).then(rows => {
      if (!controller.signal.aborted) setResult({ month: selectedMonth, kind: 'ready', rows });
    }).catch(() => { if (!controller.signal.aborted) setResult({ month: selectedMonth, kind: 'error', rows: [] }); });
    return () => controller.abort();
  }, [selectedMonth, month, loadCategories, attempt]);
  const current = selectedMonth === month ? { kind: 'ready', rows: categories }
    : result.month === selectedMonth ? result : { kind: 'loading', rows: [] };
  const hasDataForSelectedMonth = selectedMonth === month || (!!loadCategories && current.kind === 'ready');
  const segments = hasDataForSelectedMonth ? categorySegments(current.rows) : [];
  const percentages = categoryPercentages(segments.map(segment => segment.category));
  const totalMinor = hasDataForSelectedMonth ? current.rows.reduce((sum, c) => sum + c.amountMinor, 0) : 0;

  return (
    <DashboardModal titleId={titleId} onClose={onClose}>
        <header className="shrink-0 px-6 pb-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h2
              id={titleId} tabIndex={-1}
              className="font-unbounded text-[22px] font-bold leading-tight text-[#101b10]"
            >
              Расходы по категориям
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть окно"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-3xl leading-none text-[#287b4b] transition-colors hover:bg-[#eef4e9] focus-visible:outline-2 focus-visible:outline-[#195637]"
            >
              ×
            </button>
          </div>

          <p className="text-sm font-medium text-[#89918a]">
            Распределение расходов за выбранный месяц
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <div className="relative mb-4 rounded-2xl border border-[#e8e9f1] px-3 py-2 shadow-[0_3px_10px_rgba(35,45,80,0.10)]">
            <label
              htmlFor={periodId}
              className="block text-sm font-semibold text-[#252b27]"
            >
              Период
            </label>

            <div className="relative">
              <select
                id={periodId}
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="min-h-11 w-full cursor-pointer appearance-none border-0 bg-transparent pr-8 text-sm font-bold text-[#287b4b] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#195637]"
              >
                {availableMonths.map((availableMonth) => (
                  <option key={availableMonth} value={availableMonth}>
                    {formatMonth(availableMonth)}
                  </option>
                ))}
              </select>

              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[#287b4b]"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {loadCategories && selectedMonth !== month && current.kind === 'loading' ? <p role="status" className="skeleton p-6">Загрузка категорий…</p>
          : loadCategories && selectedMonth !== month && current.kind === 'error' ? <div role="alert" className="p-5 text-sm"><p>Не удалось загрузить категории.</p><button type="button" className="min-h-11 underline" onClick={() => setAttempt(v => v + 1)}>Повторить загрузку категорий</button></div>
          : !hasDataForSelectedMonth ? (
            <div className="rounded-2xl bg-[#f5f7f2] p-6 text-center">
              <p className="text-sm font-semibold text-[#252b27]">
                Данные за {formatMonth(selectedMonth).toLowerCase()} пока
                недоступны.
              </p>
              <p className="mt-2 text-xs text-[#687468]">
                Историческая статистика появится после подключения данных за
                выбранный период.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 px-3">
                <p className="text-sm font-semibold text-[#252b27]">
                  Всего за месяц
                </p>
                <p className="text-2xl font-bold leading-tight text-[#287b4b]">
                  {formatMoney(totalMinor, currency)}
                </p>
              </div>

              {segments.length === 0 ? (
                <p className="rounded-2xl bg-[#f5f7f2] p-5 text-center text-sm text-[#687468]">
                  За этот месяц расходов нет.
                </p>
              ) : (
                <div className="space-y-3 rounded-2xl border border-[#e8e9f1] p-3 shadow-[0_3px_10px_rgba(35,45,80,0.10)]">
                  {segments.map(({ category, color }, index) => (
                    <div key={category.id}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="min-w-0 break-words [overflow-wrap:anywhere] text-sm font-semibold text-[#252b27]">
                          {category.name}
                        </p>
                        <p className="shrink-0 text-sm font-bold text-[#252b27]">
                          {formatMoney(category.amountMinor, currency)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e7e7e7]"
                          role="progressbar"
                          aria-label={`Доля расходов: ${category.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percentages[index]}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentages[index]}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>

                        <span
                          className="w-10 shrink-0 text-right text-xs font-bold"
                          style={{ color }}
                        >
                          {percentages[index]}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="shrink-0 px-6 pb-5 pt-2">
          <Link
            to="/subscriptions"
            onClick={onClose}
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#2e9b62] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#247e4e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#195637]"
          >
            Все подписки
          </Link>
        </footer>
    </DashboardModal>
  );
}

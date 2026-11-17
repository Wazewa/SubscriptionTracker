import { useId, useState } from 'react';
import DashboardBlockHeader, { dashboardRetryClass } from './DashboardBlockHeader';
import DashboardSkeleton from './DashboardSkeleton';
import { categorySegments } from '../dashboard/categoryChartModel';
import {
  categoryPercentages,
  formatMoney,
  type CategoryTotal,
} from '../dashboard/model';

type CategoryChartProps = {
  categories: CategoryTotal[];
  currency?: string;
  onOpenDetails?: () => void;
  kind?: 'loading' | 'error' | 'ready';
  onRetry?: () => void;
  errorMessage?: string;
  noSubscriptions?: boolean;
};

export default function CategoryChart({
  categories,
  currency = 'RUB',
  onOpenDetails,
  kind = 'ready',
  onRetry,
  errorMessage,
  noSubscriptions = false,
}: CategoryChartProps) {
  const titleId = useId();
  const detailId = useId();

  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const segments = categorySegments(kind === 'ready' && !noSubscriptions ? categories : []);
  const percentages = categoryPercentages(
    segments.map((segment) => segment.category),
  );

  const activeId = hovered ?? focused ?? selected;
  const activeIndex = segments.findIndex(
    (segment) => segment.category.id === activeId,
  );
  const active = segments[activeIndex];

  const toggle = (id: string) => {
    setSelected((previous) => (previous === id ? null : id));
  };

  return (
    <section
      className="min-w-0 rounded-3xl border border-[#e1e5dc] bg-white p-6 sm:p-7"
      aria-labelledby={titleId}
      aria-busy={kind === 'loading'}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setHovered(null);
          setFocused(null);
          setSelected(null);
        }
      }}
    >
      <DashboardBlockHeader titleId={titleId} title="Расходы по категориям" action="Подробнее"
        onAction={onOpenDetails} disabled={!onOpenDetails || kind !== 'ready' || segments.length === 0} />

      {kind === 'loading' ? <DashboardSkeleton /> : kind === 'error' ? (
        <div role="alert" className="py-6 text-sm text-[#687468]">
          <p>{errorMessage || 'Не удалось загрузить сводку.'}</p>
          <button type="button" onClick={onRetry} className={dashboardRetryClass}>Повторить загрузку</button>
        </div>
      ) : segments.length === 0 ? (
        <p role="status" className="py-6 text-sm text-[#687468]">
          {noSubscriptions ? 'У вас пока нет подписок' : 'За этот месяц нет расходов для диаграммы.'}
        </p>
      ) : (
        <>
          <div
            className="mx-auto mb-3 mt-7 max-w-full"
            onPointerLeave={() => setHovered(null)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 200 200"
              className="mx-auto h-44 w-44 max-w-full"
            >
              {segments.map((segment) => (
                <path
                  key={segment.category.id}
                  d={segment.path}
                  fill={segment.color}
                  fillOpacity={
                    active && active.category.id !== segment.category.id
                      ? 0.45
                      : 1
                  }
                  className="cursor-pointer"
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch') {
                      setFocused(null);
                      setHovered(segment.category.id);
                    }
                  }}
                  onClick={() => { toggle(segment.category.id); onOpenDetails?.(); }}
                />
              ))}
            </svg>

            <div
              id={detailId}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-3 flex min-h-20 min-w-0 flex-col items-center justify-center rounded-2xl bg-[#f5f7f2] px-3 py-2 text-center text-sm"
            >
              {active ? (
                <>
                  <p className="max-w-full break-words text-[#285d25] [overflow-wrap:anywhere]">
                    {active.category.name}
                  </p>
                  <p className="mt-1 max-w-full break-words text-[#101b10]">
                    {formatMoney(active.category.amountMinor, currency)} ·{' '}
                    {percentages[activeIndex]}%
                  </p>
                </>
              ) : (
                <p className="text-xs leading-relaxed text-[#687468]">
                  Наведите на сегмент
                  <br />
                  или выберите категорию ниже
                </p>
              )}
            </div>
          </div>

          <ul
            className="space-y-1"
            aria-label="Расходы по категориям: суммы и доли"
          >
            {segments.map(({ category, color }, index) => (
              <li key={category.id}>
                <button
                  type="button"
                  aria-pressed={selected === category.id}
                  aria-controls={detailId}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch') {
                      setFocused(null);
                      setHovered(category.id);
                    }
                  }}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => {
                    setHovered(null);
                    setFocused(category.id);
                  }}
                  onBlur={() => setFocused(null)}
                  onClick={() => { toggle(category.id); onOpenDetails?.(); }}
                  className={`flex min-h-11 w-full flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#195637] ${
                    active?.category.id === category.id
                      ? 'bg-[#eef4e9]'
                      : 'hover:bg-[#f5f7f2]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="break-words [overflow-wrap:anywhere]">
                      {category.name}
                    </span>
                  </span>

                  <span>
                    {formatMoney(category.amountMinor, currency)} · {percentages[index]}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

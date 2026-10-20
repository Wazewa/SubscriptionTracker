
import { useState } from 'react';
import { formatPaymentDate } from '../dashboard/model';
import { formatSubscriptionMoney, periodLabels, type Subscription } from '../subscriptions/model';
import editIcon from '../assets/icons/edit.svg';
import deleteIcon from '../assets/icons/delete.svg';
import DeleteConfirmModal from './DeleteConfirmModal';

type Props = {
  rows: Subscription[];
  loading?: boolean;
  filtered?: boolean;
  onEdit?: (subscription: Subscription) => void;
  isDemo?: boolean;
  onDelete: (subscription: Subscription, token: string, signal: AbortSignal) => Promise<void>;
};

const headings = [
  'Название',
  'Цена/мес',
  'Категория',
  'Дата списания',
  'Активность',
  '',
];

export default function SubscriptionsTable({
  rows,
  loading = false,
  filtered = false,
  onEdit,
  onDelete,
  isDemo = false,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  return (
    <>
      <section
        aria-label="Список подписок"
        aria-busy={loading}
        className="overflow-hidden rounded-3xl border border-[#e1e5dc] bg-white"
      >
        {loading && (
          <p role="status" className="sr-only">
            Загрузка подписок…
          </p>
        )}

        <div
          className="overflow-x-auto rounded-3xl focus-visible:outline-2 focus-visible:outline-green-700"
          tabIndex={0}
          role="region"
          aria-label="Таблица подписок, доступна горизонтальная прокрутка"
        >
          <table className="w-full min-w-[800px] text-left text-sm">
            <caption className="sr-only">
              Ваши подписки, стоимость за месяц и ближайшие списания
            </caption>

            <thead className="bg-[#eef4e9] text-[#45643b]">
              <tr>
                {headings.map((title, index) => (
                  <th
                    key={`${title}-${index}`}
                    scope="col"
                    className="px-5 py-4"
                  >
                    {title || <span className="sr-only">Действия</span>}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#edf0e8]">
              {loading
                ? Array.from({ length: 5 }, (_, index) => (
                    <tr key={index} aria-hidden="true">
                      {headings.map((title, columnIndex) => (
                        <td
                          key={`${title}-${columnIndex}`}
                          className="px-5 py-5"
                        >
                          <div className="skeleton h-5 w-full max-w-32" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#f8faf5]">
                      <th
                        scope="row"
                        className="max-w-64 break-words px-5 py-5"
                      >
                        <span className="block">{row.name}</span>
                        <span className="mt-1 block text-xs text-[#687468]">
                          {periodLabels[row.period]}{row.period === 'custom' ? `: ${row.periodDays} дн.` : ''}
                        </span>
                      </th>

                      <td className="whitespace-nowrap px-5 py-5">
                        {row.monthlyPriceMinor === null ? '—' : formatSubscriptionMoney(row.monthlyPriceMinor, row.currency)}
                        {row.period !== 'monthly' && <span className="mt-1 block text-xs text-[#687468]">{formatSubscriptionMoney(row.amountMinor, row.currency)} за период</span>}
                      </td>

                      <td className="max-w-48 break-words px-5 py-5">
                        {row.category}
                      </td>

                      <td className="whitespace-nowrap px-5 py-5">
                        <time dateTime={row.nextPaymentDate}>
                          {formatPaymentDate(row.nextPaymentDate)}
                        </time>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                            row.active
                              ? 'bg-[#e7f3e9] text-[#236337]'
                              : 'bg-[#f0f1ee] text-[#606960]'
                          }`}
                        >
                          {{ ACTIVE: 'Активна', PAUSED: 'Приостановлена', CANCELLED: 'Отменена' }[row.status]}
                        </span>
                      </td>

                      <td className="px-3 py-5">
                        <div className="flex flex-col items-end" onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenuId(null);
                        }} onKeyDown={(event) => {
                          if (event.key === 'Escape') { setOpenMenuId(null); event.currentTarget.querySelector('button')?.focus(); }
                        }}>
                          <button
                            id={`subscription-actions-${row.id}`}
                            type="button"
                            aria-label={`Действия для подписки ${row.name}`}
                            aria-controls={openMenuId === row.id ? `subscription-menu-${row.id}` : undefined}
                            aria-expanded={openMenuId === row.id}
                            onClick={() =>
                              setOpenMenuId((current) =>
                                current === row.id ? null : row.id,
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-[#315c35] hover:bg-[#eef4e9] focus-visible:outline-2 focus-visible:outline-green-700"
                          >
                            ⋮
                          </button>

                          {openMenuId === row.id && (
                            <div
                              id={`subscription-menu-${row.id}`}
                              role="group"
                              aria-label={`Управление подпиской ${row.name}`}
                              className="mt-1 w-48 rounded-xl border border-[#e1e5dc] bg-white p-2 shadow-lg"
                            >
                              <p className="border-b border-[#edf0e8] px-3 py-2 text-xs font-semibold text-[#687468]">
                                Управление подпиской
                              </p>

                              <button
                                type="button"
                                disabled={!onEdit}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onEdit?.(row);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#315c35] hover:bg-[#eef4e9] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <img
                                  src={editIcon}
                                  alt=""
                                  aria-hidden="true"
                                  className="h-4 w-4 object-contain"
                                />
                                Изменить
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDeleteTarget(row);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <img
                                  src={deleteIcon}
                                  alt=""
                                  aria-hidden="true"
                                  className="h-4 w-4 object-contain"
                                />
                                Удалить
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={headings.length}
                    className="px-5 py-12 text-center"
                  >
                    <p role="status" className="font-unbounded text-lg">
                      {filtered ? 'Ничего не найдено' : 'Подписок нет'}
                    </p>
                    <p className="mt-3 text-sm text-[#687468]">
                      {filtered
                        ? 'Измените условия поиска или сбросьте фильтры.'
                        : 'Добавьте первую подписку с помощью кнопки выше.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {deleteTarget && <DeleteConfirmModal subscription={deleteTarget} isDemo={isDemo} onDelete={onDelete} onClose={() => {
        const buttonId = `subscription-actions-${deleteTarget.id}`;
        setDeleteTarget(null);
        window.requestAnimationFrame(() => (document.getElementById(buttonId) || document.querySelector<HTMLElement>('[aria-label="Таблица подписок, доступна горизонтальная прокрутка"]'))?.focus());
      }} />}
    </>
  );
}

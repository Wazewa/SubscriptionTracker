import { useId } from 'react';
import DashboardModal from './DashboardModal';
import { Link } from 'react-router-dom';
import {
  formatMoney,
  futurePayments,
  formatPaymentDate,
  type UpcomingPayment,
} from '../dashboard/model';

type UpcomingPaymentsModalProps = {
  payments: UpcomingPayment[];
  currency?: string;
  onClose: () => void;
};

function formatMonth(date: string) {
  const value = new Date(`${date}T00:00:00`);
  const month = value.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  return month.charAt(0).toUpperCase() + month.slice(1);
}

export default function UpcomingPaymentsModal({
  payments,
  currency = 'RUB',
  onClose,
}: UpcomingPaymentsModalProps) {
  const titleId = useId();
  const sortedPayments = futurePayments(payments);

  const totalMinor = sortedPayments.reduce(
    (sum, payment) => sum + payment.amountMinor,
    0,
  );

  const groupedPayments = sortedPayments.reduce<
    { month: string; items: UpcomingPayment[] }[]
  >((groups, payment) => {
    const month = payment.date.slice(0, 7);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.month === month) {
      lastGroup.items.push(payment);
    } else {
      groups.push({ month, items: [payment] });
    }

    return groups;
  }, []);

  return (
    <DashboardModal titleId={titleId} onClose={onClose}>
        <header className="shrink-0 px-6 pb-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h2
              id={titleId} tabIndex={-1}
              className="font-unbounded text-[22px] font-bold leading-tight text-[#101b10]"
            >
              Все ближайшие списания
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

          <p className="mt-1 text-sm font-medium text-[#89918a]">
            Предстоящие платежи по вашим подпискам
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          {groupedPayments.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#687468]">
              Предстоящих списаний нет.
            </p>
          ) : (
            <div className="space-y-5">
              {groupedPayments.map((group) => (
                <section key={group.month}>
                  <h3 className="mb-2 px-1 text-sm font-bold text-[#287b4b]">
                    {formatMonth(`${group.month}-01`)}
                  </h3>

                  <ul className="space-y-2">
                    {group.items.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex min-h-[62px] items-center justify-between gap-3 rounded-2xl border border-[#e8e9f1] bg-white px-3 py-2 shadow-[0_3px_10px_rgba(35,45,80,0.10)]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e7f3e9] text-sm font-bold text-[#287b4b]"
                          >
                            {payment.name.trim().charAt(0).toUpperCase()}
                          </span>

                          <div className="min-w-0 break-words [overflow-wrap:anywhere] text-sm font-semibold text-[#252b27]">
                            <p>{payment.name}</p>
                            <p className="text-xs font-normal text-[#89918a]">{payment.categoryName ?? 'Категория не указана'}</p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-[#252b27]">
                            {formatMoney(payment.amountMinor, currency)}
                          </p>
                          <time
                            dateTime={payment.date}
                            className="mt-0.5 block text-xs text-[#89918a]"
                          >
                            {formatPaymentDate(payment.date)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-[#edf0e8] bg-white px-6 pb-5 pt-3">
          <p className="mb-3 text-sm font-bold text-[#252b27]">
            Итого предстоящих платежей: {formatMoney(totalMinor, currency)}
          </p>

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

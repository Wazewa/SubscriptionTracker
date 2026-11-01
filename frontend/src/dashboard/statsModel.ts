// Internal view model. This is not a backend DTO or an agreed API contract.
// Values are independent aggregates in integer kopecks, not fractional rubles.
export type DashboardStats = {
  month: string;
  currency: 'RUB';
  monthlyEquivalentMinor: number;
  scheduledChargesMinor: number;
};

export type DashboardStatsState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; data: DashboardStats };

// A future API adapter must map the agreed server response to this view model.
export type DashboardStatsLoader = (signal: AbortSignal) => Promise<unknown>;

export function isStatsMonth(value: unknown): value is string {
  return typeof value === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function validateDashboardStats(value: unknown): DashboardStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Некорректные данные карточек статистики.');
  }
  const data = value as Record<string, unknown>;
  const validMoney = (amount: unknown): amount is number =>
    typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0;
  if (!isStatsMonth(data.month) || data.currency !== 'RUB'
    || !validMoney(data.monthlyEquivalentMinor) || !validMoney(data.scheduledChargesMinor)) {
    throw new Error('Некорректные данные карточек статистики.');
  }
  return {
    month: data.month, currency: data.currency,
    monthlyEquivalentMinor: data.monthlyEquivalentMinor,
    scheduledChargesMinor: data.scheduledChargesMinor,
  };
}

export function scheduledChargesTitle(month: string): string {
  if (!isStatsMonth(month)) throw new Error('Некорректный месяц статистики.');
  const months = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
    'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  return `Реально спишется в ${months[Number(month.slice(5)) - 1]}`;
}

export function formatStatsMoney(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error('Некорректная сумма статистики.');
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(minor / 100);
}

export async function loadDashboardStats(
  loader: DashboardStatsLoader | undefined, signal: AbortSignal,
): Promise<DashboardStatsState> {
  const checkCancelled = () => {
    if (signal.aborted) throw new DOMException('Запрос отменён.', 'AbortError');
  };
  checkCancelled();
  if (!loader) return { kind: 'unavailable' };
  const value = await loader(signal);
  checkCancelled();
  return { kind: 'ready', data: validateDashboardStats(value) };
}

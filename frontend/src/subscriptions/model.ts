// Frontend model. The backend response contract still needs agreement (#34).
export type Subscription = {
  id: string;
  name: string;
  monthlyPriceMinor: number;
  currency: 'RUB';
  category: string;
  period: 'monthly' | 'yearly';
  nextPaymentDate: string;
  active: boolean;
};
export type SubscriptionFilters = { search: string; category: string; period: string };
export const periodLabels = { monthly: 'Ежемесячно', yearly: 'Ежегодно' };

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4))
    && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
}

export function parseSubscriptions(value: unknown): Subscription[] {
  if (!Array.isArray(value)) throw new Error('Некорректный формат списка подписок.');
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Некорректные данные подписки.');
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id)
      || typeof row.name !== 'string' || !row.name.trim()
      || typeof row.monthlyPriceMinor !== 'number' || !Number.isSafeInteger(row.monthlyPriceMinor) || row.monthlyPriceMinor < 0
      || row.currency !== 'RUB' || typeof row.category !== 'string' || !row.category.trim()
      || (row.period !== 'monthly' && row.period !== 'yearly')
      || !validDate(row.nextPaymentDate) || typeof row.active !== 'boolean') {
      throw new Error('Некорректные данные подписки.');
    }
    ids.add(row.id);
    return { id: row.id, name: row.name, monthlyPriceMinor: row.monthlyPriceMinor, currency: row.currency,
      category: row.category, period: row.period, nextPaymentDate: row.nextPaymentDate, active: row.active };
  });
}

export function filterSubscriptions(rows: Subscription[], filters: SubscriptionFilters): Subscription[] {
  const query = filters.search.trim().toLocaleLowerCase('ru-RU');
  return rows.filter((row) => row.name.toLocaleLowerCase('ru-RU').includes(query)
    && (!filters.category || row.category === filters.category)
    && (!filters.period || row.period === filters.period));
}

export const periodLabels = { weekly: 'Еженедельно', monthly: 'Ежемесячно', yearly: 'Ежегодно', custom: 'Свой период' };
export type Period = keyof typeof periodLabels;
export const currencies = ['RUB', 'USD', 'EUR', 'CNY'] as const;
export type Currency = typeof currencies[number];
export type Category = { id: string; name: string; description: string };
export type Subscription = {
  id: string; name: string; amountMinor: number; monthlyPriceMinor: number | null; currency: Currency;
  categoryId: string; category: string; period: Period; periodDays: number | null;
  nextPaymentDate: string; active: boolean; status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
};
export type SubscriptionFilters = { search: string; category: string; period: string };
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4))
    && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
}
export function localDateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function validId(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
export function parseCategories(value: unknown): Category[] {
  if (!Array.isArray(value)) throw new Error('Некорректный формат категорий.');
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    const row = item as Record<string, unknown> | null;
    if (!row || !validId(row.categoryId) || ids.has(String(row.categoryId)) || typeof row.name !== 'string' || !row.name.trim()
      || (row.description != null && typeof row.description !== 'string')) throw new Error('Некорректные данные категории.');
    ids.add(String(row.categoryId));
    return { id: String(row.categoryId), name: row.name, description: (row.description as string) || '' };
  });
}
export function parseSubscriptions(value: unknown, categories: Category[] = []): Subscription[] {
  if (!Array.isArray(value)) throw new Error('Некорректный формат списка подписок.');
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    const row = item as Record<string, unknown> | null;
    if (!row || !validId(row.id) || ids.has(String(row.id)) || typeof row.name !== 'string' || !row.name.trim()
      || typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount <= 0
      || !Number.isSafeInteger(Math.round(row.amount * 100)) || Math.round(row.amount * 100) <= 0 || Math.abs(row.amount * 100 - Math.round(row.amount * 100)) > 0.00001
      || !currencies.includes(row.currency as Currency) || !validId(row.categoryId)
      || typeof row.period !== 'string' || !['WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'].includes(row.period)
      || (row.period === 'CUSTOM' ? !validId(row.periodDays) || row.periodDays > 2147483647 : row.periodDays != null)
      || !validDate(row.nextPaymentDate) || typeof row.status !== 'string' || !['ACTIVE', 'PAUSED', 'CANCELLED'].includes(row.status)) throw new Error('Некорректные данные подписки.');
    ids.add(String(row.id));
    const amountMinor = Math.round(row.amount * 100);
    return { id: String(row.id), name: row.name, amountMinor,
      monthlyPriceMinor: row.period === 'MONTHLY' ? amountMinor : null,
      currency: row.currency as Currency, categoryId: String(row.categoryId),
      category: categories.find((category) => category.id === String(row.categoryId))?.name || `Категория №${row.categoryId}`,
      period: String(row.period).toLowerCase() as Period, periodDays: (row.periodDays as number | null) ?? null,
      nextPaymentDate: row.nextPaymentDate, active: row.status === 'ACTIVE', status: row.status as Subscription['status'] };
  });
}
export function filterSubscriptions(rows: Subscription[], filters: SubscriptionFilters): Subscription[] {
  const query = filters.search.trim().toLocaleLowerCase('ru-RU');
  return rows.filter((row) => row.name.toLocaleLowerCase('ru-RU').includes(query)
    && (!filters.category || row.categoryId === filters.category) && (!filters.period || row.period === filters.period));
}
export function formatSubscriptionMoney(minor: number, currency: Currency) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100);
}

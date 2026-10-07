// Internal frontend model, not an agreed backend API contract.
// All monetary values are integer minor units (kopecks for RUB).
export type CategoryTotal = { id: string; name: string; amountMinor: number };
export type UpcomingPayment = { id: string; name: string; date: string; amountMinor: number };
export type DashboardData = {
  month: string;
  currency: string;
  subscriptionCount: number;
  totalMinor: number;
  categories: CategoryTotal[];
  upcoming: UpcomingPayment[];
};

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value;
}

export function validateDashboard(data: DashboardData): DashboardData {
  const money = (value: number) => Number.isSafeInteger(value) && value >= 0;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month) || data.currency !== 'RUB'
    || !Number.isSafeInteger(data.subscriptionCount) || data.subscriptionCount < 0 || !money(data.totalMinor)) {
    throw new Error('Некорректные данные сводки.');
  }
  const categoryIds = new Set<string>();
  for (const category of data.categories) {
    if (!category.id || categoryIds.has(category.id) || !category.name.trim() || !money(category.amountMinor)) {
      throw new Error('Некорректные данные категорий.');
    }
    categoryIds.add(category.id);
  }
  const sum = data.categories.reduce((total, item) => total + item.amountMinor, 0);
  if (!Number.isSafeInteger(sum) || sum !== data.totalMinor) throw new Error('Сумма категорий не совпадает с общей суммой.');
  const paymentIds = new Set<string>();
  for (const payment of data.upcoming) {
    if (!payment.id || paymentIds.has(payment.id) || !payment.name.trim() || !isDateKey(payment.date) || !money(payment.amountMinor)) {
      throw new Error('Некорректные данные списаний.');
    }
    paymentIds.add(payment.id);
  }
  if (data.subscriptionCount === 0 && (data.totalMinor !== 0 || data.upcoming.length > 0)) {
    throw new Error('Некорректное количество подписок.');
  }
  return data;
}

export function nearestPayments(payments: UpcomingPayment[], today = localDateKey()): UpcomingPayment[] {
  return payments.filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).slice(0, 5);
}

export function categoryPercentages(categories: CategoryTotal[]): number[] {
  const total = categories.reduce((sum, item) => sum + item.amountMinor, 0);
  if (total === 0) return categories.map(() => 0);
  const exact = categories.map((item) => item.amountMinor / total * 100);
  const rounded = exact.map(Math.floor);
  const remainder = 100 - rounded.reduce((sum, item) => sum + item, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - rounded[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) rounded[order[index].index] += 1;
  return rounded;
}

export function formatMoney(minor: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(minor / 100);
}

export function formatPaymentDate(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

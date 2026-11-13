import { createApiClient } from '../api/client.ts';
import { isDateKey, validateDashboard, type CategoryTotal, type DashboardData } from './model.ts';
import { isStatsMonth, validateDashboardStats, type DashboardStats } from './statsModel.ts';

export const dashboardCurrencies = ['RUB', 'USD', 'EUR', 'CNY'] as const;
export type DashboardCurrency = typeof dashboardCurrencies[number];
const invalid = () => { throw new Error('Сервер вернул некорректные данные Dashboard.'); };
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : invalid();
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : invalid();
const text = (v: unknown): string => typeof v === 'string' && v.trim() ? v : invalid();
const currency = (v: unknown): DashboardCurrency => dashboardCurrencies.includes(v as DashboardCurrency) ? v as DashboardCurrency : invalid();
const id = (v: unknown): string => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? String(v) : invalid();
export function dashboardMoney(v: unknown): number {
  if (typeof v !== 'number' && typeof v !== 'string') return invalid();
  const s = String(v);
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return invalid();
  const [whole, fraction = ''] = s.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : invalid();
}
function byCurrency(v: unknown) {
  const rows = list(v).map(record);
  const seen = new Set<string>();
  for (const row of rows) { const c = currency(row.currency); if (seen.has(c)) invalid(); seen.add(c); }
  return rows;
}
export function parseDashboardCategories(value: unknown, month: string, selected: DashboardCurrency): CategoryTotal[] {
  const dto = record(value);
  if (dto.month !== month) return invalid();
  const all = byCurrency(dto.currencies).map(row => {
    const total = dashboardMoney(row.totalAmount);
    const categories = list(row.categories).map(item => {
      const c = record(item);
      if (typeof c.other !== 'boolean' || typeof c.percentage !== 'number' || c.percentage < 0 || c.percentage > 100) return invalid();
      return { id: c.other ? 'other' : id(c.categoryId), name: text(c.categoryName), amountMinor: dashboardMoney(c.amount), other: c.other };
    });
    if (new Set(categories.map(c => c.id)).size !== categories.length || categories.reduce((s,c) => s + c.amountMinor,0) !== total) return invalid();
    return { currency: row.currency, categories };
  });
  return all.find(row => row.currency === selected)?.categories ?? [];
}
export function parseDashboard(summaryValue: unknown, categoryValue: unknown, upcomingValue: unknown, month: string, selected: DashboardCurrency): { data: DashboardData; stats: DashboardStats } {
  if (!isStatsMonth(month)) return invalid();
  const summary = record(summaryValue);
  if (summary.month !== month) return invalid();
  const summaries = byCurrency(summary.currencies).map(row => ({ currency: row.currency,
    monthlyEquivalentMinor: dashboardMoney(row.monthlyEquivalent), scheduledChargesMinor: dashboardMoney(row.actualCharges) }));
  const categories = parseDashboardCategories(categoryValue, month, selected);
  const upcoming = record(upcomingValue);
  const payments = list(upcoming.payments).map(item => {
    const row = record(item); const date = text(row.paymentDate);
    if (!isDateKey(date)) return invalid();
    return { id: id(row.subscriptionId), name: text(row.subscriptionName), categoryName: text(row.categoryName), date,
      amountMinor: dashboardMoney(row.amount), currency: currency(row.currency) };
  });
  if (upcoming.totalCount !== payments.length || new Set(payments.map(p=>p.id)).size !== payments.length) return invalid();
  const totals = byCurrency(upcoming.totals);
  for (const c of dashboardCurrencies) {
    const sum = payments.filter(p=>p.currency === c).reduce((s,p)=>s+p.amountMinor,0);
    const total = totals.find(r=>r.currency === c);
    if (!Number.isSafeInteger(sum) || sum !== (total ? dashboardMoney(total.amount) : 0)) return invalid();
  }
  const selectedSummary = summaries.find(row=>row.currency === selected);
  const stats = validateDashboardStats({ month, currency: selected, monthlyEquivalentMinor: selectedSummary?.monthlyEquivalentMinor ?? 0, scheduledChargesMinor: selectedSummary?.scheduledChargesMinor ?? 0 });
  const totalMinor = categories.reduce((s,c)=>s+c.amountMinor,0);
  if (totalMinor !== stats.scheduledChargesMinor) return invalid();
  return { stats, data: validateDashboard({ month, currency: selected, totalMinor,
    categories, upcoming: payments.filter(p=>p.currency === selected) }) };
}
export function createDashboardApi(base = '/api', request: typeof fetch = fetch) {
  const send = createApiClient(base, request);
  return {
    async load(token: string, month: string, selected: DashboardCurrency, signal?: AbortSignal) {
      if (!isStatsMonth(month)) return invalid();
      const query = `?month=${encodeURIComponent(month)}`;
      const [summary, categories, upcoming] = await Promise.all([
        send('/dashboard/summary' + query, token, {}, signal), send('/dashboard/categories' + query, token, {}, signal),
        send('/dashboard/upcoming', token, {}, signal),
      ]);
      return parseDashboard(summary, categories, upcoming, month, selected);
    },
    async categories(token: string, month: string, selected: DashboardCurrency, signal?: AbortSignal) {
      if (!isStatsMonth(month)) return invalid();
      return parseDashboardCategories(await send('/dashboard/categories?month=' + encodeURIComponent(month), token, {}, signal), month, selected);
    },
  };
}

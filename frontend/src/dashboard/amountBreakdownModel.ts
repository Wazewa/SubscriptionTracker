import type { Subscription, Currency } from '../subscriptions/model.ts';

export const breakdownGroups = [
  { id: 'monthly', title: 'Ежемесячные', color: '#195637' },
  { id: 'weekly', title: 'Еженедельные', color: '#176b39' },
  { id: 'quarterly', title: 'Ежеквартальные', color: '#2e9b62' },
  { id: 'yearly', title: 'Ежегодные', color: '#f445db' },
  { id: 'other', title: 'Другие', color: '#747c79' },
] as const;
export type AmountBreakdown = {
  currency: Currency;
  groups: (typeof breakdownGroups[number] & { count: number; amountMinor: number; percentage: number })[];
};

// Mirrors DashboardService.calculateMonthlyEquivalent: HALF_UP to two decimal
// places per subscription, followed by HALF_UP to whole currency units in summary.
const halfUp = (numerator: bigint, denominator: bigint) => (numerator * 2n + denominator) / (denominator * 2n);
export function monthlyEquivalentMinor(subscription: Pick<Subscription, 'amountMinor' | 'period' | 'periodDays'>): bigint {
  const amount = BigInt(subscription.amountMinor);
  switch (subscription.period) {
    case 'monthly': return amount;
    case 'weekly': return halfUp(amount * 52n, 12n);
    case 'yearly': return halfUp(amount, 12n);
    case 'custom': return subscription.periodDays && subscription.periodDays > 0
      ? halfUp(amount * 30n, BigInt(subscription.periodDays)) : 0n;
  }
}

// Largest remainders with fixed group order as the tie breaker. This is display
// rounding only: the server total is checked first and never replaced.
function allocate(values: bigint[], divisor: bigint, target: bigint): bigint[] {
  const result = values.map(value => value / divisor);
  const remainder = Number(target - result.reduce((sum, value) => sum + value, 0n));
  const order = values.map((value, index) => ({ index, fraction: value % divisor }))
    .sort((a, b) => a.fraction === b.fraction ? a.index - b.index : a.fraction > b.fraction ? -1 : 1);
  if (remainder < 0 || remainder > values.length) throw new Error('Некорректное округление разбивки.');
  for (let i = 0; i < remainder; i++) result[order[i].index] += 1n;
  return result;
}

export function aggregateAmountBreakdown(subscriptions: Subscription[], currency: Currency, serverTotalMinor: number): AmountBreakdown {
  if (!Number.isSafeInteger(serverTotalMinor) || serverTotalMinor < 0 || serverTotalMinor % 100 !== 0) throw new Error('Некорректный месячный итог.');
  const totals = breakdownGroups.map(() => 0n);
  const counts = breakdownGroups.map(() => 0);
  for (const subscription of subscriptions) {
    if (subscription.status !== 'ACTIVE' || subscription.currency !== currency) continue;
    const group = subscription.period === 'custom'
      ? subscription.periodDays !== null && subscription.periodDays >= 85 && subscription.periodDays <= 95 ? 'quarterly' : 'other'
      : subscription.period;
    const index = breakdownGroups.findIndex(item => item.id === group);
    counts[index]++;
    totals[index] += monthlyEquivalentMinor(subscription);
  }
  const total = totals.reduce((sum, value) => sum + value, 0n);
  const serverTotal = BigInt(serverTotalMinor);
  if (halfUp(total, 100n) * 100n !== serverTotal) throw new Error('Данные подписок и сводки расходятся. Повторите загрузку.');
  const amounts = allocate(totals, 100n, serverTotal / 100n).map(value => value * 100n);
  // Percentages refer to the displayed monthly contributions and the server total.
  const percentages = serverTotal === 0n ? totals.map(() => 0n) : allocate(amounts.map(value => value * 100n), serverTotal, 100n);
  return { currency, groups: breakdownGroups.map((group, index) => ({ ...group, count: counts[index],
    amountMinor: Number(amounts[index]), percentage: Number(percentages[index]) })) };
}

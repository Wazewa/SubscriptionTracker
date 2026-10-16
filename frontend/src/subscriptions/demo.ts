import type { Subscription } from './model';

export function createDemoSubscriptions(now = new Date()): Subscription[] {
  const date = (offset: number) => {
    const next = new Date(now);
    next.setDate(next.getDate() + offset);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  };
  return [
    { id: 'demo-1', name: 'Кинопоиск', monthlyPriceMinor: 29900, currency: 'RUB', category: 'Кино', period: 'monthly', nextPaymentDate: date(1), active: true },
    { id: 'demo-2', name: 'Яндекс.Музыка', monthlyPriceMinor: 39900, currency: 'RUB', category: 'Музыка', period: 'monthly', nextPaymentDate: date(3), active: true },
    { id: 'demo-3', name: 'Образовательный сервис', monthlyPriceMinor: 50000, currency: 'RUB', category: 'Образование', period: 'yearly', nextPaymentDate: date(10), active: true },
    { id: 'demo-4', name: 'Иви', monthlyPriceMinor: 19900, currency: 'RUB', category: 'Кино', period: 'monthly', nextPaymentDate: date(14), active: false },
  ];
}

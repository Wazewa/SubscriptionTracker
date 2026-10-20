import { localDateKey, parseCategories, parseSubscriptions } from './model';
export const demoCategories = parseCategories([{ categoryId: 1, name: 'Кино' }, { categoryId: 2, name: 'Музыка' }, { categoryId: 3, name: 'Образование' }]);
export function createDemoSubscriptions(now = new Date()) {
  const date = (offset: number) => { const next = new Date(now); next.setDate(next.getDate() + offset); return localDateKey(next); };
  return parseSubscriptions([
    { id: 1, name: 'Кинопоиск', amount: 299, currency: 'RUB', categoryId: 1, period: 'MONTHLY', periodDays: null, nextPaymentDate: date(1), status: 'ACTIVE' },
    { id: 2, name: 'Яндекс.Музыка', amount: 399, currency: 'RUB', categoryId: 2, period: 'MONTHLY', periodDays: null, nextPaymentDate: date(3), status: 'ACTIVE' },
    { id: 3, name: 'Образовательный сервис', amount: 6000, currency: 'RUB', categoryId: 3, period: 'YEARLY', periodDays: null, nextPaymentDate: date(10), status: 'ACTIVE' },
    { id: 4, name: 'Иви', amount: 199, currency: 'RUB', categoryId: 1, period: 'MONTHLY', periodDays: null, nextPaymentDate: date(14), status: 'PAUSED' },
  ], demoCategories);
}

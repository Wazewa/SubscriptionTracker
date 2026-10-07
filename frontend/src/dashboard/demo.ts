import { localDateKey, type DashboardData } from './model';

export function createDemoDashboard(now = new Date()): DashboardData {
  const nextDate = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return localDateKey(date);
  };
  return {
    month: localDateKey(now).slice(0, 7), currency: 'RUB', subscriptionCount: 6, totalMinor: 320000,
    categories: [
      { id: 'movie', name: 'Кино', amountMinor: 64000 },
      { id: 'music', name: 'Музыка', amountMinor: 96000 },
      { id: 'study', name: 'Учёба', amountMinor: 160000 },
    ],
    upcoming: [
      { id: '6', name: 'Stepik', date: nextDate(10), amountMinor: 60100 },
      { id: '1', name: 'Кинопоиск', date: nextDate(1), amountMinor: 29900 },
      { id: '4', name: 'Spotify', date: nextDate(6), amountMinor: 56100 },
      { id: '3', name: 'ChatGPT', date: nextDate(4), amountMinor: 99900 },
      { id: '5', name: 'Иви', date: nextDate(8), amountMinor: 34100 },
      { id: '2', name: 'Яндекс.Музыка', date: nextDate(2), amountMinor: 39900 },
    ],
  };
}

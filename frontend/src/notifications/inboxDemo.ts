import type { InboxNotification } from './inboxModel';

export function createInboxDemo(now = new Date()): InboxNotification[] {
  const at = (days: number, hour: number) => {
    const date = new Date(now); date.setDate(date.getDate() - days); date.setHours(hour, 0, 0, 0); return date.toISOString();
  };
  return [
    { id: 'demo-reminder', type: 'PAYMENT_REMINDER', createdAt: at(0, 10), message: 'Spotify — 399 ₽. Следующее списание завтра. Проверьте, что на карте достаточно средств.' },
    { id: 'demo-trial', type: 'TRIAL_ENDING', createdAt: at(0, 9), message: 'Пробный период Notion заканчивается через 2 дня. Проверьте условия подписки перед продлением.' },
    { id: 'demo-renewal', type: 'RENEWAL', createdAt: at(1, 15), message: 'Подписка Яндекс Плюс продлевается. Следующий платёж — 299 ₽.' },
    { id: 'demo-price', type: 'PRICE_CHANGE', createdAt: at(1, 11), message: 'Стоимость Netflix изменится с 599 ₽ до 699 ₽ со следующего месяца.' },
    { id: 'demo-system', type: 'SYSTEM', createdAt: at(3, 12), message: 'Добро пожаловать! Здесь будут важные события и напоминания о ваших подписках.' },
  ];
}

import type { InboxNotification } from './inboxModel';

export function createInboxDemo(now = new Date()): InboxNotification[] {
  const at = (days: number, hour: number) => {
    const date = new Date(now); date.setDate(date.getDate() - days); date.setHours(hour, 0, 0, 0); return date.toISOString();
  };
  return [
    { id: 'demo-reminder', type: 'PAYMENT_REMINDER', createdAt: at(0, 10), subscriptionId: '2', message: 'Яндекс.Музыка — 399 ₽. Следующее списание через 3 дня.' },
    { id: 'demo-trial', type: 'PAYMENT_PROBLEM', subscriptionId: '1', createdAt: at(0, 9), message: 'Вчера должна была пройти оплата 299 ₽ за Кинопоиск. Подтвердить списание?' },
    { id: 'demo-renewal', type: 'PAYMENT_SUCCESS', subscriptionId: '3', createdAt: at(1, 15), message: 'Оплата образовательного сервиса прошла успешно.' },
    { id: 'demo-price', type: 'PRICE_CHANGE', createdAt: at(1, 11), message: 'Стоимость Netflix изменится с 599 ₽ до 699 ₽ со следующего месяца.' },
    { id: 'demo-system', type: 'SYSTEM', createdAt: at(3, 12), message: 'Добро пожаловать! Здесь будут важные события и напоминания о ваших подписках.' },
  ];
}

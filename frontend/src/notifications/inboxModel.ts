export const notificationTypes = ['PAYMENT_REMINDER', 'TRIAL_ENDING', 'PRICE_CHANGE', 'RENEWAL', 'PAYMENT_SUCCESS', 'PAYMENT_PROBLEM', 'SYSTEM'] as const;
export type NotificationType = typeof notificationTypes[number];
export type InboxNotification = {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  subscriptionId?: string | null;
  genericTitle?: boolean;
};
export type InboxFilter = 'all' | 'unread' | 'payments';
export const notificationPresentation: Record<NotificationType, { title: string; icon: string; tone: string }> = {
  PAYMENT_REMINDER: { title: 'Скоро списание', icon: '!', tone: 'reminder' },
  TRIAL_ENDING: { title: 'Пробный период заканчивается', icon: '◷', tone: 'warning' },
  PRICE_CHANGE: { title: 'Изменение стоимости', icon: '↗', tone: 'warning' },
  RENEWAL: { title: 'Продление подписки', icon: '✓', tone: 'success' },
  PAYMENT_SUCCESS: { title: 'Списание успешно', icon: '✓', tone: 'success' },
  PAYMENT_PROBLEM: { title: 'Проблема с подпиской', icon: '!', tone: 'warning' },
  SYSTEM: { title: 'Важная информация', icon: 'i', tone: 'info' },
};
const paymentTypes: NotificationType[] = ['PAYMENT_REMINDER', 'PRICE_CHANGE', 'RENEWAL', 'PAYMENT_SUCCESS', 'PAYMENT_PROBLEM'];
export function filterInbox(items: InboxNotification[], filter: InboxFilter, read: ReadonlySet<string>) {
  return items.filter(item => filter === 'all' || (filter === 'unread' ? !read.has(item.id) : paymentTypes.includes(item.type)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
export function localDayKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function notificationDayLabel(value: string, now = new Date()) {
  const day = localDayKey(value);
  if (day === localDayKey(now)) return 'Сегодня';
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (day === localDayKey(yesterday)) return 'Вчера';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', ...(new Date(value).getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }).format(new Date(value));
}
type ReadStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const inboxReadKey = (user: string) => `subscription-tracker.inbox-read.v1:${encodeURIComponent(user.trim().toLowerCase())}`;
export function loadReadNotifications(user: string, storage: ReadStorage | null): Set<string> {
  try {
    const value: unknown = JSON.parse(storage?.getItem(inboxReadKey(user)) ?? '[]');
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []);
  } catch { return new Set(); }
}
export function saveReadNotifications(user: string, read: ReadonlySet<string>, storage: ReadStorage | null): boolean {
  try {
    if (!storage) return false;
    storage.setItem(inboxReadKey(user), JSON.stringify([...read]));
    return true;
  } catch { return false; }
}

// Скрытие уведомлений действует только в этом браузере и не меняет данные сервера.
export const inboxHiddenKey = (user: string) => `subscription-tracker.inbox-hidden.v1:${encodeURIComponent(user.trim().toLowerCase())}`;
export function loadHiddenNotifications(user: string, storage: ReadStorage | null): Set<string> {
  try {
    const value: unknown = JSON.parse(storage?.getItem(inboxHiddenKey(user)) ?? '[]');
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []);
  } catch { return new Set(); }
}
export function saveHiddenNotifications(user: string, hidden: ReadonlySet<string>, storage: ReadStorage | null): boolean {
  try {
    if (!storage) return false;
    storage.setItem(inboxHiddenKey(user), JSON.stringify([...hidden]));
    return true;
  } catch { return false; }
}

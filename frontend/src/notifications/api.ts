import { createApiClient, HttpError } from '../api/client.ts';
import { currencies, localDateKey, validDate, validId } from '../subscriptions/model.ts';
import { notificationTypes, type InboxNotification, type NotificationType } from './inboxModel.ts';

const invalid = (): never => { throw new Error('Сервер вернул некорректные данные уведомлений.'); };
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
export function parseInbox(value: unknown): InboxNotification[] {
  if (!Array.isArray(value)) return invalid();
  const seen = new Set<string>();
  return value.map(entry => {
    const row = record(entry);
    if (!validId(row.id) || seen.has(String(row.id)) || typeof row.message !== 'string' || !row.message.trim()
      || typeof row.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.createdAt) || !Number.isFinite(Date.parse(row.createdAt))
      || (row.subscriptionId != null && !validId(row.subscriptionId))) return invalid();
    seen.add(String(row.id));
    return { id: String(row.id), message: row.message, createdAt: row.createdAt,
      subscriptionId: row.subscriptionId == null ? null : String(row.subscriptionId),
      type: notificationTypes.includes(row.type as NotificationType) ? row.type as NotificationType : 'SYSTEM',
      genericTitle: !notificationTypes.includes(row.type as NotificationType) };
  });
}
export type PaymentCandidate = { id: string; name: string; amount: number; currency: string; date: string; status: string };
export function parsePaymentCandidates(value: unknown): PaymentCandidate[] {
  if (!Array.isArray(value)) return invalid();
  const seen = new Set<string>();
  return value.map(entry => {
    const row = record(entry);
    if (!validId(row.id) || seen.has(String(row.id)) || typeof row.name !== 'string' || !row.name.trim()
      || typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount <= 0
      || !currencies.includes(row.currency as typeof currencies[number]) || !validDate(row.nextPaymentDate)
      || typeof row.status !== 'string' || !['ACTIVE', 'UNPAID', 'PAUSED', 'CANCELLED'].includes(row.status)) return invalid();
    seen.add(String(row.id));
    return { id: String(row.id), name: row.name, amount: row.amount, currency: row.currency as string, date: row.nextPaymentDate, status: row.status };
  });
}
export function paymentsToConfirm(items: PaymentCandidate[], today = localDateKey()) {
  return items.filter(item => item.status === 'UNPAID' || (item.status === 'ACTIVE' && item.date <= today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
export function createInboxApi(base = '/api', request: typeof fetch = fetch) {
  const send = createApiClient(base, request);
  return {
    async list(token: string, signal?: AbortSignal) { return parseInbox(await send('/notifications', token, {}, signal)); },
    async payments(token: string, signal?: AbortSignal) { return parsePaymentCandidates(await send('/subscriptions/me', token, {}, signal)); },
    async confirm(token: string, id: string, signal?: AbortSignal) {
      if (!/^\d+$/.test(id) || !validId(Number(id))) throw new Error('Некорректная подписка.');
      let response: unknown;
      try { response = await send(`/subscriptions/${id}/confirm-payment`, token, { method: 'POST' }, signal); }
      catch (error) {
        if (error instanceof HttpError && [400, 404, 409].includes(error.status)) throw new HttpError('Платёж уже подтверждён или недоступен. Обновите список.', error.status);
        throw error;
      }
      const result = parsePaymentCandidates([response])[0];
      if (result.id !== id || result.status !== 'ACTIVE' || result.date <= localDateKey()) throw new Error('Не удалось подтвердить результат. Обновите список перед повторной отправкой.');
      return result;
    },
  };
}

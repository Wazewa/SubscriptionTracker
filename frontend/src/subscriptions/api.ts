import { parseSubscriptions } from './model.ts';
import type { SubscriptionFilters } from './model.ts';
import { buildSubscriptionsQuery } from './query.ts';

export class SubscriptionsApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

// Enable only after agreeing the response contract documented in SUBSCRIPTIONS.md.
export function createSubscriptionsApi(base = '/api', request: typeof fetch = fetch) {
  return {
    async list(token: string, signal?: AbortSignal, filters?: SubscriptionFilters) {
      if (!token.trim()) throw new SubscriptionsApiError('Войдите снова, чтобы загрузить подписки.', 401);
      const controller = new AbortController();
      const cancel = () => controller.abort();
      if (signal?.aborted) cancel();
      signal?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(cancel, 10000);
      try {
        const query = filters ? buildSubscriptionsQuery(filters) : '';
        const response = await request(`${base.replace(/\/$/, '')}/subscriptions${query ? `?${query}` : ''}`, {
          method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (!response.ok) {
          const message = response.status === 401 ? 'Сессия истекла. Войдите снова.'
            : response.status === 403 ? 'Нет доступа к списку подписок.'
            : response.status === 404 ? 'API подписок пока недоступен.' : 'Не удалось загрузить подписки. Попробуйте позже.';
          throw new SubscriptionsApiError(message, response.status);
        }
        const data: unknown = await response.json().catch(() => { throw new Error('Сервер вернул некорректный ответ.'); });
        return parseSubscriptions(data);
      } catch (error) {
        if (controller.signal.aborted) {
          if (signal?.aborted) throw new DOMException('Загрузка отменена.', 'AbortError');
          throw new Error('Сервер не ответил вовремя. Повторите загрузку.');
        }
        if (error instanceof TypeError) throw new Error('Не удалось связаться с сервером. Повторите загрузку.');
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
      }
    },
  };
}

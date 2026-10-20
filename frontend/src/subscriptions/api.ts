import { createApiClient } from '../api/client.ts';
import { parseCategories, parseSubscriptions, validId } from './model.ts';
import type { Category } from './model.ts';
import type { SubscriptionPayload } from './formModel.ts';
export { HttpError as SubscriptionsApiError } from '../api/client.ts';
export function createSubscriptionsApi(base = '/api', request: typeof fetch = fetch) {
  const send = createApiClient(base, request);
  const pathFor = (id: string) => {
    if (!/^\d+$/.test(id) || !validId(Number(id))) throw new Error('Некорректный идентификатор подписки.');
    return `/subscriptions/${encodeURIComponent(id)}`;
  };
  return {
    async categories(token: string, signal?: AbortSignal) { return parseCategories(await send('/categories', token, {}, signal)); },
    async list(token: string, signal?: AbortSignal, categories: Category[] = []) { return parseSubscriptions(await send('/subscriptions/me', token, {}, signal), categories); },
    async create(token: string, payload: SubscriptionPayload, categories: Category[], signal?: AbortSignal) {
      return parseSubscriptions([await send('/subscriptions', token, { method: 'POST', body: JSON.stringify(payload) }, signal)], categories)[0];
    },
    async update(token: string, id: string, payload: SubscriptionPayload, categories: Category[], signal?: AbortSignal) {
      return parseSubscriptions([await send(pathFor(id), token, { method: 'PUT', body: JSON.stringify(payload) }, signal)], categories)[0];
    },
    async remove(token: string, id: string, signal?: AbortSignal) { await send(pathFor(id), token, { method: 'DELETE' }, signal); },
  };
}

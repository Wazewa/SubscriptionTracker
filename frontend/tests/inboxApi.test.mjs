import test from 'node:test';
import assert from 'node:assert/strict';
import { createInboxApi, parseInbox, parsePaymentCandidates, paymentsToConfirm } from '../src/notifications/api.ts';
import { loadReadNotifications } from '../src/notifications/inboxModel.ts';
const notification = { id: 7, subscriptionId: 2, message: 'Скоро списание', status: 'SENT', sentToTelegram: true, createdAt: '2026-11-25T10:00:00+03:00', sentAt: null };
const payment = { id: 2, name: 'Музыка', amount: 299, currency: 'RUB', nextPaymentDate: '2026-11-22', status: 'ACTIVE' };

test('Swagger notification without type stays generic; Telegram delivery never implies read status', () => {
  const [item] = parseInbox([notification]);
  assert.equal(item.id, '7'); assert.equal(item.subscriptionId, '2'); assert.equal(item.type, 'SYSTEM'); assert.equal(item.genericTitle, true);
  assert.equal(loadReadNotifications('user', null).has(item.id), false);
  assert.equal(parseInbox([{ ...notification, type: 'PRICE_CHANGE' }])[0].type, 'PRICE_CHANGE');
  assert.equal(parseInbox([{ ...notification, type: 'FUTURE_TYPE' }])[0].genericTitle, true);
});
test('malformed lists, duplicate IDs, missing messages, unsafe IDs and timestamps fail closed', () => {
  for (const value of [null, {}, [notification, notification], [{ ...notification, id: -1 }], [{ ...notification, id: 2 ** 54 }], [{ ...notification, message: '' }], [{ ...notification, createdAt: 'bad' }], [{ ...notification, subscriptionId: 'wrong' }]]) assert.throws(() => parseInbox(value));
  assert.deepEqual(parseInbox([]), []);
});
test('only active due subscriptions or UNPAID may be confirmed, not future, paused or cancelled', () => {
  const rows = parsePaymentCandidates([payment, { ...payment, id: 3, status: 'UNPAID', nextPaymentDate: '2026-12-01' }, { ...payment, id: 4, nextPaymentDate: '2026-12-02' }, { ...payment, id: 5, status: 'PAUSED' }, { ...payment, id: 6, status: 'CANCELLED' }]);
  assert.deepEqual(paymentsToConfirm(rows, '2026-11-25').map(item => item.id), ['2', '3']);
  assert.throws(() => parsePaymentCandidates([{ ...payment, amount: -1 }]));
  assert.throws(() => parsePaymentCandidates([{ ...payment, nextPaymentDate: '2026-02-30' }]));
});
test('GET uses same-origin documented endpoints and bearer authentication', async () => {
  const calls = [];
  const api = createInboxApi('/api', async (url, options) => { calls.push({ url, options }); return Response.json(url.endsWith('/notifications') ? [notification] : [payment]); });
  assert.equal((await api.list('token'))[0].id, '7'); assert.equal((await api.payments('token'))[0].id, '2');
  assert.deepEqual(calls.map(call => call.url), ['/api/notifications', '/api/subscriptions/me']);
  for (const call of calls) assert.equal(call.options.headers.Authorization, 'Bearer token');
});
test('confirm sends one POST without a body, validates the ID and returned future active date', async () => {
  let count = 0;
  const api = createInboxApi('/api', async (url, options) => {
    count++; assert.equal(url, '/api/subscriptions/2/confirm-payment'); assert.equal(options.method, 'POST'); assert.equal(options.body, undefined);
    return Response.json({ ...payment, nextPaymentDate: '2099-01-01' });
  });
  assert.equal((await api.confirm('token', '2')).date, '2099-01-01'); assert.equal(count, 1);
  await assert.rejects(() => api.confirm('token', '../2')); assert.equal(count, 1);
  for (const response of [{ ...payment, id: 3, nextPaymentDate: '2099-01-01' }, payment, { ...payment, status: 'PAUSED', nextPaymentDate: '2099-01-01' }]) {
    await assert.rejects(() => createInboxApi('/api', async () => Response.json(response)).confirm('token', '2'));
  }
});
test('network uncertainty never automatically repeats POST or claims success', async () => {
  let count = 0;
  await assert.rejects(() => createInboxApi('/api', async () => { count++; throw new TypeError('offline'); }).confirm('token', '2'), /изменение могло сохраниться/);
  assert.equal(count, 1);
  await assert.rejects(() => createInboxApi('/api', async () => new Response(null, { status: 204 })).confirm('token', '2'));
});
test('authentication, permission and validation errors remain explicit; cancelled reads are not sent', async () => {
  for (const status of [401, 403]) await assert.rejects(() => createInboxApi('/api', async () => new Response(null, { status })).list('token'), error => error.status === status);
  await assert.rejects(() => createInboxApi('/api', async () => new Response(null, { status: 400 })).confirm('token', '2'), /Платёж уже подтверждён или недоступен/);
  let count = 0; const api = createInboxApi('/api', async () => { count++; return Response.json([]); });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => api.list('token', controller.signal), error => error.name === 'AbortError');
  await assert.rejects(() => api.list(''), error => error.status === 401); assert.equal(count, 0);
});

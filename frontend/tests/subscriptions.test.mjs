import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCategories, parseSubscriptions, filterSubscriptions, formatSubscriptionMoney } from '../src/subscriptions/model.ts';
import { createSubscriptionsApi, SubscriptionsApiError } from '../src/subscriptions/api.ts';
const categoriesDto = [{ categoryId: 1, name: 'Кино', description: null }, { categoryId: 2, name: 'Музыка', description: 'Звук' }];
const categories = parseCategories(categoriesDto);
const dto = { id: 1, name: 'Кинопоиск', amount: 299.99, currency: 'RUB', categoryId: 1, period: 'MONTHLY', periodDays: null, nextPaymentDate: '2026-10-20', status: 'ACTIVE' };
const dtos = [dto, { ...dto, id: 2, name: 'Музыка', categoryId: 2, amount: 120, currency: 'USD', period: 'YEARLY', status: 'PAUSED' }];
const rows = parseSubscriptions(dtos, categories);
const empty = { search: '', category: '', period: '' };
const reply = (data, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), { status });

test('backend DTO maps IDs, category IDs, decimal amount, currency and status', () => {
  assert.deepEqual(parseSubscriptions([]), []);
  assert.equal(rows[0].id, '1'); assert.equal(rows[0].amountMinor, 29999); assert.equal(rows[0].monthlyPriceMinor, 29999);
  assert.equal(rows[0].category, 'Кино'); assert.equal(rows[1].categoryId, '2');
  assert.equal(rows[1].monthlyPriceMinor, null); assert.equal(rows[1].amountMinor, 12000); assert.equal(rows[1].active, false);
  assert.equal(dtos[0].amount, 299.99);
  assert.equal(parseSubscriptions([dto])[0].category, 'Категория №1');
});
test('all supported periods, currencies and statuses are retained', () => {
  for (const period of ['WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']) for (const currency of ['RUB', 'USD', 'EUR', 'CNY']) {
    const [row] = parseSubscriptions([{ ...dto, period, currency, periodDays: period === 'CUSTOM' ? 17 : null, status: 'CANCELLED' }]);
    assert.equal(row.period, period.toLowerCase()); assert.equal(row.currency, currency); assert.equal(row.status, 'CANCELLED');
  }
  assert.ok(formatSubscriptionMoney(100, 'USD').includes('$'));
});
test('malformed DTOs, duplicate/unsafe IDs, dates, statuses and money are rejected', () => {
  for (const data of [null, {}, { content: dtos }, [dto, dto], ...[
    { id: '1' }, { id: 0 }, { id: Number.MAX_SAFE_INTEGER + 1 }, { amount: -1 }, { amount: 0.001 }, { amount: Infinity },
    { amount: 1e20 }, { nextPaymentDate: '2026-02-30' }, { currency: 'GBP' }, { status: 'unknown' },
    { categoryId: null }, { name: ' ' }, { period: ['MONTHLY'] }, { status: ['ACTIVE'] }, { amount: 0.00000000001 }, { period: 'CUSTOM', periodDays: 0 }, { period: 'CUSTOM', periodDays: 1.5 },
    { period: 'YEARLY', periodDays: 30 }, { period: 'CUSTOM', periodDays: 2147483648 },
  ].map((patch) => [{ ...dto, ...patch }])]) assert.throws(() => parseSubscriptions(data), /Некорректн/);
});
test('categories use backend IDs, support an empty dictionary, reject malformed/duplicate IDs', () => {
  assert.deepEqual(parseCategories([]), []); assert.equal(categories[0].id, '1'); assert.equal(categories[0].description, '');
  for (const data of [null, {}, [categoriesDto[0], categoriesDto[0]], [{ categoryId: 1, name: '' }], [{ categoryId: '1', name: 'Кино' }]]) assert.throws(() => parseCategories(data), /Некорректн/);
});
test('local filters combine over the full list, use category ID and retain paused rows', () => {
  assert.deepEqual(filterSubscriptions(rows, { ...empty, search: '  КИНО  ' }), [rows[0]]);
  assert.deepEqual(filterSubscriptions(rows, { search: 'муз', category: '2', period: 'yearly' }), [rows[1]]);
  assert.deepEqual(filterSubscriptions(rows, { search: 'муз', category: '1', period: 'yearly' }), []);
  assert.deepEqual(filterSubscriptions(rows, empty), rows);
});
test('GET uses actual Swagger paths, Bearer header and cancellation, no unsupported query', async () => {
  const calls = [];
  const api = createSubscriptionsApi('/api/', async (url, options) => {
    calls.push(url); assert.equal(options.headers.Authorization, 'Bearer test-token'); assert.equal(options.headers.Accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal); return reply(url.endsWith('/categories') ? categoriesDto : dtos);
  });
  assert.deepEqual(await api.categories('test-token'), categories);
  assert.deepEqual(await api.list('test-token', undefined, categories), rows);
  assert.deepEqual(calls, ['/api/categories', '/api/subscriptions/me']);
});
test('POST/PUT preserve full-period amount, numeric categoryId, enum and custom days; DELETE accepts 204', async () => {
  const payload = { name: 'Сервис', amount: 120.35, currency: 'EUR', nextPaymentDate: '2027-01-01', period: 'CUSTOM', periodDays: 17, categoryId: 2 };
  const calls = [];
  const api = createSubscriptionsApi('/api', async (url, options) => {
    calls.push([url, options.method]);
    if (options.method === 'DELETE') { assert.equal(options.body, undefined); return reply(null, 204); }
    assert.deepEqual(JSON.parse(options.body), payload); assert.equal(options.headers['Content-Type'], 'application/json');
    return reply({ ...dto, ...payload }, options.method === 'POST' ? 201 : 200);
  });
  assert.equal((await api.create('token', payload, categories)).amountMinor, 12035);
  assert.equal((await api.update('token', '1', payload, categories)).periodDays, 17);
  await api.remove('token', '1');
  assert.deepEqual(calls, [['/api/subscriptions', 'POST'], ['/api/subscriptions/1', 'PUT'], ['/api/subscriptions/1', 'DELETE']]);
  await assert.rejects(api.remove('token', '../1'), /идентификатор/);
});
test('missing token, failures and malformed successes never expose private details or return demo', async () => {
  const noToken = createSubscriptionsApi('/api', async () => assert.fail('unexpected request'));
  await assert.rejects(noToken.list(''), (error) => error instanceof SubscriptionsApiError && error.status === 401);
  for (const status of [400, 401, 403, 404, 409, 500]) {
    const api = createSubscriptionsApi('/api', async () => reply({ message: 'private detail' }, status));
    await assert.rejects(api.list('token'), (error) => error.status === status && !error.message.includes('private detail'));
  }
  await assert.rejects(createSubscriptionsApi('/api', async () => reply({})).list('token'), /Некорректный формат/);
  await assert.rejects(createSubscriptionsApi('/api', async () => new Response('<html>wrong</html>')).list('token'), /некорректный ответ/);
});
test('network uncertainty for writes and cancellation are distinct; pre-aborted calls never send', async () => {
  const api = createSubscriptionsApi('/api', async () => { throw new TypeError('network'); });
  await assert.rejects(api.list('token'), /Не удалось связаться/);
  await assert.rejects(api.remove('token', '1'), /изменение могло сохраниться/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(createSubscriptionsApi('/api', async () => assert.fail('unexpected request')).list('token', controller.signal), { name: 'AbortError' });
  const active = new AbortController();
  const pending = createSubscriptionsApi('/api', async (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))).list('token', active.signal);
  active.abort(); await assert.rejects(pending, { name: 'AbortError' });
});

test('read timeout aborts fetch and explains retry; write timeout does not claim failure or auto-retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const api = createSubscriptionsApi('/api', async (_, options) => { calls++; return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))); });
  const read = api.list('token'); const checkedRead = assert.rejects(read, /не ответил вовремя/); t.mock.timers.tick(10000); await checkedRead;
  const write = api.remove('token', '1'); const checkedWrite = assert.rejects(write, /изменение могло сохраниться/); t.mock.timers.tick(10000); await checkedWrite;
  assert.equal(calls, 2);
});

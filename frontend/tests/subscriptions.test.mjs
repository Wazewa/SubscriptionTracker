import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSubscriptions, filterSubscriptions } from '../src/subscriptions/model.ts';
import { createSubscriptionsApi, SubscriptionsApiError } from '../src/subscriptions/api.ts';
import { buildSubscriptionsQuery } from '../src/subscriptions/query.ts';

const row = { id: '1', name: 'Кинопоиск', monthlyPriceMinor: 29900, currency: 'RUB', category: 'Кино', period: 'monthly', nextPaymentDate: '2026-10-15', active: true };
const rows = [row, { ...row, id: '2', name: 'Музыка', category: 'Музыка', period: 'yearly', active: false }];
const empty = { search: '', category: '', period: '' };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('list accepts an empty array and does not mutate valid rows', () => {
  assert.deepEqual(parseSubscriptions([]), []);
  assert.deepEqual(parseSubscriptions(rows), rows);
  assert.notEqual(parseSubscriptions(rows)[0], rows[0]);
});

test('malformed response, duplicate IDs, invalid dates and money are rejected', () => {
  for (const data of [null, {}, { content: rows }, [row, row], [{ ...row, nextPaymentDate: '2026-02-30' }],
    [{ ...row, monthlyPriceMinor: -1 }], [{ ...row, monthlyPriceMinor: 1.5 }], [{ ...row, active: 'true' }],
    [{ ...row, currency: 'USD' }], [{ ...row, name: ' ' }], [{ ...row, period: 'weekly' }]]) {
    assert.throws(() => parseSubscriptions(data), /Некорректн/);
  }
});

test('search is trimmed, case insensitive and combines with category and period', () => {
  assert.deepEqual(filterSubscriptions(rows, { ...empty, search: '  КИНО  ' }), [row]);
  assert.deepEqual(filterSubscriptions(rows, { search: 'муз', category: 'Музыка', period: 'yearly' }), [rows[1]]);
  assert.deepEqual(filterSubscriptions(rows, { search: 'муз', category: 'Кино', period: 'yearly' }), []);
  assert.deepEqual(filterSubscriptions(rows, empty), rows);
  assert.equal(rows.length, 2);
});

test('GET list preserves API prefix, passes Bearer token and cancellation signal', async () => {
  const controller = new AbortController();
  const api = createSubscriptionsApi('/api/', async (url, options) => {
    assert.equal(url, '/api/subscriptions');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(options.headers.Accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal);
    return reply(rows);
  });
  assert.deepEqual(await api.list('test-token', controller.signal), rows);
});

test('missing token does not send a request', async () => {
  const api = createSubscriptionsApi('/api', async () => { assert.fail('unexpected request'); });
  await assert.rejects(api.list(''), (error) => error instanceof SubscriptionsApiError && error.status === 401);
});

test('API failures never return demo data or expose server details', async () => {
  for (const status of [401, 403, 404, 500]) {
    const api = createSubscriptionsApi('/api', async () => reply({ message: 'private detail' }, status));
    await assert.rejects(api.list('test-token'), (error) => error instanceof SubscriptionsApiError
      && error.status === status && !error.message.includes('private detail'));
  }
  const invalid = createSubscriptionsApi('/api', async () => reply({ content: rows }));
  await assert.rejects(invalid.list('test-token'), /Некорректный формат/);
  const html = createSubscriptionsApi('/api', async () => new Response('<html>wrong response</html>'));
  await assert.rejects(html.list('test-token'), /некорректный ответ/);
});

test('network errors are actionable and cancellation is not a network failure', async () => {
  const network = createSubscriptionsApi('/api', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(network.list('test-token'), /Не удалось связаться/);
  const controller = new AbortController();
  const api = createSubscriptionsApi('/api', async (_, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  const pending = api.list('test-token', controller.signal);
  controller.abort();
  await assert.rejects(pending, (error) => error.name === 'AbortError');
});

test('query combines all filters, trims search and safely encodes special characters', () => {
  const filters = { search: '  Кино & музыка?  ', category: 'Кино/ТВ', period: 'monthly' };
  const query = buildSubscriptionsQuery(filters);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(query)), {
    search: 'Кино & музыка?', category: 'Кино/ТВ', period: 'monthly',
  });
  assert.equal(new URLSearchParams(query).size, 3);
  assert.equal(filters.search, '  Кино & музыка?  ');
  assert.equal(buildSubscriptionsQuery(empty), '');
  assert.equal(buildSubscriptionsQuery({ ...empty, search: '   ' }), '');
});

test('API query filters reach GET and clearing filters removes query parameters', async () => {
  const calls = [];
  const api = createSubscriptionsApi('/api/', async (url) => { calls.push(url); return reply([]); });
  await api.list('test-token', undefined, { search: 'Кино', category: 'Кино', period: 'monthly' });
  const url = new URL(calls[0], 'http://localhost');
  assert.equal(url.pathname, '/api/subscriptions');
  assert.deepEqual(Object.fromEntries(url.searchParams), { search: 'Кино', category: 'Кино', period: 'monthly' });
  await api.list('test-token', undefined, empty);
  assert.equal(calls[1], '/api/subscriptions');
});

test('filter reset restores all subscriptions and does not hide inactive subscriptions', () => {
  assert.deepEqual(filterSubscriptions(rows, { ...empty, period: 'yearly' }), [rows[1]]);
  assert.deepEqual(filterSubscriptions(rows, { ...empty, search: 'unknown' }), []);
  assert.deepEqual(filterSubscriptions(rows, empty), rows);
  assert.equal(filterSubscriptions(rows, empty)[1].active, false);
});

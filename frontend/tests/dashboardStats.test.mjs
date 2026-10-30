import test from 'node:test';
import assert from 'node:assert/strict';
import { formatStatsMoney, isStatsMonth, loadDashboardStats, scheduledChargesTitle, validateDashboardStats } from '../src/dashboard/statsModel.ts';

const stats = () => ({ month: '2026-11', currency: 'RUB', monthlyEquivalentMinor: 320000, scheduledChargesMinor: 376000 });

test('prototype money format omits empty kopecks but preserves non-zero fractional amounts', () => {
  assert.match(formatStatsMoney(320000), /^3\s200\s₽$/);
  assert.match(formatStatsMoney(320035), /^3\s200,35\s₽$/);
  assert.match(formatStatsMoney(0), /^0\s₽$/);
  assert.match(formatStatsMoney(1), /^0,01\s₽$/);
  for (const value of [-1, NaN, Infinity, 0.5]) assert.throws(() => formatStatsMoney(value));
});

test('monthly equivalent and scheduled charges remain separate values, including unequal and zero amounts', () => {
  assert.deepEqual(validateDashboardStats(stats()), stats());
  for (const patch of [
    { monthlyEquivalentMinor: 0 }, { scheduledChargesMinor: 0 },
    { monthlyEquivalentMinor: 0, scheduledChargesMinor: 0 },
  ]) assert.deepEqual(validateDashboardStats({ ...stats(), ...patch }), { ...stats(), ...patch });
});

test('view model returns an independent object and does not expose extra backend fields', () => {
  const source = { ...stats(), internalDetails: 'not-for-display' };
  const result = validateDashboardStats(source);
  assert.notEqual(result, source);
  assert.deepEqual(result, stats());
  assert.equal(source.internalDetails, 'not-for-display');
});

test('missing fields, nulls, arrays and stringified money are not treated as zero', () => {
  for (const value of [null, undefined, [], {}, '0',
    { ...stats(), monthlyEquivalentMinor: undefined }, { ...stats(), scheduledChargesMinor: null },
    { ...stats(), monthlyEquivalentMinor: '320000' }, { ...stats(), currency: undefined },
  ]) assert.throws(() => validateDashboardStats(value), /Некорректные данные/);
});

test('negative, fractional and unsafe monetary aggregates are rejected for either card', () => {
  for (const field of ['monthlyEquivalentMinor', 'scheduledChargesMinor']) {
    for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => validateDashboardStats({ ...stats(), [field]: value }), /Некорректные данные/);
    }
  }
});

test('other currencies are not silently converted to RUB', () => {
  for (const currency of ['USD', 'EUR', 'CNY', 'rub', ['RUB'], null]) {
    assert.throws(() => validateDashboardStats({ ...stats(), currency }), /Некорректные данные/);
  }
});

test('month must be a complete valid YYYY-MM key', () => {
  for (const month of ['2026-00', '2026-13', '2026-1', '2026-11-01', '0000-11', '', undefined, 202611]) {
    assert.equal(isStatsMonth(month), false);
    assert.throws(() => validateDashboardStats({ ...stats(), month }), /Некорректные данные/);
  }
  assert.equal(isStatsMonth('2027-01'), true);
});

test('scheduled charges label uses the supplied month in the right Russian case, not the browser month', () => {
  const names = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  names.forEach((name, index) => assert.equal(scheduledChargesTitle(`2026-${String(index + 1).padStart(2, '0')}`), `Реально спишется в ${name}`));
  assert.throws(() => scheduledChargesTitle('2026-13'));
});

test('absence of a configured API adapter produces unavailable state, not zero or demo sums', async () => {
  assert.deepEqual(await loadDashboardStats(undefined, new AbortController().signal), { kind: 'unavailable' });
});

test('loader receives cancellation signal and ready state contains only validated aggregates', async () => {
  const controller = new AbortController();
  const state = await loadDashboardStats(async (signal) => {
    assert.equal(signal, controller.signal); return stats();
  }, controller.signal);
  assert.deepEqual(state, { kind: 'ready', data: stats() });
});

test('a cancelled request does not invoke its loader', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  await assert.rejects(loadDashboardStats(async () => { calls += 1; return stats(); }, controller.signal), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('a stale response after cancellation cannot become ready', async () => {
  const controller = new AbortController();
  let finish;
  const pending = loadDashboardStats(() => new Promise((resolve) => { finish = resolve; }), controller.signal);
  controller.abort(); finish(stats());
  await assert.rejects(pending, { name: 'AbortError' });
});

test('failed or malformed loader responses never become ready and have no demo fallback', async () => {
  await assert.rejects(loadDashboardStats(async () => { throw new Error('failure'); }, new AbortController().signal), /failure/);
  await assert.rejects(loadDashboardStats(async () => ({ ...stats(), scheduledChargesMinor: '3760.00' }), new AbortController().signal), /Некорректные данные/);
});

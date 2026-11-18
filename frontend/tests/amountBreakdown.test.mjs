import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateAmountBreakdown, monthlyEquivalentMinor } from '../src/dashboard/amountBreakdownModel.ts';
import { parseSubscriptions } from '../src/subscriptions/model.ts';

const row = (patch = {}) => parseSubscriptions([{ id: 1, name: 'Подписка', amount: 100, currency: 'RUB', period: 'MONTHLY', periodDays: null,
  status: 'ACTIVE', nextPaymentDate: '2000-01-01', categoryId: 1, ...patch }])[0];
const sum = groups => groups.reduce((total, item) => total + item.amountMinor, 0);

for (const [period, days, minor, group] of [
  ['WEEKLY', null, 43333n, 'weekly'], ['MONTHLY', null, 10000n, 'monthly'], ['YEARLY', null, 833n, 'yearly'],
  ['CUSTOM', 85, 3529n, 'quarterly'], ['CUSTOM', 90, 3333n, 'quarterly'], ['CUSTOM', 95, 3158n, 'quarterly'],
  ['CUSTOM', 84, 3571n, 'other'], ['CUSTOM', 96, 3125n, 'other'], ['CUSTOM', 17, 17647n, 'other'],
]) test(`${period}/${days}: backend normalization and correct group`, () => {
  const subscription = row({ period, periodDays: days });
  assert.equal(monthlyEquivalentMinor(subscription), minor);
  const serverTotal = Number((minor + 50n) / 100n * 100n);
  const data = aggregateAmountBreakdown([subscription], 'RUB', serverTotal);
  assert.equal(data.groups.find(item => item.id === group).count, 1);
  assert.equal(sum(data.groups), serverTotal);
  assert.equal(data.groups.find(item => item.id === group).percentage, 100);
});

test('HALF_UP occurs per subscription in cents before the total is rounded to whole currency units', () => {
  assert.equal(monthlyEquivalentMinor(row({ amount: 0.06, period: 'YEARLY' })), 1n);
  const subscriptions = Array.from({ length: 50 }, (_, index) => row({ id: index + 1, amount: 0.06, period: 'YEARLY' }));
  assert.equal(sum(aggregateAmountBreakdown(subscriptions, 'RUB', 100).groups), 100);
  assert.throws(() => aggregateAmountBreakdown(subscriptions, 'RUB', 0), /расходятся/);
});

test('balanced amount and percentage rounding uses stable group order and never changes the server total', () => {
  const subscriptions = [row({ amount: 1.5 }), row({ id: 2, amount: 18, period: 'YEARLY' })];
  const data = aggregateAmountBreakdown(subscriptions, 'RUB', 300);
  assert.deepEqual(data.groups.map(item => item.amountMinor), [200, 0, 0, 100, 0]);
  assert.deepEqual(data.groups.map(item => item.percentage), [67, 0, 0, 33, 0]);
  assert.deepEqual(data, aggregateAmountBreakdown([...subscriptions].reverse(), 'RUB', 300));
  assert.equal(sum(data.groups), 300);
  assert.equal(data.groups.reduce((total, item) => total + item.percentage, 0), 100);
  assert.throws(() => aggregateAmountBreakdown(subscriptions, 'RUB', 400), /расходятся/);
});

test('only ACTIVE subscriptions in the selected currency participate; dates do not filter monthly equivalents', () => {
  const subscriptions = [row(), row({ id: 2, currency: 'USD', amount: 20 }), row({ id: 3, status: 'PAUSED' }),
    row({ id: 4, status: 'CANCELLED' }), row({ id: 5, nextPaymentDate: '2099-01-01' })];
  assert.equal(aggregateAmountBreakdown(subscriptions, 'RUB', 20000).groups[0].count, 2);
  assert.equal(sum(aggregateAmountBreakdown(subscriptions, 'USD', 2000).groups), 2000);
  for (const currency of ['EUR', 'CNY']) assert.equal(sum(aggregateAmountBreakdown(subscriptions, currency, 0).groups), 0);
});

test('empty and sub-unit monthly totals do not manufacture percentages or amounts', () => {
  const empty = aggregateAmountBreakdown([], 'RUB', 0);
  assert.equal(empty.groups.length, 5);
  assert.ok(empty.groups.every(item => item.count === 0 && item.amountMinor === 0 && item.percentage === 0));
  const tiny = aggregateAmountBreakdown([row({ amount: 0.01 })], 'RUB', 0);
  assert.equal(tiny.groups[0].count, 1);
  assert.ok(tiny.groups.every(item => item.amountMinor === 0 && item.percentage === 0));
});

test('all four Dashboard currencies use independent populated groups without conversion', () => {
  const currencies = ['RUB', 'USD', 'EUR', 'CNY'];
  const subscriptions = currencies.map((currency, index) => row({ id: index + 1, currency, amount: index + 1 }));
  for (const [index, currency] of currencies.entries()) {
    const data = aggregateAmountBreakdown(subscriptions, currency, (index + 1) * 100);
    assert.equal(data.currency, currency);
    assert.equal(data.groups[0].count, 1);
    assert.equal(data.groups[0].amountMinor, (index + 1) * 100);
    assert.equal(data.groups[0].percentage, 100);
  }
});

test('many fractional amounts stay safe, reconcile exactly and leave the input unchanged', () => {
  const subscriptions = Array.from({ length: 100 }, (_, index) => row({ id: index + 1, amount: (index + 1) / 100,
    period: ['MONTHLY', 'WEEKLY', 'YEARLY', 'CUSTOM'][index % 4], periodDays: index % 4 === 3 ? index + 1 : null }));
  const before = structuredClone(subscriptions);
  const total = subscriptions.reduce((sum, item) => sum + monthlyEquivalentMinor(item), 0n);
  const serverTotal = Number((total + 50n) / 100n * 100n);
  const data = aggregateAmountBreakdown(subscriptions, 'RUB', serverTotal);
  assert.equal(sum(data.groups), serverTotal);
  assert.equal(data.groups.reduce((sum, item) => sum + item.percentage, 0), 100);
  assert.deepEqual(subscriptions, before);
});

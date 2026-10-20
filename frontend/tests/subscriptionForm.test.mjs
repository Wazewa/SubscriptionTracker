import test from 'node:test';
import assert from 'node:assert/strict';
import { initialFormValues, validateSubscriptionForm, subscriptionPayload } from '../src/subscriptions/formModel.ts';
const categories = [{ id: '1', name: 'Кино', description: '' }];
const values = { name: 'Кино', price: '299,99', currency: 'RUB', period: 'monthly', periodDays: '', nextPaymentDate: '2099-10-20', category: '1' };
test('form accepts decimal prices with comma or dot and all supported currencies', () => {
  assert.deepEqual(validateSubscriptionForm(values, categories), {});
  for (const currency of ['RUB', 'USD', 'EUR', 'CNY']) assert.deepEqual(validateSubscriptionForm({ ...values, price: ' 299.99 ', currency }), {});
});
test('form rejects fractional cents, non-decimal notation and unsafe monetary values', () => {
  for (const price of ['0.001', '299.999', '1e3', '0xFF', 'Infinity', '-10', '0', '', '1,2,3', '999999999999999999999']) assert.ok(validateSubscriptionForm({ ...values, price }).price, price);
});
test('required fields, dictionary ID, name length, currency and custom period are validated', () => {
  const errors = validateSubscriptionForm({ ...values, name: ' ', price: '', category: ' ', period: 'daily', nextPaymentDate: '' });
  for (const field of ['name', 'price', 'category', 'period', 'nextPaymentDate']) assert.ok(errors[field], field);
  assert.ok(validateSubscriptionForm({ ...values, name: 'x'.repeat(101) }).name);
  assert.ok(validateSubscriptionForm({ ...values, category: '99' }, categories).category);
  assert.ok(validateSubscriptionForm({ ...values, currency: 'GBP' }).currency);
  for (const periodDays of ['', '0', '-1', '1.5', '2147483648']) assert.ok(validateSubscriptionForm({ ...values, period: 'custom', periodDays }).periodDays);
});
test('dates must exist and not precede the local date', () => {
  for (const date of ['2026-02-30', '2026-02-29', '2026-10-19']) assert.ok(validateSubscriptionForm({ ...values, nextPaymentDate: date }, categories, '2026-10-20').nextPaymentDate);
  assert.deepEqual(validateSubscriptionForm({ ...values, nextPaymentDate: '2026-10-20' }, categories, '2026-10-20'), {});
  assert.deepEqual(validateSubscriptionForm({ ...values, nextPaymentDate: '2028-02-29' }, categories, '2026-10-20'), {});
});
test('edit retains full annual charge, not monthly equivalent; request has numeric ID and null non-custom days', () => {
  const subscription = { id: '1', name: 'Сервис', amountMinor: 12345, monthlyPriceMinor: null, currency: 'EUR', categoryId: '1', period: 'yearly', periodDays: null, nextPaymentDate: '2099-10-20' };
  const initial = initialFormValues(subscription); assert.equal(initial.price, '123.45'); assert.equal(initial.category, '1');
  assert.deepEqual(subscriptionPayload({ ...initial, periodDays: '30' }, categories), { name: 'Сервис', amount: 123.45, currency: 'EUR', categoryId: 1, period: 'YEARLY', periodDays: null, nextPaymentDate: '2099-10-20' });
  assert.equal(subscriptionPayload({ ...values, period: 'custom', periodDays: '17' }, categories).periodDays, 17);
  assert.throws(() => subscriptionPayload({ ...values, category: '99' }, categories));
  assert.equal(initialFormValues().name, '');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { initialFormValues, validateSubscriptionForm } from '../src/subscriptions/formModel.ts';

const values = { name: 'Кино', price: '299,99', period: 'monthly', nextPaymentDate: '2026-10-20', category: 'Кино' };

test('subscription form accepts decimal prices with comma or dot', () => {
  assert.deepEqual(validateSubscriptionForm(values), {});
  assert.deepEqual(validateSubscriptionForm({ ...values, price: ' 299.99 ' }), {});
  assert.deepEqual(validateSubscriptionForm({ ...values, price: '0.01', period: 'yearly' }), {});
});

test('subscription form rejects fractional kopecks and non-decimal number syntax', () => {
  for (const price of ['0.001', '299.999', '1e3', '0xFF', 'Infinity', '-10', '0', '', '1,2,3']) {
    assert.ok(validateSubscriptionForm({ ...values, price }).price, price);
  }
});

test('subscription form rejects unsafe monetary values', () => {
  assert.ok(validateSubscriptionForm({ ...values, price: '999999999999999999999999' }).price);
});

test('subscription form validates required fields and period', () => {
  const errors = validateSubscriptionForm({ name: ' ', price: '', category: ' ', period: 'weekly', nextPaymentDate: '' });
  for (const field of ['name', 'price', 'category', 'period', 'nextPaymentDate']) assert.ok(errors[field], field);
});

test('subscription form validates actual calendar dates', () => {
  assert.ok(validateSubscriptionForm({ ...values, nextPaymentDate: '2026-02-30' }).nextPaymentDate);
  assert.ok(validateSubscriptionForm({ ...values, nextPaymentDate: '2026-02-29' }).nextPaymentDate);
  assert.deepEqual(validateSubscriptionForm({ ...values, nextPaymentDate: '2028-02-29' }), {});
});

test('edit form retains monthly price and existing category without mutation', () => {
  const subscription = { id: '1', name: 'Сервис', monthlyPriceMinor: 12345, currency: 'RUB',
    category: 'Пользовательская категория', period: 'yearly', nextPaymentDate: '2026-10-20', active: false };
  const initial = initialFormValues(subscription);
  assert.equal(initial.price, '123.45');
  assert.equal(initial.category, 'Пользовательская категория');
  assert.equal(initial.period, 'yearly');
  assert.deepEqual(validateSubscriptionForm(initial), {});
  initial.name = 'Изменено';
  assert.equal(subscription.name, 'Сервис');
  assert.equal(initialFormValues().name, '');
});

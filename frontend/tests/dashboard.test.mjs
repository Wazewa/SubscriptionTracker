import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryPercentages, formatPaymentDate, isDateKey, localDateKey, nearestPayments, validateDashboard } from '../src/dashboard/model.ts';

const empty = () => ({ month: '2026-10', currency: 'RUB', subscriptionCount: 0, totalMinor: 0, categories: [], upcoming: [] });
test('empty dashboard and zero expenses are valid', () => {
  assert.equal(validateDashboard(empty()).totalMinor, 0);
  assert.deepEqual(categoryPercentages([]), []);
  assert.deepEqual(categoryPercentages([{ amountMinor: 0 }]), [0]);
});
test('nearest payments exclude past dates, include today, sort, limit to 5 without mutating input', () => {
  const payments = [7, 3, 1, 5, 4, 2, 6].map((day) => ({ id: String(day), date: `2026-10-0${day}` }));
  const before = structuredClone(payments);
  assert.deepEqual(nearestPayments(payments, '2026-10-02').map((item) => item.id), ['2', '3', '4', '5', '6']);
  assert.deepEqual(payments, before);
  assert.deepEqual(nearestPayments(payments, '2026-11-01'), []);
});
test('calendar dates are validated and displayed without UTC shift', () => {
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('2024-02-29'), true);
  assert.equal(localDateKey(new Date(2026, 9, 5)), '2026-10-05');
  assert.equal(formatPaymentDate('2026-10-05'), '05.10.2026');
});
test('category percentages match totals and sum to 100 after rounding', () => {
  assert.deepEqual(categoryPercentages([64000, 96000, 160000].map((amountMinor) => ({ amountMinor }))), [20, 30, 50]);
  assert.deepEqual(categoryPercentages([1, 1, 1].map((amountMinor) => ({ amountMinor }))), [34, 33, 33]);
});
test('invalid money and inconsistent category totals cannot be displayed', () => {
  assert.throws(() => validateDashboard({ ...empty(), totalMinor: -1 }));
  assert.throws(() => validateDashboard({ ...empty(), totalMinor: NaN }));
  assert.throws(() => validateDashboard({ ...empty(), totalMinor: 0.5 }));
  assert.throws(() => validateDashboard({ ...empty(), subscriptionCount: 1, totalMinor: 100, categories: [] }));
});
test('duplicate categories, impossible payment dates and inconsistent empty state are rejected', () => {
  assert.throws(() => validateDashboard({ ...empty(), categories: [{ id: '1', name: 'Кино', amountMinor: 0 }, { id: '1', name: 'Кино', amountMinor: 0 }] }));
  assert.throws(() => validateDashboard({ ...empty(), subscriptionCount: 1, upcoming: [{ id: '1', name: 'Кино', date: '2026-02-30', amountMinor: 100 }] }));
  assert.throws(() => validateDashboard({ ...empty(), upcoming: [{ id: '1', name: 'Кино', date: '2026-10-05', amountMinor: 100 }] }));
});

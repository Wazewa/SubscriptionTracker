import test from 'node:test';
import assert from 'node:assert/strict';
import { toastReducer } from '../src/notifications/model.ts';
const success = { id: 1, message: 'Подписка создана', kind: 'success' };
const error = { id: 2, message: 'Не удалось удалить подписку', kind: 'error', scope: 'delete-42' };
test('toast queue preserves severity and modal scope without mutating state', () => {
  const previous = [success];
  assert.deepEqual(toastReducer(previous, { type: 'show', toast: error }), [success, error]); assert.deepEqual(previous, [success]);
});
test('duplicate toast is replaced with a fresh ID', () => {
  assert.deepEqual(toastReducer([success, error], { type: 'show', toast: { ...success, id: 3 } }), [error, { ...success, id: 3 }]);
  assert.equal(toastReducer([error], { type: 'show', toast: { ...error, id: 3, scope: 'delete-43' } }).length, 2);
});
test('queue retains three newest items and ignores blank messages', () => {
  const previous = [success, error, { ...success, id: 3, message: 'Подписка обновлена' }];
  assert.deepEqual(toastReducer(previous, { type: 'show', toast: { ...success, id: 4, message: 'Подписка удалена' } }).map(toast=>toast.id), [2, 3, 4]);
  assert.equal(toastReducer(previous, { type: 'show', toast: { ...success, message: ' ' } }), previous);
});
test('dismiss and modal cleanup only remove their own notifications', () => {
  assert.deepEqual(toastReducer([success, error], { type: 'dismiss', id: 1 }), [error]);
  assert.deepEqual(toastReducer([success, error], { type: 'clearScope', scope: 'delete-42' }), [success]);
  assert.deepEqual(toastReducer([success], { type: 'dismiss', id: 999 }), [success]);
});

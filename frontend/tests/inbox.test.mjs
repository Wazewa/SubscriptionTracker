import test from 'node:test';
import assert from 'node:assert/strict';
import { filterInbox, inboxReadKey, loadReadNotifications, saveReadNotifications, notificationDayLabel, notificationPresentation } from '../src/notifications/inboxModel.ts';
import { createInboxDemo } from '../src/notifications/inboxDemo.ts';

test('filters unread notifications independently of their event type; payments exclude trial and system', () => {
  const items = createInboxDemo(new Date(2026, 10, 25, 16));
  const read = new Set(['demo-reminder']);
  assert.equal(filterInbox(items, 'all', read).length, 5);
  assert.equal(filterInbox(items, 'unread', read).length, 4);
  assert.deepEqual(filterInbox(items, 'payments', read).map(item => item.type), ['PAYMENT_REMINDER', 'RENEWAL', 'PRICE_CHANGE']);
  assert.equal(items[0].id, 'demo-reminder');
  assert.deepEqual(filterInbox(items, 'unread', new Set(items.map(item => item.id))), []);
  for (const item of items) assert.ok(notificationPresentation[item.type].title);
});

test('reading persists across reloads and does not cross account or demo boundaries', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(saveReadNotifications('First@Example.com', new Set(['demo-price']), storage), true);
  assert.deepEqual([...loadReadNotifications('first@example.com', storage)], ['demo-price']);
  assert.equal(loadReadNotifications('other@example.com', storage).size, 0);
  assert.equal(loadReadNotifications('demo:first@example.com', storage).size, 0);
});

test('unavailable storage and corrupt saved data do not break the notification center', () => {
  assert.equal(loadReadNotifications('test', null).size, 0);
  assert.equal(saveReadNotifications('test', new Set(['1']), null), false);
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  assert.equal(loadReadNotifications('test', denied).size, 0);
  assert.equal(saveReadNotifications('test', new Set(['1']), denied), false);
  assert.equal(loadReadNotifications('test', { getItem: () => '{', setItem() {} }).size, 0);
  assert.deepEqual([...loadReadNotifications('test', { getItem: () => '["1",42,null]', setItem() {} })], ['1']);
  assert.notEqual(inboxReadKey('user'), inboxReadKey('demo:user'));
});

test('date groups respect calendar boundaries including the year transition', () => {
  const now = new Date(2027, 0, 1, 12);
  assert.equal(notificationDayLabel(new Date(2027, 0, 1, 9).toISOString(), now), 'Сегодня');
  assert.equal(notificationDayLabel(new Date(2026, 11, 31, 20).toISOString(), now), 'Вчера');
  assert.match(notificationDayLabel(new Date(2026, 11, 30, 20).toISOString(), now), /2026/);
});

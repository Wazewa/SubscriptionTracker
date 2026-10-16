import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAuthSession, readSession, TOKEN_KEY, DEMO_KEY } from '../src/auth/session.ts';

function storage(initial) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (key) => values.get(key) ?? null, removeItem: (key) => values.delete(key) };
}

test('logout removes token and demo flag but preserves unrelated data', () => {
  const session = storage({ [TOKEN_KEY]: 'test-token', [DEMO_KEY]: 'true', theme: 'green' });
  clearAuthSession(session);
  assert.equal(readSession(TOKEN_KEY, session), null);
  assert.equal(readSession(DEMO_KEY, session), null);
  assert.equal(session.values.get('theme'), 'green');
});

test('logout is idempotent with an empty or already cleared session', () => {
  const session = storage({});
  clearAuthSession(session);
  clearAuthSession(session);
  assert.equal(session.values.size, 0);
});

test('failure removing token does not skip removal of demo session', () => {
  const calls = [];
  clearAuthSession({ getItem: () => null, removeItem: (key) => {
    calls.push(key);
    if (key === TOKEN_KEY) throw new Error('Storage unavailable');
  } });
  assert.deepEqual(calls, [TOKEN_KEY, DEMO_KEY]);
});

test('blocked or absent storage does not throw during session cleanup', () => {
  assert.doesNotThrow(() => clearAuthSession(null));
  const blocked = { getItem: () => { throw new Error('Blocked'); }, removeItem: () => { throw new Error('Blocked'); } };
  assert.doesNotThrow(() => clearAuthSession(blocked));
  assert.equal(readSession(TOKEN_KEY, blocked), null);
  assert.equal(readSession(TOKEN_KEY, null), null);
});

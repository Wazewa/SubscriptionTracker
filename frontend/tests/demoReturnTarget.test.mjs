import test from 'node:test';
import assert from 'node:assert/strict';
import { demoReturnTarget } from '../src/auth/demoReturnTarget.ts';

test('demo login returns to every supported protected route', () => {
  for (const path of ['/dashboard', '/subscriptions', '/subscriptions/new', '/settings']) {
    assert.equal(demoReturnTarget(path), path);
    assert.equal(demoReturnTarget(`${path}?source=dashboard`), `${path}?source=dashboard`);
  }
});

test('demo login rejects external URLs, unknown routes and invalid state', () => {
  for (const path of [null, undefined, {}, '//example.com', 'https://example.com', '/login', '/subscriptions/unknown', '/dashboard-other', '/subscriptions/../login']) {
    assert.equal(demoReturnTarget(path), '/dashboard');
  }
});

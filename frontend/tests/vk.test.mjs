import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { VK_SESSION_KEY, vkConfig, prepareVkLogin, consumeVkCallback } from '../src/auth/vk.ts';
import { createAuthApi } from '../src/auth/api.ts';
import { clearAuthSession, TOKEN_KEY } from '../src/auth/session.ts';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
const config = vkConfig('123456', undefined, 'http://localhost:3000');
async function fixture() {
  const saved = storage();
  const url = new URL(await prepareVkLogin(config, '/settings', saved, crypto, 100));
  const params = new URLSearchParams({ state: url.searchParams.get('state'), code: 'one-time-code', device_id: 'device' });
  return { saved, url, params };
}

test('configuration requires a public client ID and a same-origin callback', () => {
  assert.equal(config.redirectUri, 'http://localhost:3000/auth/vk/callback');
  for (const [id, redirect, origin] of [
    ['', undefined, 'http://localhost:3000'], ['secret', undefined, 'http://localhost:3000'],
    ['123', 'https://attacker.test/auth/vk/callback', 'https://app.test'],
    ['123', '/login', 'https://app.test'], ['123', '/auth/vk/callback?next=x', 'https://app.test'],
    ['123', undefined, 'http://app.test'],
  ]) assert.throws(() => vkConfig(id, redirect, origin));
});

test('authorization uses fresh PKCE S256, state and never places the verifier in the URL', async () => {
  const { saved, url } = await fixture();
  const record = JSON.parse(saved.getItem(VK_SESSION_KEY));
  assert.equal(url.origin + url.pathname, 'https://id.vk.ru/authorize');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('redirect_uri'), config.redirectUri);
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.equal(url.searchParams.get('code_challenge'), createHash('sha256').update(record.codeVerifier).digest('base64url'));
  assert.equal(url.searchParams.get('state'), record.state);
  assert.equal(url.searchParams.has('code_verifier'), false);
  const next = await fixture();
  assert.notEqual(next.url.searchParams.get('state'), record.state);
  assert.notEqual(JSON.parse(next.saved.getItem(VK_SESSION_KEY)).codeVerifier, record.codeVerifier);
});

test('callback preserves backend DTO fields, safe return path and consumes the session once', async () => {
  const { saved, params } = await fixture();
  const record = JSON.parse(saved.getItem(VK_SESSION_KEY));
  assert.deepEqual(consumeVkCallback(params.toString(), saved, 101), {
    payload: { code: 'one-time-code', codeVerifier: record.codeVerifier, deviceId: 'device', state: record.state }, returnTo: '/settings',
  });
  assert.equal(saved.getItem(VK_SESSION_KEY), null);
  assert.throws(() => consumeVkCallback(params.toString(), saved, 102));
});

test('rejects missing, duplicate or mismatched callback fields before exchanging the code', async () => {
  for (const modify of [p => p.delete('state'), p => p.set('state', 'wrong'), p => p.append('state', p.get('state')),
    p => p.delete('code'), p => p.append('code', 'other'), p => p.delete('device_id'), p => p.set('device_id', ' ')]) {
    const { saved, params } = await fixture();
    modify(params);
    assert.throws(() => consumeVkCallback(params.toString(), saved, 101));
    assert.equal(saved.getItem(VK_SESSION_KEY), null);
  }
});

test('expired, future, malformed, cancelled and logged-out attempts cannot authenticate', async () => {
  for (const time of [99, 600101]) {
    const { saved, params } = await fixture();
    assert.throws(() => consumeVkCallback(params.toString(), saved, time));
  }
  const { saved, params } = await fixture();
  params.set('error', 'access_denied'); params.set('error_description', 'untrusted-provider-content');
  assert.throws(() => consumeVkCallback(params.toString(), saved, 101), error => !error.message.includes('untrusted-provider-content'));
  saved.setItem(VK_SESSION_KEY, 'broken json');
  assert.throws(() => consumeVkCallback(params.toString(), saved, 101));
  const loggedOut = await fixture(); clearAuthSession(loggedOut.saved);
  assert.throws(() => consumeVkCallback(loggedOut.params.toString(), loggedOut.saved, 101));
});

test('storage failures prevent redirect and return URLs cannot leave the application', async () => {
  await assert.rejects(prepareVkLogin(config, '/settings', { setItem() { throw new Error(); } }), /хранение сессии/);
  const saved = storage();
  await prepareVkLogin(config, 'https://attacker.test', saved);
  assert.equal(JSON.parse(saved.getItem(VK_SESSION_KEY)).returnTo, '/dashboard');
  const f = await fixture();
  const data = JSON.parse(f.saved.getItem(VK_SESSION_KEY)); data.returnTo = '//attacker.test';
  f.saved.setItem(VK_SESSION_KEY, JSON.stringify(data));
  assert.equal(consumeVkCallback(f.params.toString(), f.saved, 101).returnTo, '/dashboard');
});

test('VK exchange sends only the agreed DTO to backend and validates the application token', async () => {
  const payload = { code: 'code', codeVerifier: 'verifier', deviceId: 'device', state: 'state' };
  const api = createAuthApi('/api/', async (url, options) => {
    assert.equal(url, '/api/auth/vk'); assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), payload);
    return Response.json({ token: 'application-token' });
  });
  assert.equal(await api.loginWithVk(payload), 'application-token');
  for (const response of [{}, { token: '' }, { token: 42 }]) {
    await assert.rejects(createAuthApi('/api', async () => Response.json(response)).loginWithVk(payload));
  }
});

test('provider and backend failures never masquerade as password errors or reveal response details', async () => {
  for (const status of [400, 401, 409, 500]) {
    const api = createAuthApi('/api', async () => Response.json({ message: 'secret-provider-response' }, { status }));
    await assert.rejects(api.loginWithVk({}), error => error.status === status && !/secret-provider-response|Неверный email или пароль/.test(error.message));
  }
  const saved = storage(); saved.setItem(TOKEN_KEY, 'old-session');
  const { params } = await fixture();
  assert.throws(() => consumeVkCallback(params.toString(), saved, 101));
  assert.equal(saved.getItem(TOKEN_KEY), 'old-session');
});

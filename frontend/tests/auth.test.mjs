import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthApi, ApiError } from '../src/auth/api.ts';

const profile = { userId: 1, email: 'test@example.com', baseCurrency: 'RUB', status: 'PENDING' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('login and profile preserve API prefix and use Bearer token', async () => {
  const calls = [];
  const api = createAuthApi('/api/', async (url, options) => {
    calls.push({ url, options });
    return reply(url.endsWith('/login') ? { token: 'test-token' } : profile);
  });
  const token = await api.login('test@example.com', 'test-password');
  assert.deepEqual(await api.me(token), profile);
  assert.equal(calls[0].url, '/api/auth/login');
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'test@example.com', password: 'test-password' });
  assert.equal(calls[1].url, '/api/auth/me');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token');
});

test('registration sends confirmation and consent but does not imply login', async () => {
  const payload = { email: 'test@example.com', password: 'test-password', confirmPassword: 'test-password', personalDataConsent: true };
  const api = createAuthApi('/api', async (url, options) => {
    assert.equal(url, '/api/auth/register');
    assert.deepEqual(JSON.parse(options.body), payload);
    return reply(profile);
  });
  assert.deepEqual(await api.register(payload), profile);
});

test('known backend errors are translated without exposing server details', async () => {
  const api = createAuthApi('/api', async () => reply({ message: 'Invalid email or password' }, 401));
  await assert.rejects(api.login('test@example.com', 'wrong-password'), (error) => error instanceof ApiError && error.status === 401 && error.message === 'Неверный email или пароль.');
  const server = createAuthApi('/api', async () => reply({ message: 'private server detail' }, 500));
  await assert.rejects(server.me('test-token'), /Ошибка сервера/);
});

test('invalid success responses cannot authenticate a user', async () => {
  const api = createAuthApi('/api', async () => reply({}));
  await assert.rejects(api.login('test@example.com', 'test-password'), /токен/);
  await assert.rejects(api.me('test-token'), /некорректные данные/);
});

test('network failures and non-JSON errors produce actionable messages', async () => {
  const network = createAuthApi('/api', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(network.me('test-token'), /Не удалось связаться/);
  const html = createAuthApi('/api', async () => new Response('<html>Bad gateway</html>', { status: 502 }));
  await assert.rejects(html.me('test-token'), /Ошибка сервера/);
});

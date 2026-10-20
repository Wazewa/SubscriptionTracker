import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthApi, ApiError } from '../src/auth/api.ts';
import { validatePasswordChange } from '../src/auth/password.ts';

const profile = { userId: 1, email: 'test@example.com', baseCurrency: 'RUB', status: 'PENDING' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('password change PATCH sends exact Swagger fields, bearer token and handles empty 204', async () => {
  const payload = { currentPassword: 'old-password', newPassword: 'new-password', confirmNewPassword: 'new-password' };
  const api = createAuthApi('/api/', async (url, options) => {
    assert.equal(url, '/api/auth/change-password'); assert.equal(options.method, 'PATCH');
    assert.equal(options.headers.Authorization, 'Bearer token'); assert.deepEqual(JSON.parse(options.body), payload);
    return new Response(null, { status: 204 });
  });
  assert.equal(await api.changePassword('token', payload), undefined);
  await assert.rejects(api.changePassword('', payload), (error) => error.status === 401);
});
test('password change validation and known backend errors do not expose secrets', async () => {
  const valid = { currentPassword: 'old-password', newPassword: 'new-password', confirmNewPassword: 'new-password' };
  assert.deepEqual(validatePasswordChange(valid), {});
  for (const patch of [{ currentPassword: '' }, { newPassword: 'short' }, { newPassword: 'old-password' }, { confirmNewPassword: '' }, { newPassword: 'я'.repeat(40) }]) assert.ok(Object.keys(validatePasswordChange({ ...valid, ...patch })).length);
  const api = createAuthApi('/api', async () => reply({ message: 'Current password is incorrect' }, 400));
  await assert.rejects(api.changePassword('token', valid), /Текущий пароль неверен/);
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(api.changePassword('token', valid, cancelled.signal), { name: 'AbortError' });
  const unexpected = createAuthApi('/api', async () => reply({ message: 'not a confirmed change' }));
  await assert.rejects(unexpected.changePassword('token', valid), /Не удалось подтвердить смену пароля/);
});

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

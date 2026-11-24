import { demoReturnTarget } from './demoReturnTarget.ts';

export const VK_SESSION_KEY = 'subscription-tracker.vk-login';
const TTL = 10 * 60 * 1000;
const unavailable = 'Вход через ВК пока недоступен. Войдите с помощью email и пароля.';
const invalid = 'Не удалось подтвердить вход через ВК. Начните вход заново.';
export class VkLoginError extends Error {}
export type VkPayload = { code: string; codeVerifier: string; deviceId: string; state: string };
type VkConfig = { clientId: string; redirectUri: string };
type VkSession = { state: string; codeVerifier: string; returnTo: string; createdAt: number };

export function vkConfig(clientId: string | undefined, redirectUri: string | undefined, origin: string): VkConfig {
  if (!clientId || !/^[1-9]\d*$/.test(clientId)) throw new VkLoginError(unavailable);
  let redirect: URL;
  try { redirect = new URL(redirectUri || '/auth/vk/callback', origin); }
  catch { throw new VkLoginError(unavailable); }
  if (redirect.origin !== origin || redirect.pathname !== '/auth/vk/callback' || redirect.search || redirect.hash
    || redirect.username || redirect.password
    || (redirect.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(redirect.hostname))) throw new VkLoginError(unavailable);
  return { clientId, redirectUri: redirect.href };
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function prepareVkLogin(config: VkConfig, returnTo: unknown, storage: Storage, cryptoApi = crypto, now = Date.now()): Promise<string> {
  const codeVerifier = base64url(cryptoApi.getRandomValues(new Uint8Array(32)));
  const state = base64url(cryptoApi.getRandomValues(new Uint8Array(32)));
  const codeChallenge = base64url(new Uint8Array(await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))));
  const session: VkSession = { state, codeVerifier, returnTo: demoReturnTarget(returnTo), createdAt: now };
  try {
    const saved = JSON.stringify(session);
    storage.setItem(VK_SESSION_KEY, saved);
    if (storage.getItem(VK_SESSION_KEY) !== saved) throw new Error();
  } catch { throw new VkLoginError('Разрешите хранение сессии в браузере, чтобы войти через ВК.'); }
  const url = new URL('https://id.vk.ru/authorize');
  url.search = new URLSearchParams({
    response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri,
    state, code_challenge: codeChallenge, code_challenge_method: 's256', scope: 'email',
  }).toString();
  return url.href;
}

// Consume before exchanging the one-time code. Reload/replay must start a new login.
export function consumeVkCallback(search: string, storage: Storage, now = Date.now()): { payload: VkPayload; returnTo: string } {
  let session: VkSession;
  try {
    const saved = storage.getItem(VK_SESSION_KEY);
    storage.removeItem(VK_SESSION_KEY);
    session = JSON.parse(saved || 'null');
  } catch { throw new VkLoginError(invalid); }
  const params = new URLSearchParams(search);
  const single = (name: string) => params.getAll(name).length === 1 ? params.get(name) : null;
  if (!session || !/^[A-Za-z0-9_-]{43}$/.test(session.state) || !/^[A-Za-z0-9_-]{43}$/.test(session.codeVerifier)
    || !Number.isFinite(session.createdAt) || now < session.createdAt || now - session.createdAt > TTL
    || single('state') !== session.state) throw new VkLoginError(invalid);
  if (params.has('error')) throw new VkLoginError('Вход через ВК отменён или отклонён. Можно попробовать снова.');
  const code = single('code');
  const deviceId = single('device_id');
  if (!code?.trim() || !deviceId?.trim() || code.length > 4096 || deviceId.length > 4096) throw new VkLoginError(invalid);
  return { payload: { code, codeVerifier: session.codeVerifier, deviceId, state: session.state }, returnTo: demoReturnTarget(session.returnTo) };
}

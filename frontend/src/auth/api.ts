export type ApiUser = { userId: number; email: string; baseCurrency: string; status: string };
export type RegisterPayload = { email: string; password: string; confirmPassword: string; personalDataConsent: boolean };
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
const messages: Record<string, string> = {
  'Invalid email or password': 'Неверный email или пароль.',
  'User with this email already exists': 'Пользователь с таким email уже зарегистрирован.',
  'Passwords do not match': 'Пароли не совпадают.',
  'Consent to personal data processing is required': 'Подтвердите согласие на обработку персональных данных.',
  'Email is required': 'Укажите email.',
  'Email must be valid': 'Укажите корректный email.',
  'Password is required': 'Укажите пароль.',
  'Password must contain at least 8 characters': 'Пароль должен содержать не менее 8 символов.',
  'Password confirmation is required': 'Повторите пароль.',
};
export function createAuthApi(base = '/api', request: typeof fetch = fetch) {
  async function send(path: string, options: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await request(`${base.replace(/\/$/, '')}${path}`, { ...options, signal: controller.signal });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? messages[data.message] : undefined;
        const fallback = response.status === 401 ? 'Неверный email или пароль. Войдите снова.'
          : response.status === 409 ? 'Пользователь с таким email уже зарегистрирован.'
          : response.status === 400 ? 'Проверьте заполнение полей.'
          : response.status === 403 ? 'Доступ запрещён.' : 'Ошибка сервера. Попробуйте позже.';
        throw new ApiError(message || fallback, response.status);
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error(controller.signal.aborted ? 'Сервер не ответил вовремя. Попробуйте ещё раз.' : 'Не удалось связаться с сервером. Проверьте подключение и повторите попытку.');
    } finally { clearTimeout(timer); }
  }
  function user(data: unknown): ApiUser {
    if (!data || typeof data !== 'object' || !('email' in data) || typeof data.email !== 'string'
      || !('userId' in data) || !Number.isSafeInteger(data.userId)
      || !('baseCurrency' in data) || typeof data.baseCurrency !== 'string'
      || !('status' in data) || typeof data.status !== 'string') throw new Error('Сервер вернул некорректные данные пользователя.');
    return data as ApiUser;
  }
  return {
    async login(email: string, password: string): Promise<string> {
      const data = await send('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!data || typeof data !== 'object' || !('token' in data) || typeof data.token !== 'string' || !data.token.trim()) throw new Error('Сервер не вернул токен входа.');
      return data.token;
    },
    async me(token: string): Promise<ApiUser> { return user(await send('/auth/me', { headers: { Authorization: `Bearer ${token}` } })); },
    async register(payload: RegisterPayload): Promise<ApiUser> {
      return user(await send('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
    },
  };
}

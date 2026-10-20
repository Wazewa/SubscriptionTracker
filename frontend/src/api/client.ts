export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export function createApiClient(base = '/api', request: typeof fetch = fetch) {
  return async function send(path: string, token: string, options: RequestInit = {}, signal?: AbortSignal): Promise<unknown> {
    if (!token.trim()) throw new HttpError('Сессия истекла. Войдите снова.', 401);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 10000);
    const mutation = options.method && options.method !== 'GET';
    try {
      if (controller.signal.aborted) throw new DOMException('Отменено', 'AbortError');
      const response = await request(`${base.replace(/\/$/, '')}${path}`, { ...options,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, signal: controller.signal });
      if (!response.ok) {
        const messages: Record<number, string> = {
          400: 'Проверьте название, стоимость, категорию, период и дату (не раньше сегодняшней).',
          401: 'Сессия истекла. Войдите снова.', 403: 'Нет доступа к этому действию.',
          404: 'Подписка или категория не найдена. Обновите список.', 409: 'Данные изменились. Обновите список.',
        };
        throw new HttpError(messages[response.status] || 'Ошибка сервера. Попробуйте позже.', response.status);
      }
      if (response.status === 204) return undefined;
      return await response.json().catch(() => { throw new Error(mutation ? 'Сервер вернул некорректный ответ. Проверьте список перед повторной отправкой.' : 'Сервер вернул некорректный ответ.'); });
    } catch (error) {
      if (signal?.aborted) throw new DOMException('Запрос отменён.', 'AbortError');
      if (controller.signal.aborted || error instanceof TypeError) throw new Error(mutation
        ? 'Не удалось подтвердить результат. Обновите список перед повторной отправкой: изменение могло сохраниться.'
        : controller.signal.aborted ? 'Сервер не ответил вовремя. Повторите загрузку.' : 'Не удалось связаться с сервером. Повторите загрузку.');
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  };
}

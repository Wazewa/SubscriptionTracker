export const TOKEN_KEY = 'subscription-tracker.token';
export const DEMO_KEY = 'subscription-tracker.demo';
type SessionStorage = Pick<Storage, 'getItem' | 'removeItem'>;

function browserStorage(): SessionStorage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export function readSession(key: string, storage = browserStorage()): string | null {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

export function clearAuthSession(storage = browserStorage()): void {
  // Remove keys independently: failure for one must not skip the other.
  // Never clear unrelated application/browser data.
  for (const key of [TOKEN_KEY, DEMO_KEY]) {
    try { storage?.removeItem(key); } catch { /* In-memory logout still works when storage is unavailable. */ }
  }
}

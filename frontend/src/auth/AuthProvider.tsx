import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createAuthApi } from './api';

type User = { email: string; isDemo?: boolean };
type AuthState = { user: User | null; loading: boolean; error: string; login: (email: string, password: string) => Promise<void>; startDemo: () => void; logout: () => void };
const AuthContext = createContext<AuthState | null>(null);
const TOKEN_KEY = 'subscription-tracker.token';
const DEMO_KEY = 'subscription-tracker.demo';
function readSession(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    if (import.meta.env.DEV && readSession(DEMO_KEY) === 'true') {
      setUser({ email: 'demo@example.com', isDemo: true }); setLoading(false); return;
    }
    const token = readSession(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
    fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session validation failed');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('email' in data) || typeof data.email !== 'string') throw new Error('Invalid user response');
        if (!cancelled && current === generation.current) setUser({ email: data.email });
      })
      .catch(() => {
        if (cancelled || current !== generation.current) return;
        try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* Storage can be disabled. */ }
        setUser(null); setError('Не удалось подтвердить сессию. Войдите снова.');
      })
      .finally(() => { window.clearTimeout(timeout); if (!cancelled && current === generation.current) setLoading(false); });
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, []);

  async function login(email: string, password: string) {
    const current = ++generation.current;
    const api = createAuthApi(import.meta.env.VITE_API_BASE_URL || '/api');
    setError('');
    const token = await api.login(email, password);
    const profile = await api.me(token);
    if (current !== generation.current) throw new Error('Вход отменён. Повторите попытку.');
    try { sessionStorage.removeItem(DEMO_KEY); sessionStorage.setItem(TOKEN_KEY, token); }
    catch { throw new Error('Разрешите хранение сессии в браузере, чтобы войти.'); }
    setUser(profile); setLoading(false);
  }
  function logout() {
    generation.current += 1;
    try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(DEMO_KEY); } catch { /* Logout also works without storage. */ }
    setUser(null); setError(''); setLoading(false);
  }
  function startDemo() {
    if (!import.meta.env.DEV) return;
    generation.current += 1;
    try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.setItem(DEMO_KEY, 'true'); } catch { /* Fall back to memory for this page. */ }
    setUser({ email: 'demo@example.com', isDemo: true }); setError(''); setLoading(false);
  }
  return <AuthContext.Provider value={{ user, loading, error, login, startDemo, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}

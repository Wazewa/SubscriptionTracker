import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type User = { email: string };
type AuthState = { user: User | null; loading: boolean; error: string; startDemo: () => void; logout: () => void };
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
  useEffect(() => {
    if (import.meta.env.DEV && readSession(DEMO_KEY) === 'true') {
      setUser({ email: 'demo@example.com' }); setLoading(false); return;
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
        if (!cancelled) setUser({ email: data.email });
      })
      .catch(() => {
        if (cancelled) return;
        try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* Storage can be disabled. */ }
        setUser(null); setError('Не удалось подтвердить сессию. Войдите снова.');
      })
      .finally(() => { window.clearTimeout(timeout); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, []);

  function logout() {
    try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(DEMO_KEY); } catch { /* Logout also works without storage. */ }
    setUser(null); setError('');
  }
  function startDemo() {
    if (!import.meta.env.DEV) return;
    try { sessionStorage.setItem(DEMO_KEY, 'true'); } catch { /* Fall back to memory for this page. */ }
    setUser({ email: 'demo@example.com' }); setError('');
  }
  return <AuthContext.Provider value={{ user, loading, error, startDemo, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}

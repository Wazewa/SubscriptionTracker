import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { consumeVkCallback, VkLoginError } from '../auth/vk';
import { ApiError } from '../auth/api';

export default function VkCallback() {
  const { loginWithVk, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const search = useRef(location.search);
  const attempt = useRef<Promise<string> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    document.title = 'Вход через ВК — Трекер подписок';
    if (loading) return;
    let active = true;
    if (!attempt.current) {
      // Remove OAuth parameters from the visible URL/history before API calls.
      window.history.replaceState(window.history.state, '', location.pathname);
      attempt.current = (async () => {
        const { payload, returnTo } = consumeVkCallback(search.current, sessionStorage);
        await loginWithVk(payload);
        return returnTo;
      })();
    }
    attempt.current.then(target => { if (active) navigate(target, { replace: true }); })
      .catch(error => { if (active) setError(error instanceof ApiError || error instanceof VkLoginError ? error.message : 'Не удалось войти через ВК. Вернитесь на страницу входа и попробуйте снова или войдите с помощью email и пароля.'); });
    return () => { active = false; };
  }, [loading, loginWithVk, location.pathname, navigate]);
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f8f4] p-5 text-[#183d20]">
    <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm" aria-busy={!error}>
      <h1 className="font-unbounded text-xl">Вход через ВК</h1>
      {error ? <><p role="alert" className="mt-4 text-sm">{error}</p><Link to="/login" replace className="mt-5 inline-flex rounded-xl border border-[#285d25] px-4 py-3 focus-visible:outline-2 focus-visible:outline-green-700">Вернуться ко входу</Link></>
        : <p role="status" className="mt-4">Подтверждаем вход…</p>}
    </section>
  </main>;
}

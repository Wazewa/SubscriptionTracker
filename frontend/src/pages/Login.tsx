import Logo from "../components/Logo";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { demoReturnTarget } from '../auth/demoReturnTarget';
import DemoEntry from '../components/DemoEntry';
import { prepareVkLogin, vkConfig, VkLoginError } from '../auth/vk';

import mailIcon from "../assets/icons/mail.svg";
import lock1Icon from "../assets/icons/lock1.svg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [vkPending, setVkPending] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    const restore = () => { inFlight.current = false; setPending(false); setVkPending(false); };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !event.currentTarget.reportValidity()) return;
    const values = new FormData(event.currentTarget);
    inFlight.current = true; setPending(true); setMessage('');
    try {
      await login(String(values.get('email')).trim(), String(values.get('password')));
      navigate(demoReturnTarget(location.state?.from), { replace: true });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось войти.'); }
    finally { inFlight.current = false; setPending(false); }
  }
  async function handleVkLogin() {
    if (inFlight.current) return;
    inFlight.current = true; setVkPending(true); setPending(true); setMessage('');
    try {
      const config = vkConfig(import.meta.env.VITE_VK_CLIENT_ID, import.meta.env.VITE_VK_REDIRECT_URI, window.location.origin);
      const url = await prepareVkLogin(config, location.state?.from, sessionStorage);
      window.location.assign(url);
    } catch (error) {
      setMessage(error instanceof VkLoginError ? error.message : 'Не удалось начать вход через ВК. Попробуйте снова.');
      inFlight.current = false; setPending(false); setVkPending(false);
    }
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f4] px-4 py-2">
      <section aria-label="Вход в систему" className="w-full max-w-[438px] rounded-[24px] border border-[#eeeeea] bg-white px-5 pb-2 pt-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.16)] sm:px-[46px]">
        <div className="-mx-3 sm:-mx-7"><Logo compact subtitle="Удобный способ управлять вашими подписками" /></div>
        <h2 className="mb-0 text-center text-[21px] font-bold text-[#171717]">
          Вход в систему
        </h2>

        <form
          className="space-y-[18px]"
          onSubmit={handleSubmit}
          aria-busy={pending}
        >
          {location.state?.notice && <p role="status" className="text-sm text-[#285d25]">{String(location.state.notice)}</p>}
          <div>
            <label
              htmlFor="email"
              className="mb-0.5 block px-[10px] text-[16px] font-bold leading-[16px] text-[#285d25]"
            >
              Email
            </label>

            <div className="flex h-[37px] items-center gap-[14px] rounded-[14px] border-2 border-[#285d25] px-3 focus-within:ring-2 focus-within:ring-[#3ba273]/30">
              <img src={mailIcon} alt="" className="h-6 w-6 shrink-0" />

              <input
                id="email"
                name="email"
                required
                autoComplete="username"
                disabled={pending}
                type="email"
                placeholder="Введите ваш email"
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#858b85]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-0.5 block px-[10px] text-[16px] font-bold leading-[16px] text-[#285d25]"
            >
              Пароль
            </label>

            <div className="flex h-[37px] items-center gap-[14px] rounded-[14px] border-2 border-[#285d25] px-3 focus-within:ring-2 focus-within:ring-[#3ba273]/30">
              <img src={lock1Icon} alt="" className="h-6 w-6 shrink-0" />

              <input
                id="password"
                name="password"
                required
                minLength={8}
                autoComplete="current-password"
                disabled={pending}
                type="password"
                placeholder="Введите пароль"
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#858b85]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="font-unbounded !mt-3 flex min-h-[38px] w-full items-center justify-center rounded-full bg-[#3ba273] px-3 py-1 text-[18px] font-bold text-white hover:bg-[#318c62] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d25] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending && !vkPending ? 'Входим…' : 'Войти'}
          </button>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        </form>
        <div className="my-[7px] flex items-center text-[18px] leading-5 text-[#171717]" aria-hidden="true">
          <span className="h-px flex-1 bg-[#3ba273]" /><span className="px-0.5">или</span><span className="h-px flex-1 bg-[#3ba273]" />
        </div>
        <button type="button" onClick={handleVkLogin} disabled={pending} aria-busy={vkPending}
          className="font-unbounded flex min-h-[38px] w-full items-center justify-center rounded-full border-2 border-[#285d25] bg-white px-3 py-1 text-[17px] font-bold text-[#216b43] transition-colors hover:bg-[#f0f7ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d25] disabled:cursor-not-allowed disabled:opacity-50">
          {vkPending ? 'Открываем ВК…' : 'Войти через ВК'}
        </button>
      <p className="mb-0 mt-[20px] text-center text-[14px] font-bold text-[#123d12]">
        Нет аккаунта?{" "}
        <Link
          to="/register"
          className="font-bold text-[#3ba273] hover:underline"
        >
          Зарегистрироваться
        </Link>
      </p>
      </section>
      <DemoEntry />
    </main>
  );
}

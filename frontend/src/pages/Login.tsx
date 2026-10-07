import Logo from "../components/Logo";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { demoReturnTarget } from '../auth/demoReturnTarget';
import DemoEntry from '../components/DemoEntry';

import mailIcon from "../assets/icons/mail.svg";
import lock1Icon from "../assets/icons/lock1.svg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
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
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f7f8f4] px-4 py-6">
      <Logo subtitle="Удобный способ управлять вашими подписками" />

      <section className="mt-2 w-full max-w-[504px] rounded-[26px] border border-[#eeeeea] bg-white px-8 py-5 shadow-[0_2px_6px_rgba(0,0,0,0.12)] sm:px-[52px]">
        <h2 className="mb-5 text-center text-[23px] font-bold text-[#123d12]">
          Вход в систему
        </h2>

        <form
          className="space-y-[15px]"
          onSubmit={handleSubmit}
          aria-busy={pending}
        >
          <div>
            <label
              htmlFor="email"
              className="mb-0.5 block text-[22px] font-bold leading-tight text-[#285d25]"
            >
              Email
            </label>

            <div className="flex h-[43px] items-center gap-4 rounded-[16px] border-2 border-[#285d25] px-3">
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
              className="mb-0.5 block text-[22px] font-bold leading-tight text-[#285d25]"
            >
              Пароль
            </label>

            <div className="flex h-[43px] items-center gap-4 rounded-[16px] border-2 border-[#285d25] px-3">
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
            className="font-unbounded mt-2 w-full rounded-full bg-[#3ba273] py-[9px] text-[20px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Входим…' : 'Войти'}
          </button>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        </form>
      </section>

      <p className="mt-3 text-center text-[15px] font-bold text-[#123d12]">
        Нет аккаунта?{" "}
        <Link
          to="/register"
          className="font-bold text-[#285d25] hover:underline"
        >
          Зарегистрироваться
        </Link>
      </p>
      <DemoEntry />
    </main>
  );
}

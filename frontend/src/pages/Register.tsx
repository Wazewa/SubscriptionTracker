import Logo from "../components/Logo";
import { Link } from 'react-router-dom';

import mailIcon from "../assets/icons/mail.svg";
import lock1Icon from "../assets/icons/lock1.svg";
import lock2Icon from "../assets/icons/lock2.svg";

export default function Register() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f7f8f4] px-4 py-6">
      <Logo />

      <section className="mt-2 w-full max-w-[504px] rounded-[26px] border border-[#eeeeea] bg-white px-8 py-2 shadow-[0_2px_6px_rgba(0,0,0,0.12)] sm:px-[52px]">
        <h2 className="mb-1 text-center text-[23px] font-bold text-[#123d12]">
          Зарегистрироваться
        </h2>

        <form
          className="space-y-[9px]"
          onSubmit={(event) => event.preventDefault()}
        >
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-0.5 block text-[22px] font-bold leading-tight text-[#285d25]"
            >
              Email
            </label>

            <div className="flex h-[43px] items-center gap-4 rounded-[16px] border-2 border-[#285d25] px-3">
              <img
                src={mailIcon}
                alt=""
                className="h-6 w-6 shrink-0 object-contain"
              />

              <input
                id="email"
                type="email"
                placeholder="Введите ваш email"
                className="w-full bg-transparent text-sm font-bold text-[#183d20] outline-none placeholder:text-[#858b85]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-0.5 block text-[22px] font-bold leading-tight text-[#285d25]"
            >
              Пароль
            </label>

            <div className="flex h-[43px] items-center gap-4 rounded-[16px] border-2 border-[#285d25] px-3">
              <img
                src={lock1Icon}
                alt=""
                className="h-6 w-6 shrink-0 object-contain"
              />

              <input
                id="password"
                type="password"
                placeholder="Придумайте пароль"
                className="w-full bg-transparent text-sm font-bold text-[#183d20] outline-none placeholder:text-[#858b85]"
              />
            </div>
          </div>

          {/* Repeat password */}
          <div>
            <label
              htmlFor="repeatPassword"
              className="mb-0.5 block text-[22px] font-bold leading-tight text-[#285d25]"
            >
              Повторите пароль
            </label>

            <div className="flex h-[43px] items-center gap-4 rounded-[16px] border-2 border-[#285d25] px-3">
              <img
                src={lock2Icon}
                alt=""
                className="h-6 w-6 shrink-0 object-contain"
              />

              <input
                id="repeatPassword"
                type="password"
                placeholder="Повторите пароль"
                className="w-full bg-transparent text-sm font-bold text-[#183d20] outline-none placeholder:text-[#858b85]"
              />
            </div>
          </div>

          {/* Register button */}
          <button
            type="submit"
            className="font-unbounded mt-1 w-full rounded-full bg-[#3ba273] py-[9px] text-[20px] font-bold text-white transition-colors hover:bg-[#318b62] active:bg-[#287650]"
          >
            Зарегистрироваться
          </button>
        </form>
      </section>

      <p className="mt-3 text-center text-[15px] font-bold text-[#123d12]">
        Уже есть аккаунт?{" "}
        <Link
          to="/login"
          className="font-bold text-[#285d25] hover:underline"
        >
          Войти
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-[#687468]">Регистрация будет доступна после подключения API авторизации.</p>
    </main>
  );
}

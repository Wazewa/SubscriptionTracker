import { Link } from "react-router-dom";

import logo from "../assets/icons/logo.svg";
import notificationIcon from "../assets/icons/notification1.svg";
import accountIcon from "../assets/icons/account.svg";

import dashboardIcon from "../assets/icons/dashboard.svg";
import subscriptionsIcon from "../assets/icons/subscriptions.svg";
import settingsIcon from "../assets/icons/settings.svg";
import exitIcon from "../assets/icons/exit.svg";

import mailIcon from "../assets/icons/mail.svg";
import lockIcon from "../assets/icons/lock1.svg";

export default function Settings() {
  return (
    <main className="flex min-h-screen bg-[#f7f8f4] text-[#183d20]">

      {/* Боковое меню */}
      <aside className="flex min-h-screen w-[217px] shrink-0 flex-col rounded-r-[20px] bg-white px-2 py-6 shadow-[2px_0_6px_rgba(0,0,0,0.12)]">

        {/* Логотип */}
        <div className="mb-14 flex items-center gap-2 px-1">
          <img
            src={logo}
            alt="Логотип"
            className="h-11 w-11 shrink-0 rounded-xl object-contain"
          />

          <h1 className="font-unbounded text-[19px] font-bold leading-tight text-[#101b10]">
            Трекер
            <br />
            подписок
          </h1>
        </div>

        {/* Навигация */}
        <nav className="flex flex-col gap-1">

          {/* Дашборд */}
          <div className="group flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-[#052400] transition-all duration-200 hover:bg-[#F6F6F1] hover:text-[#2E9B62]">
            <img
              src={dashboardIcon}
              alt=""
              className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:icon-green"
            />
            <span className="text-sm font-bold">Дашборд</span>
          </div>

          {/* Подписки */}
          <div className="group flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-[#052400] transition-all duration-200 hover:bg-[#F6F6F1] hover:text-[#2E9B62]">
            <img
              src={subscriptionsIcon}
              alt=""
              className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:icon-green"
            />
            <span className="text-sm font-bold">Подписки</span>
          </div>

          {/* Настройки */}
          <div className="group flex cursor-pointer items-center gap-2 rounded-xl bg-[#f5f6f2] px-4 py-2 text-[#2E9B62] transition-all duration-200">
            <img
              src={settingsIcon}
              alt=""
              className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:icon-green"
            />
            <span className="text-sm font-bold">Настройки</span>
          </div>

        </nav>

        {/* Профиль и выход */}
        <div className="mt-auto">

<div className="group mb-2 flex cursor-pointer items-center gap-2 rounded-xl px-1 py-1 transition-colors duration-200 hover:bg-[#F6F6F1]">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#205b20] text-lg font-bold text-white">
            P
          </div>

            <span className="truncate text-xs font-bold text-[#222]">
              pochta@gmail.com
            </span>
          </div>

          <Link
            to="/login"
            className="group flex items-center justify-center gap-2 rounded-xl py-2 text-[#052400] transition-all duration-200 hover:bg-[#F6F6F1] hover:text-[#2E9B62] active:scale-95"
          >
            <img
              src={exitIcon}
              alt=""
              className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:icon-green"
            />

            <span className="font-bold">Выйти</span>
          </Link>

        </div>
      </aside>

      {/* Основная область */}
      <section className="min-w-0 flex-1 px-7 py-4 sm:px-8">

        {/* Заголовок и иконки */}
        <header className="mb-9 flex items-start justify-between">

          <div>
            <h2 className="font-unbounded text-[42px] font-bold leading-tight text-[#101010]">
              Настройки
            </h2>

            <p className="mt-1 text-sm font-bold text-[#858b85]">
              Управляйте своим аккаунтом
            </p>
          </div>

          <div className="flex items-center gap-5 pt-1">

            {/* Уведомления */}
            <button
              type="button"
              aria-label="Уведомления"
              className="rounded-full p-1 transition-all duration-200 hover:scale-110 hover:bg-[#F6F6F1] active:scale-95"
            >
              <img
                src={notificationIcon}
                alt=""
                className="h-9 w-9 object-contain"
              />
            </button>

            {/* Аккаунт */}
            <button
              type="button"
              aria-label="Аккаунт"
              className="rounded-full transition-all duration-200 hover:scale-110 hover:bg-[#F6F6F1] active:scale-95"
            >
              <img
                src={accountIcon}
                alt=""
                className="h-9 w-9 object-contain"
              />
            </button>

          </div>
        </header>

        {/* Форма настроек */}
        <div className="w-full max-w-[850px]">

          <form
            className="space-y-5"
            onSubmit={(event) => event.preventDefault()}
          >

            {/* Email */}
            <div>
              <label
                htmlFor="settingsEmail"
                className="mb-1 block text-[21px] font-bold text-[#285d25]"
              >
                Email
              </label>

              <div className="flex h-[41px] items-center gap-4 rounded-[15px] border-2 border-[#285d25] bg-white px-3">
                <img
                  src={mailIcon}
                  alt=""
                  className="h-6 w-6 shrink-0"
                />

                <input
                  id="settingsEmail"
                  type="email"
                  value="pochta@gmail.com"
                  readOnly
                  className="w-full bg-transparent text-sm font-bold text-[#285d25] outline-none"
                />
              </div>
            </div>

            {/* Пароль */}
            <div>
              <label
                htmlFor="settingsPassword"
                className="mb-1 block text-[21px] font-bold text-[#285d25]"
              >
                Пароль
              </label>

              <div className="flex h-[41px] items-center gap-4 rounded-[15px] border-2 border-[#858b85] bg-white px-3">
                <img
                  src={lockIcon}
                  alt=""
                  className="h-6 w-6 shrink-0"
                />

                <input
                  id="settingsPassword"
                  type="password"
                  value="password12345678"
                  readOnly
                  className="w-full bg-transparent text-sm font-bold text-[#285d25] outline-none"
                />
              </div>
            </div>

            {/* Кнопка сохранения */}
            <button
              type="submit"
              className="font-unbounded w-full rounded-full bg-[#3ba273] py-[9px] text-[20px] font-bold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-[#2E9B62] active:scale-[0.99]"
            >
              Сохранить изменения
            </button>

          </form>
        </div>
      </section>
    </main>
  );
}

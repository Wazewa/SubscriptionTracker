import Logo from "../components/Logo";
import { useRef, useState, type FormEvent } from 'react';
import { createAuthApi } from '../auth/api';
import { Link } from 'react-router-dom';
import ConsentDialog from '../components/ConsentDialog';
import EmailConfirmationMessage from '../components/EmailConfirmationMessage';
import { consentDocument } from '../registration/consentDocument';

import mailIcon from "../assets/icons/mail.svg";
import lock1Icon from "../assets/icons/lock1.svg";
import lock2Icon from "../assets/icons/lock2.svg";

export default function Register() {
  const [consent, setConsent] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [previewEmail, setPreviewEmail] = useState(false);
  const [pending, setPending] = useState(false);
  const [registered, setRegistered] = useState(false);
  const inFlight = useRef(false);
  const canAgree = Boolean(consentDocument.approved && consentDocument.text && consentDocument.version) || import.meta.env.DEV;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setFormMessage('');
    if (!canAgree) {
      setConsentError('');
      setFormMessage('Регистрация пока недоступна: текст согласия находится на согласовании.');
      return;
    }
    if (!consent) {
      setConsentError('Подтвердите согласие на обработку персональных данных.');
      event.currentTarget.querySelector<HTMLInputElement>('#personal-data-consent')?.focus();
      return;
    }
    setConsentError('');
    if (!event.currentTarget.reportValidity()) return;
    const values = new FormData(event.currentTarget);
    if (values.get('password') !== values.get('repeatPassword')) {
      setFormMessage('Пароли не совпадают.');
      return;
    }
    if (!consentDocument.approved) {
      setFormMessage('Текст согласия ещё не утверждён. Регистрация не отправлена. Предпросмотр доступен без создания аккаунта.');
      return;
    }
    const form = event.currentTarget;
    inFlight.current = true; setPending(true);
    try {
      await createAuthApi(import.meta.env.VITE_API_BASE_URL || '/api').register({
        email: String(values.get('email')).trim(), password: String(values.get('password')),
        confirmPassword: String(values.get('repeatPassword')), personalDataConsent: consent,
      });
      form.reset(); setConsent(false); setRegistered(true);
    } catch (error) { setFormMessage(error instanceof Error ? error.message : 'Не удалось зарегистрироваться.'); }
    finally { inFlight.current = false; setPending(false); }
  }

  if (registered) return <main className="flex min-h-screen flex-col items-center bg-[#f7f8f4] px-4 py-6"><Logo /><section role="status" className="mt-4 max-w-[504px] rounded-3xl bg-white p-7 text-center"><h2 className="text-xl">Аккаунт создан</h2><p className="mt-3 text-sm">Подтверждение почты пока не подключено: письмо не отправлялось.</p><Link to="/login" className="mt-5 inline-block text-green-800 underline">Перейти ко входу</Link></section></main>;

  if (previewEmail && import.meta.env.DEV) return (
    <main className="flex min-h-screen flex-col items-center bg-[#f7f8f4] px-4 py-6">
      <Logo />
      <EmailConfirmationMessage preview onBack={() => { setPreviewEmail(false); setConsent(false); setConsentError(''); setFormMessage(''); }} />
    </main>
  );
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f7f8f4] px-4 py-6">
      <Logo />

      <section className="mt-2 w-full max-w-[504px] rounded-[26px] border border-[#eeeeea] bg-white px-8 py-2 shadow-[0_2px_6px_rgba(0,0,0,0.12)] sm:px-[52px]">
        <h2 className="mb-1 text-center text-[23px] font-bold text-[#123d12]">
          Зарегистрироваться
        </h2>

        <form
          className="space-y-[9px]"
          noValidate
          onSubmit={handleSubmit}
          aria-busy={pending}
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
                name="email"
                autoComplete="email"
                required
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
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
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
                name="repeatPassword"
                autoComplete="new-password"
                required
                minLength={8}
                type="password"
                placeholder="Повторите пароль"
                className="w-full bg-transparent text-sm font-bold text-[#183d20] outline-none placeholder:text-[#858b85]"
              />
            </div>
          </div>

          <div className="pt-3">
            <div className="flex items-start gap-3 text-sm leading-relaxed text-[#183d20]">
              <input id="personal-data-consent" name="personalDataConsent" type="checkbox" checked={consent} disabled={!canAgree} onChange={(event) => { setConsent(event.target.checked); if (event.target.checked) setConsentError(''); setFormMessage(''); }} aria-invalid={Boolean(consentError)} aria-describedby={consentError ? 'consent-error consent-note' : 'consent-note'} className="mt-1 h-5 w-5 shrink-0 accent-[#2e9b62] focus-visible:outline-2 focus-visible:outline-green-700" />
              <div><label htmlFor="personal-data-consent">Я согласен на обработку персональных данных.</label>{' '}
                <button type="button" aria-haspopup="dialog" onClick={() => setConsentOpen(true)} className="rounded text-[#285d25] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-green-700">Текст согласия</button>
              </div>
            </div>
            <p id="consent-note" className="mt-2 text-xs leading-relaxed text-[#687468]">{consentDocument.approved ? `Версия текста согласия: ${consentDocument.version}.` : 'Макет: текст согласия добавлен как черновик и находится на согласовании. Реальная регистрация недоступна.'}</p>
            {consentError && <p id="consent-error" role="alert" className="mt-2 text-sm text-red-700">{consentError}</p>}
          </div>
          {formMessage && <p role="alert" className="text-sm leading-relaxed text-red-700">{formMessage}</p>}
          {/* Register button */}
          <button
            type="submit"
            disabled={!canAgree || pending}
            aria-describedby="registration-unavailable consent-note"
            className="font-unbounded mt-1 w-full rounded-full bg-[#3ba273] py-[9px] text-[20px] font-bold text-white transition-colors hover:bg-[#318b62] active:bg-[#287650] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
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
      <p id="registration-unavailable" className="mt-4 text-center text-sm text-[#687468]">{consentDocument.approved ? 'Отправка письма подтверждения пока не подключена.' : 'API подключён. Создание аккаунта недоступно до утверждения текста согласия.'}</p>
      {import.meta.env.DEV && <button type="button" onClick={() => setPreviewEmail(true)} className="mt-3 rounded-lg border border-[#cbdcc7] px-4 py-2 text-xs text-[#45643b] hover:bg-white focus-visible:outline-2 focus-visible:outline-green-700">Предпросмотр сообщения о почте (без отправки)</button>}
      <ConsentDialog open={consentOpen} onClose={() => setConsentOpen(false)} />
    </main>
  );
}

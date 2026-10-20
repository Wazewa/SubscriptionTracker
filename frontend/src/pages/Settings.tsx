import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { createAuthApi } from '../auth/api';
import { validatePasswordChange, type PasswordValues } from '../auth/password';
import { useApiAction } from '../api/useApiAction';
import mailIcon from '../assets/icons/mail.svg';

const empty: PasswordValues = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
const labels: Record<keyof PasswordValues, string> = { currentPassword: 'Текущий пароль', newPassword: 'Новый пароль', confirmNewPassword: 'Повторите новый пароль' };
export default function Settings() {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const { pending, error, run } = useApiAction();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordValues, string>>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const validation = validatePasswordChange(values); setErrors(validation);
    if (Object.keys(validation).length) return;
    const result = await run((token, signal) => createAuthApi(import.meta.env.VITE_API_BASE_URL || '/api').changePassword(token, values, signal));
    if (result) {
      setValues(empty); logout();
      navigate('/login', { replace: true, state: { notice: 'Пароль изменён. Войдите с новым паролем. Предыдущие сессии завершены.' } });
    }
  }
  return (
    <section className="max-w-[850px] rounded-2xl border border-[#e1e5dc] bg-white p-6 sm:p-8">
      <label htmlFor="settingsEmail" className="mb-2 block text-lg text-[#285d25]">Email</label>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-[#285d25] px-3 py-2"><img src={mailIcon} alt="" className="h-6 w-6" /><input id="settingsEmail" type="email" value={user?.email || ''} readOnly className="min-w-0 w-full bg-transparent text-sm outline-none" /></div>
      <h2 className="mt-6 text-xl text-[#285d25]">Смена пароля</h2>
      <p className="mt-2 text-sm text-[#687468]">После сохранения потребуется войти заново на всех устройствах.</p>
      {user?.isDemo && <p className="mt-3 text-sm">В демо-режиме пароль изменить нельзя.</p>}
      <form onSubmit={submit} noValidate aria-busy={pending} className="mt-4">
        <fieldset disabled={pending || user?.isDemo} className="space-y-4">
          {(Object.keys(labels) as (keyof PasswordValues)[]).map((field) => <div key={field}>
            <label htmlFor={field} className="mb-2 block text-lg text-[#285d25]">{labels[field]}</label>
            <input id={field} type="password" autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} value={values[field]}
              onChange={(event) => { setValues((current) => ({ ...current, [field]: event.target.value })); setErrors((current) => ({ ...current, [field]: undefined })); }}
              aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined}
              className="w-full rounded-2xl border-2 border-[#285d25] px-3 py-2 text-sm disabled:opacity-50" />
            {errors[field] && <p id={`${field}-error`} role="alert" className="mt-1 text-sm text-red-700">{errors[field]}</p>}
          </div>)}
          <button type="submit" className="font-unbounded w-full rounded-full bg-[#3ba273] px-4 py-3 text-white disabled:opacity-50">{pending ? 'Сохраняем…' : 'Изменить пароль'}</button>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </form>
    </section>
  );
}

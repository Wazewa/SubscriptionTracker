import { useAuth } from '../auth/AuthProvider';
import mailIcon from '../assets/icons/mail.svg';
import lockIcon from '../assets/icons/lock1.svg';
export default function Settings() {
  const { user } = useAuth();
  return (
    <section className="max-w-[850px] rounded-2xl border border-[#e1e5dc] bg-white p-6 sm:p-8">
      <label htmlFor="settingsEmail" className="mb-2 block text-lg text-[#285d25]">Email</label>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-[#285d25] px-3 py-2"><img src={mailIcon} alt="" className="h-6 w-6" /><input id="settingsEmail" type="email" value={user?.email || ''} readOnly className="min-w-0 w-full bg-transparent text-sm outline-none" /></div>
      <label htmlFor="settingsPassword" className="mb-2 mt-5 block text-lg text-[#285d25]">Новый пароль</label>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-[#858b85] px-3 py-2"><img src={lockIcon} alt="" className="h-6 w-6" /><input id="settingsPassword" type="password" autoComplete="new-password" placeholder="Изменение пароля пока недоступно" disabled className="min-w-0 w-full bg-transparent text-sm" /></div>
      <button type="button" disabled className="font-unbounded mt-5 w-full rounded-full bg-[#3ba273] px-4 py-3 text-white opacity-50">Сохранить изменения</button>
      <p className="mt-4 text-sm leading-relaxed text-[#687468]">Изменение пароля и сохранение настроек будут доступны после подключения API аккаунта.</p>
    </section>
  );
}

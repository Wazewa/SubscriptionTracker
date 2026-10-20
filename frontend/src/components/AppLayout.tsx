import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import logo from '../assets/icons/logo.svg';
import dashboardIcon from '../assets/icons/dashboard.svg';
import subscriptionsIcon from '../assets/icons/subscriptions.svg';
import settingsIcon from '../assets/icons/settings.svg';
import LogoutButton from './LogoutButton';
import accountIcon from '../assets/icons/account.svg';
import notificationIcon from '../assets/icons/notification1.svg';

const sections = [
  { to: '/dashboard', title: 'Дашборд', subtitle: 'Сводка по вашим подпискам', icon: dashboardIcon },
  { to: '/subscriptions', title: 'Подписки', subtitle: 'Управляйте своими подписками', icon: subscriptionsIcon },
  { to: '/settings', title: 'Настройки', subtitle: 'Управляйте своим аккаунтом', icon: settingsIcon },
];
export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isNewSubscription = location.pathname === '/subscriptions/new';
  const isEditSubscription = /^\/subscriptions\/[^/]+\/edit$/.test(location.pathname);

  const section = isNewSubscription
    ? {
        title: 'Новая подписка',
        subtitle: 'Добавьте новую подписку, чтобы не забыть о следующем списании.',
      }
    : isEditSubscription
      ? {
          title: 'Редактирование подписки',
          subtitle: 'Измените данные выбранной подписки.',
        }
      : sections.find((item) => item.to === location.pathname) || sections[0];

  useEffect(() => { document.title = `${section.title} — Трекер подписок`; }, [section.title]);
  return (
    <div className="min-h-screen bg-[#f7f8f4] text-[#183d20] md:flex">
      <aside className="flex min-w-0 flex-col bg-white px-4 py-5 shadow-sm md:sticky md:top-0 md:h-screen md:w-[230px] md:shrink-0 md:rounded-r-[20px]">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-green-700 md:mb-12" aria-label="Трекер подписок — Дашборд">
          <img src={logo} alt="" className="h-11 w-11" /><span className="font-unbounded text-lg text-[#101b10]">Трекер<br />подписок</span>
        </Link>
        <nav aria-label="Основное меню" className="flex flex-wrap gap-1 md:flex-col">
          {sections.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to !== '/subscriptions'} className={({ isActive }) => `menu-link flex items-center gap-2 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[#f5f6f2] focus-visible:outline-2 focus-visible:outline-green-700 ${isActive ? 'bg-[#f5f6f2] text-[#2e9b62]' : 'text-[#052400]'}`}>
              <img src={item.icon} alt="" className="h-5 w-5" />{item.title}
            </NavLink>
          ))}
        </nav>
        <div className="mt-5 flex items-center justify-between gap-2 md:mt-auto md:flex-col md:items-stretch">
          <span className="min-w-0 truncate text-xs" title={user?.email}>{user?.email}</span>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
          <div className="min-w-0 flex-1 basis-[200px] sm:basis-auto"><h1 className="font-unbounded break-words text-xl text-[#101010] [overflow-wrap:anywhere] sm:text-2xl lg:text-3xl xl:text-4xl">{section.title}</h1><p className="mt-2 text-sm text-[#687468]">{section.subtitle}</p></div>
          <div className="flex shrink-0 items-center gap-3">
            <span title="Уведомления появятся в следующем спринте" aria-label="Уведомления пока недоступны"><img src={notificationIcon} alt="" className="h-8 w-8 opacity-50" /></span>
            <Link to="/settings" aria-label="Аккаунт — настройки" className="rounded-full focus-visible:outline-2 focus-visible:outline-green-700"><img src={accountIcon} alt="" className="h-8 w-8" /></Link>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

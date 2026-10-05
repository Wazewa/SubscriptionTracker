import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import SectionPlaceholder from './pages/SectionPlaceholder';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status" className="p-8">Проверяем сессию…</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}

function PublicRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  useEffect(() => {
    document.title = `${location.pathname === '/register' ? 'Регистрация' : 'Вход'} — Трекер подписок`;
  }, [location.pathname]);
  if (loading) return <p role="status" className="p-8">Проверяем сессию…</p>;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<SectionPlaceholder title="Дашборд" />} />
              <Route path="/subscriptions" element={<SectionPlaceholder title="Подписки" />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

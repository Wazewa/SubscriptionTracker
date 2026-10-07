import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { demoReturnTarget } from '../auth/demoReturnTarget';
export default function DemoEntry() {
  const { startDemo, error } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;
  const target = demoReturnTarget(from);
  return (
    <div className="mt-5 w-full max-w-[504px] text-center text-sm">
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      {import.meta.env.DEV && <><p className="mb-2 text-[#687468]">Проверка интерфейса без регистрации и запросов к серверу.</p><button type="button" onClick={() => { startDemo(); navigate(target, { replace: true }); }} className="rounded-xl border border-[#285d25] px-5 py-3 text-[#285d25] hover:bg-white focus-visible:outline-2 focus-visible:outline-green-700">Открыть демо меню</button></>}
    </div>
  );
}

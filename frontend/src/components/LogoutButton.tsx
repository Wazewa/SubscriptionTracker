import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import exitIcon from '../assets/icons/exit.svg';

export default function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }
  return (
    <button type="button" onClick={handleLogout} className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-3 hover:bg-[#f5f6f2] focus-visible:outline-2 focus-visible:outline-green-700">
      <img src={exitIcon} alt="" className="h-5 w-5" />Выйти
    </button>
  );
}

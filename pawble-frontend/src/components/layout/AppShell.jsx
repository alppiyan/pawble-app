import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';

const HIDE_NAV_ON = ['/conversation'];

export default function AppShell() {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_ON.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-dark dark:text-white">
      <div className="max-w-md mx-auto pb-20 min-h-screen">
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

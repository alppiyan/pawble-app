import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', icon: 'fa-house', label: 'Ana Sayfa' },
  { to: '/favorites', icon: 'fa-star', label: 'Favoriler' },
  { to: '/matches', icon: 'fa-comments', label: 'Sohbetler' },
  { to: '/profile', icon: 'fa-user', label: 'Profil' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
      <div className="max-w-md mx-auto flex">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            <i className={`fas ${t.icon} text-xl`} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

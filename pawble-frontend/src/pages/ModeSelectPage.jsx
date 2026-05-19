import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Header from '../components/layout/Header.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ModeSelectPage() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <>
      <Header
        title="Pawble"
        right={
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            title="Tema"
          >
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-dark dark:text-white`} />
          </button>
        }
      />
      <div className="p-6 space-y-4">
        <div className="card p-6">
          <h2 className="text-2xl font-bold">Merhaba {user?.name} 👋</h2>
          <p className="text-gray-500">Bugün ne yapmak istersin?</p>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="w-full card p-8 flex items-center gap-5 hover:scale-[1.01] transition text-left"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <i className="fas fa-heart text-3xl text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl">Eşleşme</h3>
            <p className="text-gray-500 text-sm">Dostuna uygun eş bul</p>
          </div>
          <i className="fas fa-chevron-right text-gray-400" />
        </button>

        <button
          onClick={() => navigate('/adoption')}
          className="w-full card p-8 flex items-center gap-5 hover:scale-[1.01] transition text-left"
        >
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
            <i className="fas fa-house-heart text-3xl text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl">Sahiplen</h3>
            <p className="text-gray-500 text-sm">Yuva arayan dostlara göz at</p>
          </div>
          <i className="fas fa-chevron-right text-gray-400" />
        </button>
      </div>
    </>
  );
}

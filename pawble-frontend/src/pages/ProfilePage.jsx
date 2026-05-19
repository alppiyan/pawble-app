import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMyPets } from '../hooks/useMyPets.js';
import { petApi } from '../api/petApi.js';
import { mediaUrl, placeholderImage } from '../utils/mediaUrl.js';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { pets, loading, refetch } = useMyPets();
  const navigate = useNavigate();

  const remove = async (id) => {
    if (!confirm('Bu dostu silmek istediğine emin misin?')) return;
    try {
      await petApi.remove(id);
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <Header
        title="Profil"
        right={
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            title="Çıkış"
          >
            <i className="fas fa-right-from-bracket text-dark dark:text-white" />
          </button>
        }
      />
      <div className="p-4 space-y-4">
        <section className="card p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <i className="fas fa-user text-2xl text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">
              {user?.name} {user?.surname}
            </h2>
            <p className="text-gray-500 text-sm">{user?.location || 'Konum belirtilmemiş'}</p>
            <p className="text-gray-400 text-xs">{user?.email}</p>
          </div>
          {user?.isAdmin && (
            <Link
              to="/admin"
              className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary"
              title="Admin"
            >
              <i className="fas fa-shield-halved" />
            </Link>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold">Dostlarım</h3>
            <Link to="/pet/new" className="text-primary text-sm font-medium">
              <i className="fas fa-plus mr-1" />
              Yeni
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Spinner />
            </div>
          ) : pets.length === 0 ? (
            <div className="card p-6 text-center text-gray-500">
              Henüz kayıtlı dostun yok.
            </div>
          ) : (
            <ul className="space-y-2">
              {pets.map((p) => (
                <li key={p.id} className="card p-3 flex items-center gap-3">
                  <img
                    src={mediaUrl(p.imagePath) || placeholderImage(100)}
                    alt={p.name}
                    className="w-14 h-14 rounded-2xl object-cover bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{p.name}</h4>
                    <p className="text-xs text-gray-500">
                      {p.breedName} · {p.age} yaş · {p.goal === 'adoption' ? 'Sahiplendirme' : 'Eşleşme'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/pet/${p.id}/edit`)}
                    className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                  >
                    <i className="fas fa-pen text-xs" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500"
                  >
                    <i className="fas fa-trash text-xs" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

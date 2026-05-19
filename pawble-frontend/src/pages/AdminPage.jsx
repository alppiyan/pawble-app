import { useEffect, useState } from 'react';
import Header from '../components/layout/Header.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { adminApi } from '../api/adminApi.js';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = () => {
    setLoading(true);
    adminApi
      .listUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (u) => {
    setBusy(u.id);
    try {
      await adminApi.toggleShelter(u.id, !u.isShelter);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isShelter: !x.isShelter } : x)));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Header title="Admin" back />
      <div className="p-4">
        {loading ? (
          <div className="py-8 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <i className="fas fa-user text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {u.name} {u.surname}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{u.email}</div>
                </div>
                <button
                  onClick={() => toggle(u)}
                  disabled={busy === u.id}
                  className={`text-xs font-semibold px-3 py-2 rounded-full ${
                    u.isShelter ? 'bg-secondary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {u.isShelter ? 'Barınak' : 'Barınak yap'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

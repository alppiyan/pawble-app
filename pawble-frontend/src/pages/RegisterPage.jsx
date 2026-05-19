import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', surname: '', email: '', password: '', location: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-pink-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold">
            <span className="text-primary">Paw</span>
            <span className="text-secondary">ble</span>
          </h1>
          <p className="text-gray-500 mt-1">Bize katıl</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Ad"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              placeholder="Soyad"
              value={form.surname}
              onChange={(e) => setForm({ ...form, surname: e.target.value })}
              required
            />
          </div>
          <Input
            icon="fa-envelope"
            type="email"
            placeholder="E-posta"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            icon="fa-lock"
            type="password"
            placeholder="Şifre (en az 6 karakter)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={6}
            required
          />
          <Input
            icon="fa-location-dot"
            placeholder="Şehir"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button variant="primary" type="submit" disabled={loading} className="w-full">
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Zaten hesabın var mı?{' '}
          <Link to="/login" className="text-primary font-semibold">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}

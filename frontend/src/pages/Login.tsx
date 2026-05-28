import { useState } from 'react';
import { userApi } from '../lib/api';
import type { User } from '../lib/api';
import { useTheme } from '../App';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { dark, toggle } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await userApi.login(username);
      onLogin(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: 'var(--bg)', transition: 'background 0.2s' }}
    >
      {/* Theme toggle — top right */}
      <button
        onClick={toggle}
        className="absolute top-5 right-5 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span>{dark ? '☀️' : '🌙'}</span>
        <span>{dark ? 'Açık' : 'Koyu'}</span>
      </button>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))',
              boxShadow: '0 8px 24px rgba(99,102,241,.35)',
            }}
          >
            W
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Windoor</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Stok ve Satış Yönetim Sistemi
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
              required
              autoFocus
              className="input-field"
            />
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239,68,68,.1)',
                border: '1px solid rgba(239,68,68,.25)',
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full btn-primary py-2.5 mt-2"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
            Varsayılan kullanıcı: <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>admin</span>
          </p>
        </form>
      </div>
    </div>
  );
}

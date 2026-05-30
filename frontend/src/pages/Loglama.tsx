import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';

interface LogEntry {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  user: string;
  ip: string;
}

const METHOD_COLOR: Record<string, string> = {
  GET: '#3b82f6', POST: '#22c55e', PUT: '#f59e0b',
  DELETE: '#ef4444', PATCH: '#a855f7',
};

const statusColor = (s: number) =>
  s < 300 ? '#22c55e' : s < 400 ? '#f59e0b' : s < 500 ? '#ef4444' : '#7c3aed';

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const STORAGE_KEY = 'loglama_token';

export default function Loglama() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post(`${API}/logs/auth`, { password });
      const t = res.data.token;
      setToken(t);
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      setLoginError('Hatalı şifre');
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await axios.get<LogEntry[]>(`${API}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data);
      setLastUpdate(new Date().toLocaleTimeString('tr-TR'));
      setFetchError('');
    } catch (e: any) {
      if (e.response?.status === 401) {
        // Token geçersiz — çıkış yap
        setToken('');
        localStorage.removeItem(STORAGE_KEY);
      } else {
        setFetchError('Log alınamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) { setLoading(true); fetchLogs(); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, token]);

  const filtered = logs.filter(l =>
    !filter ||
    l.user.toLowerCase().includes(filter.toLowerCase()) ||
    l.path.toLowerCase().includes(filter.toLowerCase()) ||
    l.method.toLowerCase().includes(filter.toLowerCase()) ||
    String(l.status).includes(filter)
  );

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.status >= 400).length,
    users: [...new Set(logs.map(l => l.user).filter(u => u !== 'anonim'))].length,
  };

  // Login ekranı
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '40px', width: '320px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖥️</div>
            <h1 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 700, margin: 0 }}>Sistem Logları</h1>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '6px 0 0' }}>WinDoor · Gizli Sayfa</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>Log Şifresi</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••"
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px 12px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {loginError && (
              <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '8px 12px', color: '#fca5a5', fontSize: '12px', marginBottom: '12px' }}>
                ❌ {loginError}
              </div>
            )}
            <button
              type="submit"
              style={{ width: '100%', background: '#1d4ed8', border: 'none', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace' }}
            >
              Giriş
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Log ekranı
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>🖥️ WinDoor — Sistem Logları</h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
            Son: {lastUpdate || '—'} &nbsp;·&nbsp; {stats.total} kayıt &nbsp;·&nbsp;
            <span style={{ color: '#ef4444' }}>{stats.errors} hata</span> &nbsp;·&nbsp;
            <span style={{ color: '#93c5fd' }}>{stats.users} kullanıcı</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Filtrele..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#e2e8f0', fontSize: '12px', width: '200px', outline: 'none', fontFamily: 'monospace' }}
          />
          <button onClick={() => setAutoRefresh(a => !a)}
            style={{ background: autoRefresh ? '#166534' : '#374151', border: 'none', borderRadius: '6px', padding: '6px 12px', color: autoRefresh ? '#86efac' : '#9ca3af', fontSize: '12px', cursor: 'pointer', fontFamily: 'monospace' }}>
            {autoRefresh ? '⏸ Canlı: Açık' : '▶ Canlı: Kapalı'}
          </button>
          <button onClick={fetchLogs}
            style={{ background: '#1e3a5f', border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#93c5fd', fontSize: '12px', cursor: 'pointer', fontFamily: 'monospace' }}>
            ↻ Yenile
          </button>
          <button onClick={() => { setToken(''); localStorage.removeItem(STORAGE_KEY); }}
            style={{ background: '#374151', border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', fontFamily: 'monospace' }}>
            Çıkış
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#fca5a5', fontSize: '12px' }}>
          ❌ {fetchError}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                  {['#', 'Zaman', 'Kullanıcı', 'IP', 'Method', 'Path', 'Status', 'Süre'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
                    {logs.length === 0 ? 'Henüz log yok — sisteme istek geldikçe buraya düşecek' : 'Filtreyle eşleşen kayıt yok'}
                  </td></tr>
                ) : filtered.map((log, idx) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #1e293b', background: idx % 2 === 0 ? 'transparent' : '#172033' }}>
                    <td style={{ padding: '7px 14px', color: '#475569' }}>{log.id}</td>
                    <td style={{ padding: '7px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtTime(log.timestamp)}</td>
                    <td style={{ padding: '7px 14px' }}>
                      <span style={{ background: log.user === 'anonim' ? '#292524' : '#1e3a5f', color: log.user === 'anonim' ? '#78716c' : '#93c5fd', padding: '2px 8px', borderRadius: '4px' }}>
                        {log.user}
                      </span>
                    </td>
                    <td style={{ padding: '7px 14px', color: '#64748b' }}>{log.ip}</td>
                    <td style={{ padding: '7px 14px' }}>
                      <span style={{ color: METHOD_COLOR[log.method] || '#94a3b8', fontWeight: 700 }}>{log.method}</span>
                    </td>
                    <td style={{ padding: '7px 14px', color: '#cbd5e1', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.path}>
                      {log.path}
                    </td>
                    <td style={{ padding: '7px 14px' }}>
                      <span style={{ color: statusColor(log.status), fontWeight: 700 }}>{log.status}</span>
                    </td>
                    <td style={{ padding: '7px 14px', color: log.duration > 1000 ? '#f59e0b' : '#64748b' }}>
                      {log.duration}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: '11px', color: '#334155', marginTop: '12px' }}>
        Bellekte tutulur · Deploy ile sıfırlanır · DB'ye kayıt yapılmaz
      </p>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface LogEntry {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  user: string;
  ip: string;
  error?: string;
}

const METHOD_COLOR: Record<string, string> = {
  GET:    '#3b82f6',
  POST:   '#22c55e',
  PUT:    '#f59e0b',
  DELETE: '#ef4444',
  PATCH:  '#a855f7',
};

const statusColor = (s: number) => {
  if (s < 300) return '#22c55e';
  if (s < 400) return '#f59e0b';
  if (s < 500) return '#ef4444';
  return '#7c3aed';
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

export default function Loglama() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await api.get<LogEntry[]>('/logs');
      setLogs(res.data);
      setLastUpdate(new Date().toLocaleTimeString('tr-TR'));
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Log alınamadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

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

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              🖥️ WinDoor — Sistem Logları
            </h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Son güncelleme: {lastUpdate || '—'} &nbsp;·&nbsp; {stats.total} kayıt &nbsp;·&nbsp; {stats.errors} hata &nbsp;·&nbsp; {stats.users} aktif kullanıcı
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Filtrele (kullanıcı, path, status...)"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 12px', color: '#e2e8f0', fontSize: '13px', width: '240px', outline: 'none' }}
            />
            <button
              onClick={() => setAutoRefresh(a => !a)}
              style={{
                background: autoRefresh ? '#166534' : '#374151',
                border: 'none', borderRadius: '6px', padding: '6px 14px',
                color: autoRefresh ? '#86efac' : '#9ca3af', fontSize: '13px', cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              {autoRefresh ? '⏸ Otomatik: Açık' : '▶ Otomatik: Kapalı'}
            </button>
            <button
              onClick={fetchLogs}
              style={{ background: '#1e3a5f', border: 'none', borderRadius: '6px', padding: '6px 14px', color: '#93c5fd', fontSize: '13px', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              ↻ Yenile
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#fca5a5', fontSize: '13px' }}>
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</div>
      )}

      {/* Tablo */}
      {!loading && (
        <div style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                  {['#', 'Zaman', 'Kullanıcı', 'IP', 'Method', 'Path', 'Status', 'Süre'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.05em', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>Log kaydı bulunamadı</td></tr>
                ) : filtered.map((log, idx) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #1e293b', background: idx % 2 === 0 ? 'transparent' : '#172033' }}>
                    <td style={{ padding: '8px 14px', color: '#475569' }}>{log.id}</td>
                    <td style={{ padding: '8px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtTime(log.timestamp)}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ background: log.user === 'anonim' ? '#292524' : '#1e3a5f', color: log.user === 'anonim' ? '#78716c' : '#93c5fd', padding: '2px 8px', borderRadius: '4px' }}>
                        {log.user}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px', color: '#64748b', fontFamily: 'monospace' }}>{log.ip}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ color: METHOD_COLOR[log.method] || '#94a3b8', fontWeight: 700 }}>{log.method}</span>
                    </td>
                    <td style={{ padding: '8px 14px', color: '#cbd5e1', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.path}>
                      {log.path}
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ color: statusColor(log.status), fontWeight: 700 }}>{log.status}</span>
                      {log.status >= 400 && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#ef4444' }}>ERR</span>}
                    </td>
                    <td style={{ padding: '8px 14px', color: log.duration > 1000 ? '#f59e0b' : '#64748b' }}>
                      {log.duration}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: '11px', color: '#334155', marginTop: '16px' }}>
        Veriler bellekte tutulur · Yeniden deploy ile sıfırlanır · Veritabanına kayıt yapılmaz
      </p>
    </div>
  );
}

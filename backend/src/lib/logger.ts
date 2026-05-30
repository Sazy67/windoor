export interface LogEntry {
  id: number;
  timestamp: string;
  action: string;     // 'Satış', 'Stok Girişi', 'Giriş' vb.
  user: string;
  detail: string;     // işlem detayı
  status: 'ok' | 'error';
  error?: string;
}

const MAX_LOGS = 200;
const logs: LogEntry[] = [];
let counter = 0;

export function addLog(entry: Omit<LogEntry, 'id'>) {
  logs.unshift({ id: ++counter, ...entry });
  if (logs.length > MAX_LOGS) logs.pop();
}

export function getLogs(): LogEntry[] {
  return logs;
}

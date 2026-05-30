import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
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

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = (req as any).user?.username || 'anonim';

    // /api/logs ve /health isteklerini loglama
    if (req.path === '/api/logs' || req.path === '/health') return;

    addLog({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      user,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '-',
      error: res.statusCode >= 400 ? res.statusMessage : undefined,
    });
  });

  next();
}

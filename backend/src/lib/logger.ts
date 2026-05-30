export interface LogEntry {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  detail: string;
  ip: string;
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

import { Request } from 'express';
export function getIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  return forwarded?.split(',')[0].trim() || req.ip || '-';
}

import { APP_CONFIG, STORAGE_KEYS } from '@/constants';
import type { ErrorLog } from '@/types/domain';
import { readJson, writeJson } from './storage';

export const errorLogRepository = {
  findAll(): ErrorLog[] {
    return readJson<ErrorLog[]>(STORAGE_KEYS.ERROR_LOGS, []).sort((a, b) =>
      b.occurred_at.localeCompare(a.occurred_at),
    );
  },
  append(log: ErrorLog): void {
    const all = readJson<ErrorLog[]>(STORAGE_KEYS.ERROR_LOGS, []);
    const updated = [log, ...all].slice(0, APP_CONFIG.ERROR_LOG_MAX_COUNT);
    writeJson(STORAGE_KEYS.ERROR_LOGS, updated);
  },
  clear(): void {
    writeJson(STORAGE_KEYS.ERROR_LOGS, []);
  },
};

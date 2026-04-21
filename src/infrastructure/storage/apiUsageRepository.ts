import { APP_CONFIG, STORAGE_KEYS } from '@/constants';
import type { ApiUsage } from '@/types/domain';
import { todayKey } from '@/utils/date';
import { readJson, writeJson } from './storage';

function cleanup(usage: ApiUsage): ApiUsage {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - APP_CONFIG.API_USAGE_RETENTION_DAYS);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const cleaned: ApiUsage = {};
  for (const [date, count] of Object.entries(usage)) {
    if (date >= cutoffKey) cleaned[date] = count;
  }
  return cleaned;
}

export const apiUsageRepository = {
  getAll(): ApiUsage {
    return readJson<ApiUsage>(STORAGE_KEYS.API_USAGE, {});
  },
  getTodayCount(): number {
    const usage = this.getAll();
    return usage[todayKey()] ?? 0;
  },
  incrementToday(): number {
    const usage = cleanup(this.getAll());
    const key = todayKey();
    usage[key] = (usage[key] ?? 0) + 1;
    writeJson(STORAGE_KEYS.API_USAGE, usage);
    return usage[key];
  },
  reset(): void {
    writeJson(STORAGE_KEYS.API_USAGE, {});
  },
  replaceAll(usage: ApiUsage): void {
    writeJson(STORAGE_KEYS.API_USAGE, usage);
  },
};

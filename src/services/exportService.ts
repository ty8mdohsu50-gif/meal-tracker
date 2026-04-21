import { STORAGE_KEYS } from '@/constants';
import { apiUsageRepository } from '@/infrastructure/storage/apiUsageRepository';
import { customFoodRepository } from '@/infrastructure/storage/customFoodRepository';
import { errorLogRepository } from '@/infrastructure/storage/errorLogRepository';
import { mealRepository } from '@/infrastructure/storage/mealRepository';
import { settingsRepository } from '@/infrastructure/storage/settingsRepository';
import { weightRepository } from '@/infrastructure/storage/weightRepository';
import type { Settings } from '@/types/domain';

function sanitizeSettings(s: Settings | null): (Omit<Settings, 'api_key_enc'> & { api_key_enc: null }) | null {
  if (!s) return null;
  return { ...s, api_key_enc: null };
}

export type ExportPayload = {
  schema_version: string;
  exported_at: string;
  meals: ReturnType<typeof mealRepository.findAll>;
  meal_items: ReturnType<typeof mealRepository.findItemsAll>;
  custom_foods: ReturnType<typeof customFoodRepository.findAll>;
  weights: ReturnType<typeof weightRepository.findAll>;
  settings: ReturnType<typeof sanitizeSettings>;
  goal_history: ReturnType<typeof settingsRepository.getGoalHistory>;
  api_usage: ReturnType<typeof apiUsageRepository.getAll>;
  error_logs: ReturnType<typeof errorLogRepository.findAll>;
};

export function buildExportPayload(): ExportPayload {
  const settings = settingsRepository.get();
  return {
    schema_version: localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION) ?? '1.0',
    exported_at: new Date().toISOString(),
    meals: mealRepository.findAll(),
    meal_items: mealRepository.findItemsAll(),
    custom_foods: customFoodRepository.findAll(),
    weights: weightRepository.findAll(),
    settings: sanitizeSettings(settings),
    goal_history: settingsRepository.getGoalHistory(),
    api_usage: apiUsageRepository.getAll(),
    error_logs: errorLogRepository.findAll(),
  };
}

export function downloadJson(): void {
  const payload = buildExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meal-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

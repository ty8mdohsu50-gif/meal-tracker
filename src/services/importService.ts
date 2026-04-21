import { ValidationError } from '@/domain/errors';
import { apiUsageRepository } from '@/infrastructure/storage/apiUsageRepository';
import { customFoodRepository } from '@/infrastructure/storage/customFoodRepository';
import { mealRepository } from '@/infrastructure/storage/mealRepository';
import { settingsRepository } from '@/infrastructure/storage/settingsRepository';
import { weightRepository } from '@/infrastructure/storage/weightRepository';
import type { ExportPayload } from './exportService';

export function importFromJson(rawText: string, mode: 'overwrite' | 'merge'): void {
  let payload: ExportPayload;
  try {
    payload = JSON.parse(rawText) as ExportPayload;
  } catch {
    throw new ValidationError('インポート', '不正なJSONファイルです');
  }
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.meals)) {
    throw new ValidationError('インポート', 'データ形式が認識できません');
  }

  if (mode === 'overwrite') {
    mealRepository.replaceAll(payload.meals, payload.meal_items ?? []);
    customFoodRepository.replaceAll(payload.custom_foods ?? []);
    weightRepository.replaceAll(payload.weights ?? []);
    apiUsageRepository.replaceAll(payload.api_usage ?? {});
    if (payload.settings) {
      settingsRepository.replaceAll(payload.settings, payload.goal_history ?? []);
    }
  } else {
    const mergedMeals = mergeById(mealRepository.findAll(), payload.meals, (x) => x.meal_id);
    const mergedItems = mergeById(
      mealRepository.findItemsAll(),
      payload.meal_items ?? [],
      (x) => x.item_id,
    );
    const mergedCustoms = mergeById(
      customFoodRepository.findAll(),
      payload.custom_foods ?? [],
      (x) => x.food_id,
    );
    const mergedWeights = mergeById(
      weightRepository.findAll(),
      payload.weights ?? [],
      (x) => x.weight_id,
    );
    mealRepository.replaceAll(mergedMeals, mergedItems);
    customFoodRepository.replaceAll(mergedCustoms);
    weightRepository.replaceAll(mergedWeights);
  }
}

function mergeById<T>(existing: T[], incoming: T[], idOf: (x: T) => string): T[] {
  const map = new Map<string, T>();
  existing.forEach((x) => map.set(idOf(x), x));
  incoming.forEach((x) => map.set(idOf(x), x));
  return [...map.values()];
}

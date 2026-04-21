import { STORAGE_KEYS } from '@/constants';
import {
  calculateWeeklyTrend,
  suggestKcalDelta,
  type WeightTrend,
} from '@/domain/weightTrendCalculator';
import type { Settings, Weight } from '@/types/domain';

export type WeeklySuggestion = {
  trend: WeightTrend;
  deltaKcal: number;
  suggestedKcal: number;
};

export function evaluateWeeklyAdjustment(
  weights: Weight[],
  settings: Settings,
  todayIso: string = new Date().toISOString(),
): WeeklySuggestion | null {
  const dismissedUntil = localStorage.getItem(STORAGE_KEYS.WEEKLY_SUGGESTION);
  if (dismissedUntil && new Date(dismissedUntil) > new Date(todayIso)) return null;

  const trend = calculateWeeklyTrend(weights, todayIso);
  if (!trend) return null;
  const delta = suggestKcalDelta(trend, settings.target_weight_change_per_week);
  if (delta === 0) return null;
  return {
    trend,
    deltaKcal: delta,
    suggestedKcal: settings.current_target_kcal + delta,
  };
}

export function dismissWeeklySuggestion(): void {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  localStorage.setItem(STORAGE_KEYS.WEEKLY_SUGGESTION, nextWeek.toISOString());
}

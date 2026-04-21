import { APP_CONFIG } from '@/constants';
import type { Weight } from '@/types/domain';

export type WeightTrend = {
  avgLast7Days: number;
  avgPrev7Days: number;
  actualChangePerWeek: number;
  sampleCount: number;
};

export function calculateWeeklyTrend(
  weights: Weight[],
  todayIso: string,
): WeightTrend | null {
  const today = new Date(todayIso);
  const prev7Start = new Date(today);
  prev7Start.setDate(prev7Start.getDate() - 14);
  const prev7End = new Date(today);
  prev7End.setDate(prev7End.getDate() - 7);

  const toDate = (w: Weight) => new Date(w.recorded_date);
  const last7 = weights.filter((w) => {
    const d = toDate(w);
    return d >= prev7End && d <= today;
  });
  const prev7 = weights.filter((w) => {
    const d = toDate(w);
    return d >= prev7Start && d < prev7End;
  });

  if (
    last7.length < APP_CONFIG.WEEKLY_ADJUSTMENT_MIN_SAMPLES ||
    prev7.length < APP_CONFIG.WEEKLY_ADJUSTMENT_MIN_SAMPLES
  ) {
    return null;
  }

  const avg = (arr: Weight[]) => arr.reduce((s, w) => s + w.weight_kg, 0) / arr.length;
  const avgLast7 = avg(last7);
  const avgPrev7 = avg(prev7);

  return {
    avgLast7Days: avgLast7,
    avgPrev7Days: avgPrev7,
    actualChangePerWeek: avgLast7 - avgPrev7,
    sampleCount: last7.length + prev7.length,
  };
}

export function suggestKcalDelta(
  trend: WeightTrend,
  targetChangePerWeek: number,
): number {
  const gap = trend.actualChangePerWeek - targetChangePerWeek;
  if (Math.abs(gap) < APP_CONFIG.WEEKLY_ADJUSTMENT_GAP_THRESHOLD_KG) return 0;
  return gap > 0 ? -APP_CONFIG.WEEKLY_ADJUSTMENT_KCAL_STEP : APP_CONFIG.WEEKLY_ADJUSTMENT_KCAL_STEP;
}

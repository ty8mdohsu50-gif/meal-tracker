import { dateRange } from '@/utils/date';
import type { Meal, MealItem } from '@/types/domain';

export type DailyTotal = {
  date: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
  mealCount: number;
};

export function aggregateDaily(meals: Meal[], date: string): DailyTotal {
  const dayMeals = meals.filter((m) => m.recorded_at.slice(0, 10) === date);
  return {
    date,
    kcal: Math.round(dayMeals.reduce((s, m) => s + m.total_kcal, 0)),
    p: Math.round(dayMeals.reduce((s, m) => s + m.total_p, 0)),
    f: Math.round(dayMeals.reduce((s, m) => s + m.total_f, 0)),
    c: Math.round(dayMeals.reduce((s, m) => s + m.total_c, 0)),
    mealCount: dayMeals.length,
  };
}

export function aggregateRange(
  meals: Meal[],
  startDate: string,
  endDate: string,
): DailyTotal[] {
  return dateRange(startDate, endDate).map((d) => aggregateDaily(meals, d));
}

export function recalculateMealTotals(items: MealItem[]): {
  total_kcal: number;
  total_p: number;
  total_f: number;
  total_c: number;
} {
  return {
    total_kcal: Math.round(items.reduce((s, it) => s + it.calculated_kcal, 0)),
    total_p: Math.round(items.reduce((s, it) => s + it.calculated_p, 0) * 10) / 10,
    total_f: Math.round(items.reduce((s, it) => s + it.calculated_f, 0) * 10) / 10,
    total_c: Math.round(items.reduce((s, it) => s + it.calculated_c, 0) * 10) / 10,
  };
}

export function buildMealItemFromFood(args: {
  meal_id: string;
  item_id: string;
  food_ref_id: string;
  food_type: 'master' | 'custom';
  name: string;
  kcal_per_100g: number;
  p_per_100g: number;
  f_per_100g: number;
  c_per_100g: number;
  grams: number;
}): MealItem {
  const factor = args.grams / 100;
  return {
    item_id: args.item_id,
    meal_id: args.meal_id,
    food_ref_id: args.food_ref_id,
    food_type: args.food_type,
    food_name_snapshot: args.name,
    grams: args.grams,
    kcal_per_100g_snapshot: args.kcal_per_100g,
    p_per_100g_snapshot: args.p_per_100g,
    f_per_100g_snapshot: args.f_per_100g,
    c_per_100g_snapshot: args.c_per_100g,
    calculated_kcal: Math.round(args.kcal_per_100g * factor),
    calculated_p: Math.round(args.p_per_100g * factor * 10) / 10,
    calculated_f: Math.round(args.f_per_100g * factor * 10) / 10,
    calculated_c: Math.round(args.c_per_100g * factor * 10) / 10,
  };
}

export function getMealHistoryFoodIds(meals: Meal[], items: MealItem[], limit = 10): string[] {
  const sortedMeals = [...meals].sort((a, b) =>
    b.recorded_at.localeCompare(a.recorded_at),
  );
  const idCounts = new Map<string, number>();
  for (const m of sortedMeals) {
    const mealItems = items.filter((it) => it.meal_id === m.meal_id);
    for (const it of mealItems) {
      idCounts.set(it.food_ref_id, (idCounts.get(it.food_ref_id) ?? 0) + 1);
    }
  }
  return [...idCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

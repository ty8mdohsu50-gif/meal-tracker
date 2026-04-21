import { STORAGE_KEYS } from '@/constants';
import type { Meal, MealItem } from '@/types/domain';
import { readJson, writeJson } from './storage';

export type MealWithItems = { meal: Meal; items: MealItem[] };

function getAllMeals(): Meal[] {
  return readJson<Meal[]>(STORAGE_KEYS.MEALS, []);
}

function getAllItems(): MealItem[] {
  return readJson<MealItem[]>(STORAGE_KEYS.MEAL_ITEMS, []);
}

export const mealRepository = {
  findAll(): Meal[] {
    return getAllMeals().sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  },
  findItemsAll(): MealItem[] {
    return getAllItems();
  },
  findItemsByMealId(mealId: string): MealItem[] {
    return getAllItems().filter((it) => it.meal_id === mealId);
  },
  findById(mealId: string): Meal | null {
    return getAllMeals().find((m) => m.meal_id === mealId) ?? null;
  },
  saveMealWithItems({ meal, items }: MealWithItems): void {
    const allMeals = getAllMeals();
    const allItems = getAllItems();
    const otherMeals = allMeals.filter((m) => m.meal_id !== meal.meal_id);
    const otherItems = allItems.filter((it) => it.meal_id !== meal.meal_id);
    const backupMeals = localStorage.getItem(STORAGE_KEYS.MEALS);
    try {
      writeJson(STORAGE_KEYS.MEALS, [...otherMeals, meal]);
      writeJson(STORAGE_KEYS.MEAL_ITEMS, [...otherItems, ...items]);
    } catch (e) {
      if (backupMeals !== null) localStorage.setItem(STORAGE_KEYS.MEALS, backupMeals);
      writeJson(STORAGE_KEYS.MEAL_ITEMS, allItems);
      throw e;
    }
  },
  deleteMealWithItems(mealId: string): void {
    const allMeals = getAllMeals();
    const allItems = getAllItems();
    const remainingMeals = allMeals.filter((m) => m.meal_id !== mealId);
    const remainingItems = allItems.filter((it) => it.meal_id !== mealId);
    writeJson(STORAGE_KEYS.MEALS, remainingMeals);
    writeJson(STORAGE_KEYS.MEAL_ITEMS, remainingItems);
  },
  replaceAll(meals: Meal[], items: MealItem[]): void {
    writeJson(STORAGE_KEYS.MEALS, meals);
    writeJson(STORAGE_KEYS.MEAL_ITEMS, items);
  },
};

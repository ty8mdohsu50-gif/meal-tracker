import { STORAGE_KEYS } from '@/constants';
import type { CustomFood } from '@/types/domain';
import { readJson, writeJson } from './storage';

export const customFoodRepository = {
  findAll(): CustomFood[] {
    return readJson<CustomFood[]>(STORAGE_KEYS.CUSTOM_FOODS, []);
  },
  findById(id: string): CustomFood | null {
    return this.findAll().find((f) => f.food_id === id) ?? null;
  },
  save(food: CustomFood): void {
    const all = this.findAll();
    const others = all.filter((f) => f.food_id !== food.food_id);
    writeJson(STORAGE_KEYS.CUSTOM_FOODS, [...others, food]);
  },
  delete(id: string): void {
    const all = this.findAll();
    writeJson(
      STORAGE_KEYS.CUSTOM_FOODS,
      all.filter((f) => f.food_id !== id),
    );
  },
  replaceAll(foods: CustomFood[]): void {
    writeJson(STORAGE_KEYS.CUSTOM_FOODS, foods);
  },
};

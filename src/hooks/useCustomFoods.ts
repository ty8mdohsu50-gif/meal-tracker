import { useCallback } from 'react';
import { notifyCustomFoodsUpdated, useFoods } from '@/contexts/FoodsContext';
import { customFoodRepository } from '@/infrastructure/storage/customFoodRepository';
import type { CustomFood } from '@/types/domain';
import { uuid } from '@/utils/id';

export function useCustomFoods() {
  const { customFoods } = useFoods();

  const create = useCallback(
    (input: Omit<CustomFood, 'food_id' | 'created_at' | 'updated_at'>): CustomFood => {
      const now = new Date().toISOString();
      const food: CustomFood = {
        food_id: uuid(),
        ...input,
        created_at: now,
        updated_at: now,
      };
      customFoodRepository.save(food);
      notifyCustomFoodsUpdated();
      return food;
    },
    [],
  );

  const update = useCallback(
    (id: string, patch: Partial<CustomFood>): CustomFood | null => {
      const existing = customFoodRepository.findById(id);
      if (!existing) return null;
      const updated: CustomFood = { ...existing, ...patch, updated_at: new Date().toISOString() };
      customFoodRepository.save(updated);
      notifyCustomFoodsUpdated();
      return updated;
    },
    [],
  );

  const remove = useCallback((id: string) => {
    customFoodRepository.delete(id);
    notifyCustomFoodsUpdated();
  }, []);

  return { customFoods, create, update, remove };
}

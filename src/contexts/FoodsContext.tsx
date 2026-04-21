import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import foodsJson from '@/data/foods.json';
import { FuzzyMatcher } from '@/domain/fuzzyMatcher';
import { customFoodRepository } from '@/infrastructure/storage/customFoodRepository';
import type { CustomFood, Food } from '@/types/domain';

type FoodsContextValue = {
  foods: Food[];
  customFoods: CustomFood[];
  fuzzyMatcher: FuzzyMatcher;
  reloadCustom: () => void;
  findFood: (id: string, type: 'master' | 'custom') => Food | CustomFood | null;
};

const FoodsContext = createContext<FoodsContextValue | null>(null);

export function FoodsProvider({ children }: { children: ReactNode }) {
  const foods = useMemo(() => foodsJson as Food[], []);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>(() =>
    customFoodRepository.findAll(),
  );

  const reloadCustom = () => setCustomFoods(customFoodRepository.findAll());

  useEffect(() => {
    const handler = () => reloadCustom();
    window.addEventListener('meal-tracker:custom-foods-updated', handler);
    return () => window.removeEventListener('meal-tracker:custom-foods-updated', handler);
  }, []);

  const fuzzyMatcher = useMemo(
    () => new FuzzyMatcher(foods, customFoods),
    [foods, customFoods],
  );

  const masterIndex = useMemo(() => {
    const m = new Map<string, Food>();
    foods.forEach((f) => m.set(f.food_id, f));
    return m;
  }, [foods]);

  const customIndex = useMemo(() => {
    const m = new Map<string, CustomFood>();
    customFoods.forEach((f) => m.set(f.food_id, f));
    return m;
  }, [customFoods]);

  const findFood = (id: string, type: 'master' | 'custom'): Food | CustomFood | null => {
    return (type === 'master' ? masterIndex.get(id) : customIndex.get(id)) ?? null;
  };

  return (
    <FoodsContext.Provider value={{ foods, customFoods, fuzzyMatcher, reloadCustom, findFood }}>
      {children}
    </FoodsContext.Provider>
  );
}

export function useFoods() {
  const ctx = useContext(FoodsContext);
  if (!ctx) throw new Error('useFoods must be used within FoodsProvider');
  return ctx;
}

export function notifyCustomFoodsUpdated() {
  window.dispatchEvent(new Event('meal-tracker:custom-foods-updated'));
}

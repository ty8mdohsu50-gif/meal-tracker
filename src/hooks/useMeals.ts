import { useCallback, useEffect, useState } from 'react';
import { mealRepository } from '@/infrastructure/storage/mealRepository';
import type { Meal, MealItem } from '@/types/domain';

const EVT = 'meal-tracker:meals-updated';

export function notifyMealsUpdated() {
  window.dispatchEvent(new Event(EVT));
}

export function useMeals() {
  const [meals, setMeals] = useState<Meal[]>(() => mealRepository.findAll());
  const [items, setItems] = useState<MealItem[]>(() => mealRepository.findItemsAll());

  const reload = useCallback(() => {
    setMeals(mealRepository.findAll());
    setItems(mealRepository.findItemsAll());
  }, []);

  useEffect(() => {
    window.addEventListener(EVT, reload);
    return () => window.removeEventListener(EVT, reload);
  }, [reload]);

  const saveMeal = useCallback((meal: Meal, itemsOfMeal: MealItem[]) => {
    mealRepository.saveMealWithItems({ meal, items: itemsOfMeal });
    notifyMealsUpdated();
  }, []);

  const deleteMeal = useCallback((mealId: string) => {
    mealRepository.deleteMealWithItems(mealId);
    notifyMealsUpdated();
  }, []);

  return { meals, items, saveMeal, deleteMeal, reload };
}

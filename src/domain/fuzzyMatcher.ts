import Fuse, { type IFuseOptions } from 'fuse.js';
import { APP_CONFIG } from '@/constants';
import type { CustomFood, Food, FoodSearchResult } from '@/types/domain';

function createOptions<T extends { name: string }>(): IFuseOptions<T> {
  return {
    keys: ['name'],
    threshold: APP_CONFIG.FUZZY_THRESHOLD,
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
  };
}

export class FuzzyMatcher {
  private masterFuse: Fuse<Food>;
  private customFuse: Fuse<CustomFood>;

  constructor(foods: Food[], customFoods: CustomFood[]) {
    this.masterFuse = new Fuse(foods, createOptions<Food>());
    this.customFuse = new Fuse(customFoods, createOptions<CustomFood>());
  }

  searchFuzzy(dishName: string, limit: number = APP_CONFIG.FUZZY_MAX_RESULTS): FoodSearchResult[] {
    if (!dishName) return [];
    const customResults: FoodSearchResult[] = this.customFuse.search(dishName).map((r) => ({
      food: r.item,
      foodType: 'custom' as const,
      score: r.score ?? 1,
    }));
    const masterResults: FoodSearchResult[] = this.masterFuse.search(dishName).map((r) => ({
      food: r.item,
      foodType: 'master' as const,
      score: r.score ?? 1,
    }));
    return [...customResults, ...masterResults]
      .filter((r) => r.score < APP_CONFIG.FUZZY_FILTER_SCORE)
      .sort((a, b) => {
        if (a.foodType !== b.foodType) return a.foodType === 'custom' ? -1 : 1;
        return a.score - b.score;
      })
      .slice(0, limit);
  }

  searchPartial(keyword: string, limit: number = 10): FoodSearchResult[] {
    if (keyword.length < 2) return [];
    const masterResults: FoodSearchResult[] = this.masterFuse.search(keyword).map((r) => ({
      food: r.item,
      foodType: 'master' as const,
      score: r.score ?? 1,
    }));
    const customResults: FoodSearchResult[] = this.customFuse.search(keyword).map((r) => ({
      food: r.item,
      foodType: 'custom' as const,
      score: r.score ?? 1,
    }));
    return [...customResults, ...masterResults]
      .sort((a, b) => {
        if (a.foodType !== b.foodType) return a.foodType === 'custom' ? -1 : 1;
        return a.score - b.score;
      })
      .slice(0, limit);
  }
}

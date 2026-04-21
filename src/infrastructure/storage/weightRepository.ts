import { STORAGE_KEYS } from '@/constants';
import type { Weight } from '@/types/domain';
import { readJson, writeJson } from './storage';

export const weightRepository = {
  findAll(): Weight[] {
    return readJson<Weight[]>(STORAGE_KEYS.WEIGHTS, []).sort((a, b) =>
      a.recorded_date.localeCompare(b.recorded_date),
    );
  },
  save(weight: Weight): void {
    const all = readJson<Weight[]>(STORAGE_KEYS.WEIGHTS, []);
    const others = all.filter(
      (w) => w.weight_id !== weight.weight_id && w.recorded_date !== weight.recorded_date,
    );
    writeJson(STORAGE_KEYS.WEIGHTS, [...others, weight]);
  },
  delete(weightId: string): void {
    const all = readJson<Weight[]>(STORAGE_KEYS.WEIGHTS, []);
    writeJson(
      STORAGE_KEYS.WEIGHTS,
      all.filter((w) => w.weight_id !== weightId),
    );
  },
  replaceAll(weights: Weight[]): void {
    writeJson(STORAGE_KEYS.WEIGHTS, weights);
  },
};

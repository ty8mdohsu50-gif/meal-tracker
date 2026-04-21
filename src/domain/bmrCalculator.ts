import { ACTIVITY_LEVELS } from '@/constants';
import type { ActivityLevelKey, Sex } from '@/types/domain';

export type BmrInput = {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
};

export function calculateBmr(input: BmrInput): number {
  const { sex, weightKg, heightCm, age } = input;
  if (sex === 'male') {
    return 66.473 + 13.7516 * weightKg + 5.0033 * heightCm - 6.755 * age;
  }
  return 655.0955 + 9.5634 * weightKg + 1.8496 * heightCm - 4.6756 * age;
}

export function calculateTdee(bmr: number, activity: ActivityLevelKey): number {
  return bmr * ACTIVITY_LEVELS[activity].coef;
}

export function calculateInitialTargetKcal(
  tdee: number,
  targetWeightChangePerWeek: number,
): number {
  const kcalAdjustment = targetWeightChangePerWeek * 1000;
  return Math.round(tdee + kcalAdjustment);
}

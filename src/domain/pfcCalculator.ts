export type PfcGoal = { p: number; f: number; c: number };
export type PfcActual = { p: number; f: number; c: number };

export type PfcGoalInput = {
  targetKcal: number;
  weightKg: number;
  proteinCoef: number;
  fatRatio: number;
};

export function calculatePfcGoal(input: PfcGoalInput): PfcGoal {
  const { targetKcal, weightKg, proteinCoef, fatRatio } = input;
  const p = Math.max(0, Math.round(weightKg * proteinCoef));
  const f = Math.max(0, Math.round((targetKcal * fatRatio) / 9));
  const c = Math.max(0, Math.round((targetKcal - p * 4 - f * 9) / 4));
  return { p, f, c };
}

export function kcalFromPfc(pfc: PfcActual): number {
  return pfc.p * 4 + pfc.f * 9 + pfc.c * 4;
}

export function isPfcKcalConsistent(
  declaredKcal: number,
  pfc: PfcActual,
  tolerancePct = 0.1,
): boolean {
  const calculated = kcalFromPfc(pfc);
  const diff = Math.abs(declaredKcal - calculated);
  const tolerance = Math.max(declaredKcal, 1) * tolerancePct;
  return diff <= tolerance;
}

import { useCallback, useMemo } from 'react';
import { PFC_POLICY_CONFIG } from '@/constants';
import { calculateBmr, calculateInitialTargetKcal, calculateTdee } from '@/domain/bmrCalculator';
import { calculatePfcGoal } from '@/domain/pfcCalculator';
import { settingsRepository } from '@/infrastructure/storage/settingsRepository';
import type { GoalChangeReason, Settings } from '@/types/domain';
import { useSettings } from '@/contexts/SettingsContext';

export function useGoal() {
  const { settings, setSettings, reload } = useSettings();

  const computed = useMemo(() => {
    if (!settings) return null;
    const bmr = calculateBmr({
      sex: settings.sex,
      weightKg: settings.current_weight_kg,
      heightCm: settings.height_cm,
      age: settings.age,
    });
    const tdee = calculateTdee(bmr, settings.activity_level_key);
    return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
  }, [settings]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>, reason: GoalChangeReason = 'manual') => {
      const prev = settingsRepository.get();
      if (!prev) return;
      const nowIso = new Date().toISOString();
      const merged: Settings = { ...prev, ...patch, updated_at: nowIso };

      const goalChanged =
        patch.current_target_kcal !== undefined ||
        patch.current_target_p !== undefined ||
        patch.current_target_f !== undefined ||
        patch.current_target_c !== undefined;

      if (goalChanged) {
        settingsRepository.appendGoalHistory({
          changed_at: nowIso,
          old_kcal: prev.current_target_kcal,
          new_kcal: merged.current_target_kcal,
          old_p: prev.current_target_p,
          new_p: merged.current_target_p,
          old_f: prev.current_target_f,
          new_f: merged.current_target_f,
          old_c: prev.current_target_c,
          new_c: merged.current_target_c,
          reason,
        });
      }
      setSettings(() => merged);
    },
    [setSettings],
  );

  const recalculateTargets = useCallback(
    (base: Settings): Pick<Settings, 'current_target_kcal' | 'current_target_p' | 'current_target_f' | 'current_target_c' | 'protein_coef' | 'fat_ratio'> => {
      const bmr = calculateBmr({
        sex: base.sex,
        weightKg: base.current_weight_kg,
        heightCm: base.height_cm,
        age: base.age,
      });
      const tdee = calculateTdee(bmr, base.activity_level_key);
      const targetKcal = calculateInitialTargetKcal(tdee, base.target_weight_change_per_week);
      const policy = PFC_POLICY_CONFIG[base.pfc_policy];
      const pfc = calculatePfcGoal({
        targetKcal,
        weightKg: base.current_weight_kg,
        proteinCoef: policy.proteinCoef,
        fatRatio: policy.fatRatio,
      });
      return {
        current_target_kcal: targetKcal,
        current_target_p: pfc.p,
        current_target_f: pfc.f,
        current_target_c: pfc.c,
        protein_coef: policy.proteinCoef,
        fat_ratio: policy.fatRatio,
      };
    },
    [],
  );

  return { settings, computed, updateSettings, reload, recalculateTargets };
}

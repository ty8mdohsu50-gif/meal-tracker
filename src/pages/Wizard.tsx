import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select } from '@/components/ui';
import { ACTIVITY_LEVELS, APP_CONFIG, PFC_POLICY_CONFIG } from '@/constants';
import { useSettings } from '@/contexts/SettingsContext';
import { calculateBmr, calculateInitialTargetKcal, calculateTdee } from '@/domain/bmrCalculator';
import { calculatePfcGoal } from '@/domain/pfcCalculator';
import { settingsRepository } from '@/infrastructure/storage/settingsRepository';
import { weightRepository } from '@/infrastructure/storage/weightRepository';
import type { ActivityLevelKey, PfcPolicy, Settings, Sex } from '@/types/domain';
import { encodeApiKey } from '@/utils/base64';
import { todayKey } from '@/utils/date';
import { uuid } from '@/utils/id';

type Step = 1 | 2 | 3 | 4;

export function WizardPage() {
  const navigate = useNavigate();
  const { reload } = useSettings();
  const [step, setStep] = useState<Step>(1);

  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState<string>('30');
  const [heightCm, setHeightCm] = useState<string>('170');
  const [weightKg, setWeightKg] = useState<string>('65');
  const [activity, setActivity] = useState<ActivityLevelKey>('lightlyActive');
  const [policy, setPolicy] = useState<PfcPolicy>('maintain');
  const [targetChange, setTargetChange] = useState<string>('0');
  const [apiKey, setApiKey] = useState<string>('');

  const preview = useMemo(() => {
    const a = Number(age);
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!a || !h || !w) return null;
    const bmr = calculateBmr({ sex, weightKg: w, heightCm: h, age: a });
    const tdee = calculateTdee(bmr, activity);
    const targetKcal = calculateInitialTargetKcal(tdee, Number(targetChange));
    const pfcCfg = PFC_POLICY_CONFIG[policy];
    const pfc = calculatePfcGoal({
      targetKcal,
      weightKg: w,
      proteinCoef: pfcCfg.proteinCoef,
      fatRatio: pfcCfg.fatRatio,
    });
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), targetKcal, pfc };
  }, [sex, age, heightCm, weightKg, activity, policy, targetChange]);

  const canProceed = (): boolean => {
    if (step === 1) {
      const a = Number(age);
      const h = Number(heightCm);
      const w = Number(weightKg);
      return (
        a >= APP_CONFIG.AGE_MIN &&
        a <= APP_CONFIG.AGE_MAX &&
        h >= APP_CONFIG.HEIGHT_MIN &&
        h <= APP_CONFIG.HEIGHT_MAX &&
        w >= APP_CONFIG.WEIGHT_MIN &&
        w <= APP_CONFIG.WEIGHT_MAX
      );
    }
    return true;
  };

  const complete = () => {
    if (!preview) return;
    const now = new Date().toISOString();
    const pfcCfg = PFC_POLICY_CONFIG[policy];
    const settings: Settings = {
      sex,
      age: Number(age),
      height_cm: Number(heightCm),
      current_weight_kg: Number(weightKg),
      activity_level_key: activity,
      pfc_policy: policy,
      protein_coef: pfcCfg.proteinCoef,
      fat_ratio: pfcCfg.fatRatio,
      target_weight_change_per_week: Number(targetChange),
      current_target_kcal: preview.targetKcal,
      current_target_p: preview.pfc.p,
      current_target_f: preview.pfc.f,
      current_target_c: preview.pfc.c,
      api_key_enc: apiKey.trim() ? encodeApiKey(apiKey.trim()) : null,
      theme_mode: 'auto',
      schema_version: APP_CONFIG.SCHEMA_VERSION,
      created_at: now,
      updated_at: now,
    };
    settingsRepository.save(settings);
    settingsRepository.appendGoalHistory({
      changed_at: now,
      old_kcal: 0,
      new_kcal: settings.current_target_kcal,
      old_p: 0,
      new_p: settings.current_target_p,
      old_f: 0,
      new_f: settings.current_target_f,
      old_c: 0,
      new_c: settings.current_target_c,
      reason: 'initial',
    });
    weightRepository.save({
      weight_id: uuid(),
      recorded_date: todayKey(),
      weight_kg: Number(weightKg),
      recorded_at: now,
    });
    reload();
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center gap-6">
      <div>
        <h1 className="text-xl font-bold">初期設定</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          ステップ {step} / 4：
          {step === 1 ? '基本情報' : step === 2 ? '活動レベル' : step === 3 ? '目標' : 'APIキー'}
        </p>
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>

      <Card>
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Select label="性別" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="male">男性</option>
              <option value="female">女性</option>
            </Select>
            <Input
              label="年齢"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              suffix="歳"
              inputMode="numeric"
            />
            <Input
              label="身長"
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              suffix="cm"
              inputMode="decimal"
            />
            <Input
              label="現在の体重"
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              suffix="kg"
              inputMode="decimal"
              step="0.1"
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            {(Object.keys(ACTIVITY_LEVELS) as ActivityLevelKey[]).map((key) => (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  activity === key
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                }`}
              >
                <input
                  type="radio"
                  name="activity"
                  value={key}
                  checked={activity === key}
                  onChange={() => setActivity(key)}
                  className="mt-1 accent-emerald-600"
                />
                <div>
                  <p className="text-sm font-semibold">{ACTIVITY_LEVELS[key].label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {ACTIVITY_LEVELS[key].description}（係数 {ACTIVITY_LEVELS[key].coef}）
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <Select
              label="PFC 方針"
              value={policy}
              onChange={(e) => setPolicy(e.target.value as PfcPolicy)}
            >
              {(Object.keys(PFC_POLICY_CONFIG) as PfcPolicy[]).map((k) => (
                <option key={k} value={k}>
                  {PFC_POLICY_CONFIG[k].label}（P係数 {PFC_POLICY_CONFIG[k].proteinCoef}g/kg）
                </option>
              ))}
            </Select>
            <Input
              label="体重変化目標"
              type="number"
              value={targetChange}
              onChange={(e) => setTargetChange(e.target.value)}
              suffix="kg/週"
              inputMode="decimal"
              step="0.1"
              hint="-0.5 でゆるやかな減量、+0.3 で増量。0 で維持"
            />
            {preview && (
              <div className="rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800">
                <div className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">プレビュー</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>BMR</div><div className="text-right font-mono">{preview.bmr} kcal</div>
                  <div>TDEE</div><div className="text-right font-mono">{preview.tdee} kcal</div>
                  <div>目標 kcal</div><div className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">{preview.targetKcal}</div>
                  <div>P / F / C</div>
                  <div className="text-right font-mono">{preview.pfc.p} / {preview.pfc.f} / {preview.pfc.c} g</div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <Input
              label="Gemini API キー（任意）"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              hint="写真認識に使用。後で設定画面からも登録できます"
            />
            <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              キーは端末内 localStorage にのみ保存されます。送信先は Gemini API のみです。
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => (Math.max(1, s - 1) as Step))}
          disabled={step === 1}
        >
          戻る
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep((s) => ((s + 1) as Step))} disabled={!canProceed()}>
            次へ
          </Button>
        ) : (
          <Button onClick={complete}>完了</Button>
        )}
      </div>
    </div>
  );
}

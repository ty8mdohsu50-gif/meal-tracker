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
type GoalMode = 'maintain' | 'custom';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TARGET_DATE_WEEKS = 12;

function isoDateOffsetFromToday(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function calcKgPerWeek(currentKg: number, targetKg: number, targetDateIso: string): number | null {
  if (!targetDateIso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateIso);
  const weeks = (target.getTime() - today.getTime()) / MS_PER_WEEK;
  if (!Number.isFinite(weeks) || weeks <= 0) return null;
  return (targetKg - currentKg) / weeks;
}

export function WizardPage() {
  const navigate = useNavigate();
  const { reload } = useSettings();
  const [step, setStep] = useState<Step>(1);

  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState<string>('30');
  const [heightCm, setHeightCm] = useState<string>('170');
  const [weightKg, setWeightKg] = useState<string>('65');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [activity, setActivity] = useState<ActivityLevelKey>('lightlyActive');
  const [policy, setPolicy] = useState<PfcPolicy>('maintain');
  const [goalMode, setGoalMode] = useState<GoalMode>('maintain');
  const [targetWeight, setTargetWeight] = useState<string>('');
  const [targetBodyFat, setTargetBodyFat] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>(() =>
    isoDateOffsetFromToday(DEFAULT_TARGET_DATE_WEEKS),
  );
  const [apiKey, setApiKey] = useState<string>('');

  const currentWeight = Number(weightKg);

  const kgPerWeek = useMemo(() => {
    if (goalMode === 'maintain') return 0;
    const tw = Number(targetWeight);
    if (!tw || !currentWeight) return null;
    return calcKgPerWeek(currentWeight, tw, targetDate);
  }, [goalMode, currentWeight, targetWeight, targetDate]);

  const paceWarning = useMemo(() => {
    if (kgPerWeek === null) return null;
    const abs = Math.abs(kgPerWeek);
    if (abs > 1) return '週1kg超のペースはかなり厳しく、体調を崩しやすいです。期間を延ばすのがおすすめです。';
    if (abs > 0.7) return '週0.7kg超はやや急ピッチです。無理のない範囲で調整しましょう。';
    return null;
  }, [kgPerWeek]);

  const preview = useMemo(() => {
    const a = Number(age);
    const h = Number(heightCm);
    const w = currentWeight;
    if (!a || !h || !w) return null;
    const bmr = calculateBmr({ sex, weightKg: w, heightCm: h, age: a });
    const tdee = calculateTdee(bmr, activity);
    const weeklyChange = kgPerWeek ?? 0;
    const targetKcal = calculateInitialTargetKcal(tdee, weeklyChange);
    const pfcCfg = PFC_POLICY_CONFIG[policy];
    const pfc = calculatePfcGoal({
      targetKcal,
      weightKg: w,
      proteinCoef: pfcCfg.proteinCoef,
      fatRatio: pfcCfg.fatRatio,
    });
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), targetKcal, pfc, weeklyChange };
  }, [sex, age, heightCm, currentWeight, activity, policy, kgPerWeek]);

  const canProceed = (): boolean => {
    if (step === 1) {
      const a = Number(age);
      const h = Number(heightCm);
      const w = currentWeight;
      return (
        a >= APP_CONFIG.AGE_MIN &&
        a <= APP_CONFIG.AGE_MAX &&
        h >= APP_CONFIG.HEIGHT_MIN &&
        h <= APP_CONFIG.HEIGHT_MAX &&
        w >= APP_CONFIG.WEIGHT_MIN &&
        w <= APP_CONFIG.WEIGHT_MAX
      );
    }
    if (step === 3 && goalMode === 'custom') {
      const tw = Number(targetWeight);
      if (!tw || tw < APP_CONFIG.WEIGHT_MIN || tw > APP_CONFIG.WEIGHT_MAX) return false;
      if (kgPerWeek === null) return false;
    }
    return true;
  };

  const complete = () => {
    if (!preview) return;
    const now = new Date().toISOString();
    const pfcCfg = PFC_POLICY_CONFIG[policy];
    const weeklyChange = preview.weeklyChange;
    const settings: Settings = {
      sex,
      age: Number(age),
      height_cm: Number(heightCm),
      current_weight_kg: currentWeight,
      activity_level_key: activity,
      pfc_policy: policy,
      protein_coef: pfcCfg.proteinCoef,
      fat_ratio: pfcCfg.fatRatio,
      target_weight_change_per_week: weeklyChange,
      target_weight_kg: goalMode === 'custom' ? Number(targetWeight) : null,
      target_date: goalMode === 'custom' ? targetDate : null,
      current_body_fat_pct: bodyFat.trim() ? Number(bodyFat) : null,
      target_body_fat_pct:
        goalMode === 'custom' && targetBodyFat.trim() ? Number(targetBodyFat) : null,
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
      weight_kg: currentWeight,
      body_fat_pct: bodyFat.trim() ? Number(bodyFat) : null,
      recorded_at: now,
    });
    reload();
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center gap-6 px-4">
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
            <Input
              label="現在の体脂肪率（任意）"
              type="number"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              suffix="%"
              inputMode="decimal"
              step="0.1"
              hint="体組成計の値があれば入力。あとで追加・修正もできます"
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
              あなたの普段の生活に一番近いものを選んでください。
            </p>
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
                    {ACTIVITY_LEVELS[key].description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-sm font-semibold">食事の方針</p>
              <div className="flex flex-col gap-2">
                {(Object.keys(PFC_POLICY_CONFIG) as PfcPolicy[]).map((k) => (
                  <label
                    key={k}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      policy === k
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="policy"
                      value={k}
                      checked={policy === k}
                      onChange={() => setPolicy(k)}
                      className="mt-1 accent-emerald-600"
                    />
                    <div>
                      <p className="text-sm font-semibold">{PFC_POLICY_CONFIG[k].label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {PFC_POLICY_CONFIG[k].description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">体重の目標</p>
              <div className="flex flex-col gap-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    goalMode === 'maintain'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="goal_mode"
                    checked={goalMode === 'maintain'}
                    onChange={() => setGoalMode('maintain')}
                    className="mt-1 accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-semibold">現状の体重を維持する</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      今の体重をキープすることを目標にします
                    </p>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    goalMode === 'custom'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="goal_mode"
                    checked={goalMode === 'custom'}
                    onChange={() => setGoalMode('custom')}
                    className="mt-1 accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-semibold">目標体重と達成日を決める</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      「いつまでに何 kg になりたいか」を入力します
                    </p>
                  </div>
                </label>
              </div>

              {goalMode === 'custom' && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="目標体重"
                      type="number"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      suffix="kg"
                      inputMode="decimal"
                      step="0.1"
                      placeholder={String(Math.max(0, currentWeight - 3))}
                    />
                    <Input
                      label="達成したい日"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                  </div>
                  <Input
                    label="目標体脂肪率（任意）"
                    type="number"
                    value={targetBodyFat}
                    onChange={(e) => setTargetBodyFat(e.target.value)}
                    suffix="%"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="15"
                    hint="体重と合わせて目標にできます。kcal計算には影響しません"
                  />
                </div>
              )}
            </div>

            {preview && (
              <div className="rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800">
                <div className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  計算結果（1日あたり）
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-zinc-600 dark:text-zinc-300">基礎代謝 (BMR)</div>
                  <div className="text-right font-mono">{preview.bmr} kcal</div>
                  <div className="text-zinc-600 dark:text-zinc-300">消費カロリー (TDEE)</div>
                  <div className="text-right font-mono">{preview.tdee} kcal</div>
                  <div className="font-semibold">1日の摂取目標</div>
                  <div className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {preview.targetKcal.toLocaleString()} kcal
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-300">
                    タンパク質 / 脂質 / 炭水化物
                  </div>
                  <div className="text-right font-mono">
                    {preview.pfc.p} / {preview.pfc.f} / {preview.pfc.c} g
                  </div>
                </div>
                {goalMode === 'custom' && kgPerWeek !== null && (
                  <div className="mt-3 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-700">
                    ペース：
                    <span className="font-mono font-semibold">
                      {kgPerWeek > 0 ? '+' : ''}
                      {kgPerWeek.toFixed(2)} kg/週
                    </span>
                  </div>
                )}
                {paceWarning && (
                  <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    {paceWarning}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
              <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Gemini API キーの取り方（任意・無料枠あり）
              </p>
              <ol className="ml-4 list-decimal space-y-1 leading-relaxed">
                <li>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Google AI Studio（aistudio.google.com/apikey）
                  </a>
                  を開いて Google アカウントでログイン
                </li>
                <li>「Create API key」ボタンをクリック</li>
                <li>表示された「AIza…」で始まるキーをコピー</li>
                <li>下の欄に貼り付けて「完了」</li>
              </ol>
              <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                ※ 写真から料理を自動推定する機能でのみ使います。未登録でも「検索で記録」は使えます。
              </p>
            </div>
            <Input
              label="Gemini API キー"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              hint="後で設定画面からも登録・変更できます"
            />
            <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              キーは端末内 localStorage と Firestore のあなた専用領域にのみ保存されます。送信先は Gemini API のみです。
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

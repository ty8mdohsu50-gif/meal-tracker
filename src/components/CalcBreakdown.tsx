import { useState } from 'react';
import { ACTIVITY_LEVELS, PFC_POLICY_CONFIG } from '@/constants';
import type { Settings } from '@/types/domain';
import { Card } from './ui';

export function CalcBreakdown({ settings }: { settings: Settings }) {
  const [open, setOpen] = useState(false);

  const {
    sex,
    age,
    height_cm: h,
    current_weight_kg: w,
    activity_level_key: activity,
    target_weight_change_per_week: wpw,
    pfc_policy: policy,
    current_target_kcal: targetKcal,
    current_target_p: p,
    current_target_f: f,
    current_target_c: c,
  } = settings;

  const bmr =
    sex === 'male'
      ? 66.473 + 13.7516 * w + 5.0033 * h - 6.755 * age
      : 655.0955 + 9.5634 * w + 1.8496 * h - 4.6756 * age;
  const actCoef = ACTIVITY_LEVELS[activity].coef;
  const actLabel = ACTIVITY_LEVELS[activity].label;
  const tdee = bmr * actCoef;
  const kcalAdj = wpw * 1000;
  const pfcCfg = PFC_POLICY_CONFIG[policy];
  const pKcal = p * 4;
  const fKcal = f * 9;
  const cKcal = c * 4;

  return (
    <Card
      title="目標kcalの計算式"
      action={
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {open ? '閉じる' : '詳細を見る'}
        </button>
      }
    >
      {!open ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          BMR → TDEE → 目標ペース補正 → PFC分配 の順にあなたの数値で展開します。
        </p>
      ) : (
        <div className="flex flex-col gap-4 text-sm">
          <Step
            n={1}
            title="基礎代謝 (BMR)"
            subtitle="Harris-Benedict 改訂版（性別で式が違います）"
          >
            <Formula>
              {sex === 'male' ? '男性' : '女性'}：{' '}
              {sex === 'male'
                ? '66.5 + 13.75×体重 + 5.00×身長 − 6.76×年齢'
                : '655.1 + 9.56×体重 + 1.85×身長 − 4.68×年齢'}
            </Formula>
            <Formula>
              = {sex === 'male' ? '66.5' : '655.1'}
              {' + '}
              {(sex === 'male' ? 13.75 : 9.56).toFixed(2)}×{w}
              {' + '}
              {(sex === 'male' ? 5.0 : 1.85).toFixed(2)}×{h}
              {' − '}
              {(sex === 'male' ? 6.76 : 4.68).toFixed(2)}×{age}
            </Formula>
            <Result>
              = <span className="font-bold">{Math.round(bmr).toLocaleString()} kcal</span>
            </Result>
          </Step>

          <Step
            n={2}
            title="総消費カロリー (TDEE)"
            subtitle="BMR × 活動係数"
          >
            <Formula>
              活動レベル「{actLabel}」→ 係数 ×{actCoef}
            </Formula>
            <Formula>
              = {Math.round(bmr).toLocaleString()} × {actCoef}
            </Formula>
            <Result>
              = <span className="font-bold">{Math.round(tdee).toLocaleString()} kcal</span>
              <span className="ml-2 text-xs text-zinc-500">（1日に消費する総カロリー）</span>
            </Result>
          </Step>

          <Step
            n={3}
            title="目標ペースで調整"
            subtitle={
              wpw === 0
                ? '現状維持：そのまま'
                : wpw > 0
                ? '増量ペース：kcalを足す'
                : '減量ペース：kcalを引く'
            }
          >
            <Formula>体脂肪 1kg ≒ 7,200 kcal / 週7日 ＝ 1日 約 1,000 kcal/(kg/週)</Formula>
            <Formula>
              週 {wpw > 0 ? '+' : ''}
              {wpw.toFixed(2)} kg → 1日 {wpw > 0 ? '+' : wpw < 0 ? '' : ''}
              {Math.round(kcalAdj)} kcal
            </Formula>
            <Formula>
              = {Math.round(tdee).toLocaleString()}
              {wpw >= 0 ? ' + ' : ' − '}
              {Math.abs(Math.round(kcalAdj)).toLocaleString()}
            </Formula>
            <Result>
              = <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {targetKcal.toLocaleString()} kcal
              </span>
              <span className="ml-2 text-xs text-zinc-500">（1日の摂取目標）</span>
            </Result>
          </Step>

          <Step
            n={4}
            title="PFC に分配"
            subtitle={`方針：${pfcCfg.label}`}
          >
            <Formula>
              タンパク質：体重 × {pfcCfg.proteinCoef}g = {w} × {pfcCfg.proteinCoef} = <b>{p}g</b>（×4 = {pKcal} kcal）
            </Formula>
            <Formula>
              脂質：総kcal × {Math.round(settings.fat_ratio * 100)}% = {Math.round(targetKcal * settings.fat_ratio)} kcal ÷ 9 = <b>{f}g</b>
            </Formula>
            <Formula>
              炭水化物：残り = {targetKcal.toLocaleString()} − {pKcal} − {fKcal} = {cKcal} kcal ÷ 4 = <b>{c}g</b>
            </Formula>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <MacroPill label="P" color="sky" gram={p} kcal={pKcal} />
              <MacroPill label="F" color="amber" gram={f} kcal={fKcal} />
              <MacroPill label="C" color="violet" gram={c} kcal={cKcal} />
            </div>
          </Step>

          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            ※ BMR 計算式は Harris-Benedict（1984 年改訂）。体脂肪率や個人差は考慮されないため、実測のペースとズレた場合はこのアプリが自動で微調整を提案します。
          </p>
        </div>
      )}
    </Card>
  );
}

function Step({
  n,
  title,
  subtitle,
  children,
}: {
  n: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white">
          {n}
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 pl-8 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return <div className="font-mono">{children}</div>;
}

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 rounded bg-zinc-50 px-2 py-1 font-mono dark:bg-zinc-800">
      {children}
    </div>
  );
}

function MacroPill({
  label,
  color,
  gram,
  kcal,
}: {
  label: string;
  color: 'sky' | 'amber' | 'violet';
  gram: number;
  kcal: number;
}) {
  const styles: Record<typeof color, string> = {
    sky: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
    violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
  };
  return (
    <div className={`rounded-md py-1.5 text-xs ${styles[color]}`}>
      <div className="font-bold">
        {label} {gram}g
      </div>
      <div className="text-[10px] opacity-80">{kcal} kcal</div>
    </div>
  );
}

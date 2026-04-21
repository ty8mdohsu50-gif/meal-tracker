import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, Modal, Progress } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { MEAL_TYPE_LABELS } from '@/constants';
import { useSettings } from '@/contexts/SettingsContext';
import { aggregateDaily } from '@/domain/mealAggregator';
import { useApiUsage } from '@/hooks/useApiUsage';
import { useGoal } from '@/hooks/useGoal';
import { useMeals } from '@/hooks/useMeals';
import { useWeights } from '@/hooks/useWeights';
import {
  dismissWeeklySuggestion,
  evaluateWeeklyAdjustment,
} from '@/services/weeklyAdjustmentService';
import type { Meal } from '@/types/domain';
import { formatJapaneseDate, formatTime, todayKey } from '@/utils/date';

export function DashboardPage() {
  const { settings } = useSettings();
  const { meals, items, deleteMeal } = useMeals();
  const { weights } = useWeights();
  const { todayCount, limit, isWarning, isBlocked, percent } = useApiUsage();
  const { updateSettings } = useGoal();
  const { show } = useToast();
  const [menuMealId, setMenuMealId] = useState<string | null>(null);

  const today = todayKey();
  const todayTotals = useMemo(() => aggregateDaily(meals, today), [meals, today]);
  const todayMeals = useMemo(
    () =>
      meals
        .filter((m) => m.recorded_at.slice(0, 10) === today)
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)),
    [meals, today],
  );

  const suggestion = useMemo(() => {
    if (!settings) return null;
    return evaluateWeeklyAdjustment(weights, settings);
  }, [weights, settings]);

  if (!settings) return null;

  const remainingKcal = settings.current_target_kcal - todayTotals.kcal;

  const handleDelete = (mealId: string) => {
    if (!confirm('この食事記録を削除しますか？')) return;
    deleteMeal(mealId);
    show('削除しました', 'success');
    setMenuMealId(null);
  };

  const acceptSuggestion = () => {
    if (!suggestion) return;
    updateSettings(
      { current_target_kcal: suggestion.suggestedKcal },
      'weekly-suggestion',
    );
    show(`目標カロリーを ${suggestion.suggestedKcal} kcal に更新しました`, 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{formatJapaneseDate(new Date())}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">今日の食事記録</p>
        </div>
        <Link to="/record">
          <Button size="sm">+ 記録</Button>
        </Link>
      </div>

      {isBlocked && (
        <Alert variant="error" action={<Link to="/settings"><Button size="sm" variant="ghost">設定へ</Button></Link>}>
          本日の API 使用量が上限（{limit}回）に達しました。手動検索で記録してください。
        </Alert>
      )}
      {!isBlocked && isWarning && (
        <Alert variant="warning">
          本日の API 使用量が {Math.round(percent)}% に達しました（{todayCount} / {limit}）。
        </Alert>
      )}

      <Card>
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">今日の摂取</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums">{todayTotals.kcal.toLocaleString()}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            / {settings.current_target_kcal.toLocaleString()} kcal
          </span>
        </div>
        <div className="mt-3">
          <Progress value={todayTotals.kcal} max={settings.current_target_kcal} color="emerald" />
        </div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {remainingKcal >= 0 ? (
            <>残り <span className="font-semibold text-emerald-600 dark:text-emerald-400">{remainingKcal.toLocaleString()} kcal</span></>
          ) : (
            <>目標を <span className="font-semibold text-rose-600 dark:text-rose-400">{Math.abs(remainingKcal).toLocaleString()} kcal</span> 超過</>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <MacroBlock
          label="タンパク質"
          value={todayTotals.p}
          target={settings.current_target_p}
          color="sky"
        />
        <MacroBlock
          label="脂質"
          value={todayTotals.f}
          target={settings.current_target_f}
          color="amber"
        />
        <MacroBlock
          label="炭水化物"
          value={todayTotals.c}
          target={settings.current_target_c}
          color="violet"
        />
      </div>

      {suggestion && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
              💡
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">週次調整提案</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                直近の体重変化（{suggestion.trend.actualChangePerWeek > 0 ? '+' : ''}
                {suggestion.trend.actualChangePerWeek.toFixed(2)} kg/週）に基づき、目標を
                {suggestion.deltaKcal > 0 ? '+' : ''}
                {suggestion.deltaKcal} kcal（{suggestion.suggestedKcal} kcal）に調整することを提案します。
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={acceptSuggestion}>承認</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dismissWeeklySuggestion();
                    show('提案を却下しました', 'info');
                  }}
                >
                  却下
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card
        title={`今日の食事 (${todayMeals.length}件)`}
        action={
          <Link to="/record" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">
            + 記録
          </Link>
        }
      >
        {todayMeals.length === 0 ? (
          <EmptyState
            title="まだ今日の記録はありません"
            description="[+ 記録] から写真または検索で登録してください"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {todayMeals.map((meal) => {
              const mealItems = items.filter((it) => it.meal_id === meal.meal_id);
              const names = mealItems.map((it) => it.food_name_snapshot).join(' / ');
              return (
                <li key={meal.meal_id} className="relative py-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      {formatTime(meal.recorded_at)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {MEAL_TYPE_LABELS[meal.meal_type]}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {meal.total_kcal} kcal
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
                        {names || '(料理なし)'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        P: {meal.total_p.toFixed(1)}g F: {meal.total_f.toFixed(1)}g C: {meal.total_c.toFixed(1)}g
                      </p>
                    </div>
                    <button
                      onClick={() => setMenuMealId(meal.meal_id)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={!!menuMealId}
        onClose={() => setMenuMealId(null)}
        title="操作"
        footer={
          <Button variant="ghost" onClick={() => setMenuMealId(null)}>
            キャンセル
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <MealDetail meal={menuMealId ? meals.find((m) => m.meal_id === menuMealId) ?? null : null} items={items} />
          <Button variant="danger" onClick={() => menuMealId && handleDelete(menuMealId)}>
            この記録を削除
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MacroBlock({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: 'sky' | 'amber' | 'violet';
}) {
  const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
  return (
    <Card className="p-3">
      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-1 text-xs">
        <span className="text-lg font-semibold tabular-nums">{Math.round(value)}</span>
        <span className="text-zinc-400">/ {target}g</span>
      </div>
      <div className="mt-2">
        <Progress value={value} max={target} color={color} />
      </div>
      <div className="mt-1 text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">{pct}%</div>
    </Card>
  );
}

function MealDetail({
  meal,
  items,
}: {
  meal: Meal | null;
  items: ReturnType<typeof useMeals>['items'];
}) {
  if (!meal) return null;
  const mealItems = items.filter((it) => it.meal_id === meal.meal_id);
  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
      <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
        {MEAL_TYPE_LABELS[meal.meal_type]} ・ {formatTime(meal.recorded_at)}
      </div>
      <ul className="flex flex-col gap-1">
        {mealItems.map((it) => (
          <li key={it.item_id} className="flex justify-between gap-2">
            <span className="truncate">{it.food_name_snapshot}</span>
            <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
              {it.grams}g / {it.calculated_kcal}kcal
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

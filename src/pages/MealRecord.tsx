import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, Input, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { MEAL_TYPE_LABELS } from '@/constants';
import { useFoods } from '@/contexts/FoodsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { errorMessageFor } from '@/domain/errors';
import { buildMealItemFromFood, recalculateMealTotals, getMealHistoryFoodIds } from '@/domain/mealAggregator';
import { errorLogRepository } from '@/infrastructure/storage/errorLogRepository';
import { useApiUsage } from '@/hooks/useApiUsage';
import { useCustomFoods } from '@/hooks/useCustomFoods';
import { useMeals } from '@/hooks/useMeals';
import { estimateDishesFromFile } from '@/services/geminiService';
import type {
  CustomFood,
  DishResult,
  Food,
  FoodSearchResult,
  MealItem,
  MealType,
} from '@/types/domain';
import { uuid } from '@/utils/id';
import { CustomFoodFormModal } from './FoodMaster';

type Mode = 'photo' | 'search';

type Draft = {
  food_ref_id: string;
  food_type: 'master' | 'custom';
  name: string;
  kcal_per_100g: number;
  p_per_100g: number;
  f_per_100g: number;
  c_per_100g: number;
  grams: number;
};

export function MealRecordPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { settings } = useSettings();
  const { foods, customFoods, fuzzyMatcher, findFood } = useFoods();
  const { saveMeal, meals, items } = useMeals();
  const { create: createCustomFood } = useCustomFoods();
  const { isBlocked } = useApiUsage();

  const [mode, setMode] = useState<Mode>('photo');
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [geminiConfidence, setGeminiConfidence] = useState<number | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const historyFoodIds = useMemo(
    () => getMealHistoryFoodIds(meals, items, 6),
    [meals, items],
  );
  const historyFoods = useMemo(() => {
    const result: FoodSearchResult[] = [];
    for (const id of historyFoodIds) {
      const custom = customFoods.find((f) => f.food_id === id);
      if (custom) {
        result.push({ food: custom, foodType: 'custom', score: 0 });
        continue;
      }
      const master = foods.find((f) => f.food_id === id);
      if (master) result.push({ food: master, foodType: 'master', score: 0 });
    }
    return result;
  }, [historyFoodIds, foods, customFoods]);

  const searchResults = useMemo(() => {
    if (!searchKeyword) return [];
    return fuzzyMatcher.searchPartial(searchKeyword, 20);
  }, [fuzzyMatcher, searchKeyword]);

  if (!settings) return null;

  const addDraftFromFood = (food: Food | CustomFood, foodType: 'master' | 'custom', grams = 100) => {
    setDrafts((prev) => [
      ...prev,
      {
        food_ref_id: food.food_id,
        food_type: foodType,
        name: food.name,
        kcal_per_100g: food.kcal_per_100g,
        p_per_100g: food.p_per_100g,
        f_per_100g: food.f_per_100g,
        c_per_100g: food.c_per_100g,
        grams,
      },
    ]);
    setSearchKeyword('');
  };

  const handlePhotoSelect = async (file: File) => {
    if (!settings.api_key_enc) {
      show('設定画面でGemini APIキーを登録してください', 'error');
      navigate('/settings');
      return;
    }
    setLoading(true);
    try {
      const dishes = await estimateDishesFromFile(file, settings.api_key_enc);
      const newDrafts = dishes.map((dish) => dishToDraft(dish, fuzzyMatcher));
      setDrafts((prev) => [...prev, ...newDrafts]);
      const avgConf =
        dishes.reduce((s, d) => s + d.confidence, 0) / Math.max(dishes.length, 1);
      setGeminiConfidence(avgConf);
      show(`${dishes.length} 件の料理を認識しました`, 'success');
    } catch (e) {
      const msg = errorMessageFor(e);
      show(msg, 'error');
      errorLogRepository.append({
        log_id: uuid(),
        occurred_at: new Date().toISOString(),
        category: 'gemini',
        message: msg,
      });
      setMode('search');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (drafts.length === 0) return;
    const mealId = uuid();
    const now = new Date().toISOString();
    const mealItems: MealItem[] = drafts.map((d) =>
      buildMealItemFromFood({
        meal_id: mealId,
        item_id: uuid(),
        food_ref_id: d.food_ref_id,
        food_type: d.food_type,
        name: d.name,
        kcal_per_100g: d.kcal_per_100g,
        p_per_100g: d.p_per_100g,
        f_per_100g: d.f_per_100g,
        c_per_100g: d.c_per_100g,
        grams: d.grams,
      }),
    );
    const totals = recalculateMealTotals(mealItems);
    saveMeal(
      {
        meal_id: mealId,
        recorded_at: now,
        meal_type: mealType,
        input_method: mode === 'photo' ? 'photo' : 'search',
        gemini_confidence: geminiConfidence,
        ...totals,
      },
      mealItems,
    );
    show('食事を記録しました', 'success');
    navigate('/');
  };

  const totalKcal = drafts.reduce(
    (s, d) => s + (d.kcal_per_100g * d.grams) / 100,
    0,
  );
  const totals = {
    p: drafts.reduce((s, d) => s + (d.p_per_100g * d.grams) / 100, 0),
    f: drafts.reduce((s, d) => s + (d.f_per_100g * d.grams) / 100, 0),
    c: drafts.reduce((s, d) => s + (d.c_per_100g * d.grams) / 100, 0),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">食事を記録</h1>
      </div>

      <Select
        label="食事タイプ"
        value={mealType}
        onChange={(e) => setMealType(e.target.value as MealType)}
      >
        {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((k) => (
          <option key={k} value={k}>
            {MEAL_TYPE_LABELS[k]}
          </option>
        ))}
      </Select>

      <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <button
          onClick={() => setMode('photo')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === 'photo'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
              : 'text-zinc-500'
          }`}
        >
          📷 写真で記録
        </button>
        <button
          onClick={() => setMode('search')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === 'search'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
              : 'text-zinc-500'
          }`}
        >
          🔍 検索で記録
        </button>
      </div>

      {mode === 'photo' && (
        <Card>
          {isBlocked ? (
            <Alert variant="error">
              本日のAPI使用量が上限に達しています。検索モードで記録してください。
            </Alert>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelect(file);
                }}
              />
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading ? '認識中…' : '📷 写真を撮影 / 選択'}
              </Button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                JPEG / PNG、5MB以内
              </p>
            </div>
          )}
        </Card>
      )}

      {mode === 'search' && (
        <Card>
          <Input
            placeholder="食品名で検索..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {!searchKeyword && historyFoods.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                よく食べる
              </div>
              <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {historyFoods.map((r) => (
                  <FoodRow
                    key={`${r.foodType}-${r.food.food_id}`}
                    result={r}
                    onSelect={() => addDraftFromFood(r.food, r.foodType)}
                  />
                ))}
              </ul>
            </div>
          )}
          {searchKeyword && (
            <div className="mt-4">
              {searchResults.length === 0 ? (
                <EmptyState
                  title="該当食品なし"
                  description="カスタム食品として登録してください"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setShowCustomModal(true)}>
                      + カスタム食品を追加
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {searchResults.map((r) => (
                    <FoodRow
                      key={`${r.foodType}-${r.food.food_id}`}
                      result={r}
                      onSelect={() => addDraftFromFood(r.food, r.foodType)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      {drafts.length > 0 && (
        <Card title="記録内容">
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {drafts.map((d, i) => (
              <li key={i} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {d.kcal_per_100g} kcal / 100g
                  </div>
                  {mode === 'photo' && (
                    <MatchCandidateSelector
                      draft={d}
                      onChangeMatch={(food, foodType) => {
                        setDrafts((prev) =>
                          prev.map((x, idx) =>
                            idx === i
                              ? {
                                  ...x,
                                  food_ref_id: food.food_id,
                                  food_type: foodType,
                                  name: food.name,
                                  kcal_per_100g: food.kcal_per_100g,
                                  p_per_100g: food.p_per_100g,
                                  f_per_100g: food.f_per_100g,
                                  c_per_100g: food.c_per_100g,
                                }
                              : x,
                          ),
                        );
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={d.grams}
                    onChange={(e) => {
                      const grams = Number(e.target.value);
                      setDrafts((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, grams } : x)),
                      );
                    }}
                    className="h-9 w-24 rounded-lg border border-zinc-200 bg-white px-2 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="text-xs text-zinc-500">g</span>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">
                    {Math.round((d.kcal_per_100g * d.grams) / 100)} kcal
                  </span>
                  <button
                    onClick={() =>
                      setDrafts((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-500 dark:hover:bg-zinc-800"
                    aria-label="削除"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
            <div className="flex justify-between font-semibold">
              <span>合計</span>
              <span className="tabular-nums">{Math.round(totalKcal)} kcal</span>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>P: {totals.p.toFixed(1)}g</span>
              <span>F: {totals.f.toFixed(1)}g</span>
              <span>C: {totals.c.toFixed(1)}g</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDrafts([])}>
              クリア
            </Button>
            <Button onClick={handleSave}>記録</Button>
          </div>
        </Card>
      )}

      <CustomFoodFormModal
        open={showCustomModal}
        initialName={searchKeyword}
        onClose={() => setShowCustomModal(false)}
        onSubmit={(input) => {
          const created = createCustomFood(input);
          addDraftFromFood(created, 'custom');
          show(`「${created.name}」を登録しました`, 'success');
          setShowCustomModal(false);
        }}
      />
    </div>
  );

  function MatchCandidateSelector({
    draft,
    onChangeMatch,
  }: {
    draft: Draft;
    onChangeMatch: (food: Food | CustomFood, foodType: 'master' | 'custom') => void;
  }) {
    const candidates = fuzzyMatcher.searchFuzzy(draft.name, 5);
    const current = findFood(draft.food_ref_id, draft.food_type);
    const options = current
      ? [{ food: current, foodType: draft.food_type, score: 0 }, ...candidates.filter((c) => c.food.food_id !== draft.food_ref_id)]
      : candidates;
    if (options.length === 0) return null;
    return (
      <select
        value={`${draft.food_type}:${draft.food_ref_id}`}
        onChange={(e) => {
          const [type, id] = e.target.value.split(':') as ['master' | 'custom', string];
          const food = options.find((o) => o.foodType === type && o.food.food_id === id)?.food;
          if (food) onChangeMatch(food, type);
        }}
        className="mt-1 h-7 rounded border border-zinc-200 bg-transparent px-1 text-xs dark:border-zinc-700"
      >
        {options.map((o) => (
          <option key={`${o.foodType}-${o.food.food_id}`} value={`${o.foodType}:${o.food.food_id}`}>
            {o.foodType === 'custom' ? '[カスタム] ' : ''}
            {o.food.name}
          </option>
        ))}
      </select>
    );
  }
}

function FoodRow({
  result,
  onSelect,
}: {
  result: FoodSearchResult;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className="flex w-full items-center justify-between gap-2 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {result.foodType === 'custom' && (
              <span className="inline-block rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                カスタム
              </span>
            )}
            <span className="truncate text-sm font-medium">{result.food.name}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {result.food.kcal_per_100g} kcal / 100g · P: {result.food.p_per_100g}g F:{' '}
            {result.food.f_per_100g}g C: {result.food.c_per_100g}g
          </p>
        </div>
        <span className="text-emerald-600 dark:text-emerald-400">+</span>
      </button>
    </li>
  );
}

function dishToDraft(dish: DishResult, fuzzy: ReturnType<typeof useFoods>['fuzzyMatcher']): Draft {
  const matches = fuzzy.searchFuzzy(dish.name, 1);
  if (matches.length > 0) {
    const m = matches[0];
    return {
      food_ref_id: m.food.food_id,
      food_type: m.foodType,
      name: m.food.name,
      kcal_per_100g: m.food.kcal_per_100g,
      p_per_100g: m.food.p_per_100g,
      f_per_100g: m.food.f_per_100g,
      c_per_100g: m.food.c_per_100g,
      grams: dish.estimated_grams,
    };
  }
  return {
    food_ref_id: 'unknown',
    food_type: 'master',
    name: dish.name,
    kcal_per_100g: 0,
    p_per_100g: 0,
    f_per_100g: 0,
    c_per_100g: 0,
    grams: dish.estimated_grams,
  };
}

function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

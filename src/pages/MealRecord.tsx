import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Alert, Button, Card, EmptyState, Input, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { MEAL_TYPE_LABELS } from '@/constants';
import { useFoods } from '@/contexts/FoodsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { errorMessageFor } from '@/domain/errors';
import { buildMealItemFromFood, recalculateMealTotals, getMealHistoryFoodIds } from '@/domain/mealAggregator';
import { fetchProductByBarcode } from '@/infrastructure/openFoodFacts/openFoodFactsClient';
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

type Mode = 'photo' | 'search' | 'barcode';

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
  const [recordedAt, setRecordedAt] = useState<string>(defaultDatetimeLocal());
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<{ current: number; total: number } | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalInitialName, setCustomModalInitialName] = useState('');
  const [customModalInitialBarcode, setCustomModalInitialBarcode] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
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

  const handleBarcodeDetected = async (barcode: string) => {
    setScannerOpen(false);
    const cleaned = barcode.replace(/[^0-9]/g, '');
    if (!cleaned) return;

    const existing = customFoods.find((f) => f.barcode === cleaned);
    if (existing) {
      addDraftFromFood(existing, 'custom');
      show(`「${existing.name}」を追加しました`, 'success');
      return;
    }

    setBarcodeLoading(true);
    try {
      const product = await fetchProductByBarcode(cleaned);
      if (!product) {
        show('商品データが見つかりませんでした。手動で登録してください', 'info');
        setCustomModalInitialName('');
        setCustomModalInitialBarcode(cleaned);
        setShowCustomModal(true);
        return;
      }
      if (product.kcal_per_100g === 0) {
        show('栄養データが不完全です。確認して保存してください', 'info');
        setCustomModalInitialName(product.name);
        setCustomModalInitialBarcode(cleaned);
        setShowCustomModal(true);
        return;
      }
      const created = createCustomFood({
        name: product.name,
        kcal_per_100g: product.kcal_per_100g,
        p_per_100g: product.p_per_100g,
        f_per_100g: product.f_per_100g,
        c_per_100g: product.c_per_100g,
        barcode: cleaned,
      });
      addDraftFromFood(created, 'custom');
      show(`「${product.name}」を追加しました`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '商品データの取得に失敗しました';
      show(msg, 'error');
      errorLogRepository.append({
        log_id: uuid(),
        occurred_at: new Date().toISOString(),
        category: 'unknown',
        message: `barcode:${cleaned} ${msg}`,
      });
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handlePhotoSelect = async (files: File[]) => {
    if (files.length === 0) return;
    if (!settings.api_key_enc) {
      show('設定画面でGemini APIキーを登録してください', 'error');
      navigate('/settings');
      return;
    }
    setLoading(true);
    setPhotoProgress({ current: 0, total: files.length });

    const accumulated: Draft[] = [];
    const confidences: number[] = [];
    let failed = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        setPhotoProgress({ current: i + 1, total: files.length });
        try {
          const dishes = await estimateDishesFromFile(files[i], settings.api_key_enc);
          accumulated.push(...dishes.map((dish) => dishToDraft(dish, fuzzyMatcher)));
          confidences.push(
            dishes.reduce((s, d) => s + d.confidence, 0) / Math.max(dishes.length, 1),
          );
        } catch (e) {
          failed++;
          const msg = errorMessageFor(e);
          errorLogRepository.append({
            log_id: uuid(),
            occurred_at: new Date().toISOString(),
            category: 'gemini',
            message: `photo ${i + 1}/${files.length}: ${msg}`,
          });
        }
      }

      if (accumulated.length > 0) {
        setDrafts((prev) => [...prev, ...accumulated]);
        setGeminiConfidence(
          confidences.reduce((s, v) => s + v, 0) / Math.max(confidences.length, 1),
        );
        if (failed > 0) {
          show(
            `${accumulated.length} 件認識（${failed} 枚は失敗）`,
            'info',
          );
        } else {
          show(`${accumulated.length} 件の料理を認識しました`, 'success');
        }
      } else {
        show('どの写真からも料理を認識できませんでした', 'error');
        setMode('search');
      }
    } finally {
      setLoading(false);
      setPhotoProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (drafts.length === 0) return;
    const mealId = uuid();
    const recordedIso = datetimeLocalToIso(recordedAt);
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
        recorded_at: recordedIso,
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <Input
          label="日時"
          type="datetime-local"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          hint="過去の食事もここで日時を指定できます"
        />
      </div>

      <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <button
          onClick={() => setMode('photo')}
          className={`flex-1 rounded-md py-2 text-xs font-medium transition sm:text-sm ${
            mode === 'photo'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
              : 'text-zinc-500'
          }`}
        >
          📷 写真
        </button>
        <button
          onClick={() => setMode('search')}
          className={`flex-1 rounded-md py-2 text-xs font-medium transition sm:text-sm ${
            mode === 'search'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
              : 'text-zinc-500'
          }`}
        >
          🔍 検索
        </button>
        <button
          onClick={() => setMode('barcode')}
          className={`flex-1 rounded-md py-2 text-xs font-medium transition sm:text-sm ${
            mode === 'barcode'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
              : 'text-zinc-500'
          }`}
        >
          🧾 バーコード
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
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) handlePhotoSelect(files);
                }}
              />
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading
                  ? photoProgress
                    ? `認識中… ${photoProgress.current}/${photoProgress.total}`
                    : '認識中…'
                  : '📷 写真を選ぶ（複数可）'}
              </Button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                カメラで連続撮影、または端末内のアルバムから複数選択できます
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                送信前に自動で縮小・圧縮するため、大きなスマホ写真もそのまま使えます
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

      {mode === 'barcode' && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-6">
            <Button
              size="lg"
              onClick={() => setScannerOpen(true)}
              disabled={barcodeLoading}
            >
              {barcodeLoading ? '商品を検索中…' : '🧾 バーコードをスキャン'}
            </Button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              コンビニ食品・加工食品のJANコードから kcal / PFC を自動取得します。
            </p>
            <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
              商品データは Open Food Facts（世界最大のオープン食品DB）を参照。日本の商品は収録が限られるため、見つからない場合は手動登録になります。
            </p>
          </div>
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
        initialName={customModalInitialBarcode ? customModalInitialName : searchKeyword}
        initialBarcode={customModalInitialBarcode ?? undefined}
        onClose={() => {
          setShowCustomModal(false);
          setCustomModalInitialBarcode(null);
          setCustomModalInitialName('');
        }}
        onSubmit={(input) => {
          const created = createCustomFood(input);
          addDraftFromFood(created, 'custom');
          show(`「${created.name}」を登録しました`, 'success');
          setShowCustomModal(false);
          setCustomModalInitialBarcode(null);
          setCustomModalInitialName('');
        }}
      />

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
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

function defaultDatetimeLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function datetimeLocalToIso(dtLocal: string): string {
  if (!dtLocal) return new Date().toISOString();
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

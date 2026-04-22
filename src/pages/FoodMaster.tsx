import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Input, Modal } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { isPfcKcalConsistent } from '@/domain/pfcCalculator';
import { useCustomFoods } from '@/hooks/useCustomFoods';
import type { CustomFood } from '@/types/domain';

export function FoodMasterPage() {
  const { customFoods, create, update, remove } = useCustomFoods();
  const { show } = useToast();
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<CustomFood | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!keyword) return customFoods;
    return customFoods.filter((f) => f.name.includes(keyword));
  }, [customFoods, keyword]);

  const handleDelete = (food: CustomFood) => {
    if (!confirm(`「${food.name}」を削除しますか？（過去の記録には影響しません）`)) return;
    remove(food.food_id);
    show('削除しました', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">食品マスタ管理</h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          + 追加
        </Button>
      </div>
      <Input
        placeholder="カスタム食品を検索..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      <Card title={`カスタム食品 (${filtered.length}件)`}>
        {filtered.length === 0 ? (
          <EmptyState
            title={keyword ? '一致する食品はありません' : 'カスタム食品はまだありません'}
            description="外食・コンビニ商品などを登録できます"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((food) => (
              <li key={food.food_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{food.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {food.kcal_per_100g} kcal / 100g ・ P: {food.p_per_100g}g F:{' '}
                    {food.f_per_100g}g C: {food.c_per_100g}g
                  </p>
                  {food.barcode && (
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                      JAN: {food.barcode}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(food)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="編集"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(food)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-rose-500 dark:hover:bg-zinc-800"
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
        )}
      </Card>

      <CustomFoodFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(input) => {
          create(input);
          show(`「${input.name}」を登録しました`, 'success');
          setCreating(false);
        }}
      />

      <CustomFoodFormModal
        open={!!editing}
        initialFood={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSubmit={(input) => {
          if (!editing) return;
          update(editing.food_id, input);
          show(`「${input.name}」を更新しました`, 'success');
          setEditing(null);
        }}
      />
    </div>
  );
}

export function CustomFoodFormModal({
  open,
  initialFood,
  initialName,
  initialBarcode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialFood?: CustomFood;
  initialName?: string;
  initialBarcode?: string;
  onClose: () => void;
  onSubmit: (food: Omit<CustomFood, 'food_id' | 'created_at' | 'updated_at'>) => void;
}) {
  const [name, setName] = useState(initialFood?.name ?? initialName ?? '');
  const [kcal, setKcal] = useState(String(initialFood?.kcal_per_100g ?? ''));
  const [p, setP] = useState(String(initialFood?.p_per_100g ?? ''));
  const [f, setF] = useState(String(initialFood?.f_per_100g ?? ''));
  const [c, setC] = useState(String(initialFood?.c_per_100g ?? ''));
  const [barcode, setBarcode] = useState(initialFood?.barcode ?? initialBarcode ?? '');

  useMemo(() => {
    if (open) {
      setName(initialFood?.name ?? initialName ?? '');
      setKcal(String(initialFood?.kcal_per_100g ?? ''));
      setP(String(initialFood?.p_per_100g ?? ''));
      setF(String(initialFood?.f_per_100g ?? ''));
      setC(String(initialFood?.c_per_100g ?? ''));
      setBarcode(initialFood?.barcode ?? initialBarcode ?? '');
    }
  }, [open, initialFood, initialName, initialBarcode]);

  const kcalNum = Number(kcal);
  const pNum = Number(p);
  const fNum = Number(f);
  const cNum = Number(c);
  const valid = name.trim().length >= 1 && !Number.isNaN(kcalNum) && kcalNum > 0;
  const consistent = valid
    ? isPfcKcalConsistent(kcalNum, { p: pNum, f: fNum, c: cNum })
    : true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialFood ? 'カスタム食品を編集' : 'カスタム食品を追加'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            disabled={!valid}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                kcal_per_100g: kcalNum,
                p_per_100g: pNum || 0,
                f_per_100g: fNum || 0,
                c_per_100g: cNum || 0,
                barcode: barcode.trim() || null,
              })
            }
          >
            保存
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 【セブン】サラダチキン"
        />
        <Input
          label="カロリー / 100g"
          type="number"
          inputMode="decimal"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
          suffix="kcal"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input label="P / 100g" type="number" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} suffix="g" />
          <Input label="F / 100g" type="number" inputMode="decimal" value={f} onChange={(e) => setF(e.target.value)} suffix="g" />
          <Input label="C / 100g" type="number" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} suffix="g" />
        </div>
        <Input
          label="バーコード（任意）"
          type="text"
          inputMode="numeric"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="4901234567890"
          hint="登録するとバーコードスキャン時に自動で呼び出されます"
        />
        {!consistent && valid && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            ⚠ 表示カロリーと PFC から計算した kcal（{pNum * 4 + fNum * 9 + cNum * 4} kcal）が 10% 以上乖離しています。保存は可能です。
          </div>
        )}
      </div>
    </Modal>
  );
}

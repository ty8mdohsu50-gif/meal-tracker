import { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, EmptyState, Input } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { APP_CONFIG, PFC_COLORS } from '@/constants';
import { useWeights } from '@/hooks/useWeights';
import { todayKey } from '@/utils/date';
import { uuid } from '@/utils/id';
import type { Weight } from '@/types/domain';

export function WeightPage() {
  const { weights, saveWeight, deleteWeight } = useWeights();
  const { show } = useToast();
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [date, setDate] = useState<string>(todayKey());
  const [editing, setEditing] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...weights].sort((a, b) => b.recorded_date.localeCompare(a.recorded_date)),
    [weights],
  );

  const chartData = useMemo(
    () =>
      [...weights]
        .sort((a, b) => a.recorded_date.localeCompare(b.recorded_date))
        .slice(-60)
        .map((w) => ({
          date: w.recorded_date.slice(5),
          kg: w.weight_kg,
          bf: w.body_fat_pct ?? null,
        })),
    [weights],
  );

  const hasBodyFatData = useMemo(
    () => weights.some((w) => typeof w.body_fat_pct === 'number'),
    [weights],
  );

  const handleSave = () => {
    const kg = Number(weightInput);
    if (!kg || kg < APP_CONFIG.WEIGHT_MIN || kg > APP_CONFIG.WEIGHT_MAX) {
      show(`体重は ${APP_CONFIG.WEIGHT_MIN}〜${APP_CONFIG.WEIGHT_MAX} kg で入力してください`, 'error');
      return;
    }
    if (!date) {
      show('日付を選んでください', 'error');
      return;
    }

    let bodyFat: number | null = null;
    if (bodyFatInput.trim()) {
      const bf = Number(bodyFatInput);
      if (!bf || bf < APP_CONFIG.BODY_FAT_MIN || bf > APP_CONFIG.BODY_FAT_MAX) {
        show(
          `体脂肪率は ${APP_CONFIG.BODY_FAT_MIN}〜${APP_CONFIG.BODY_FAT_MAX} % で入力してください`,
          'error',
        );
        return;
      }
      bodyFat = bf;
    }

    const now = new Date().toISOString();
    const existing = sorted.find((w) => w.recorded_date === date);
    const weight: Weight = {
      weight_id: existing?.weight_id ?? uuid(),
      recorded_date: date,
      weight_kg: kg,
      body_fat_pct: bodyFat,
      recorded_at: now,
    };
    saveWeight(weight);
    setWeightInput('');
    setBodyFatInput('');
    setDate(todayKey());
    show(existing ? `${date} の記録を更新しました` : '記録しました', 'success');
  };

  const handleEdit = (id: string, newKg: string, newBf: string) => {
    const kg = Number(newKg);
    if (!kg || kg < APP_CONFIG.WEIGHT_MIN || kg > APP_CONFIG.WEIGHT_MAX) {
      show('不正な体重です', 'error');
      return;
    }
    let bf: number | null = null;
    if (newBf.trim()) {
      const parsed = Number(newBf);
      if (!parsed || parsed < APP_CONFIG.BODY_FAT_MIN || parsed > APP_CONFIG.BODY_FAT_MAX) {
        show('不正な体脂肪率です', 'error');
        return;
      }
      bf = parsed;
    }
    const w = weights.find((x) => x.weight_id === id);
    if (!w) return;
    saveWeight({
      ...w,
      weight_kg: kg,
      body_fat_pct: bf,
      recorded_at: new Date().toISOString(),
    });
    setEditing(null);
    show('更新しました', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">体重・体脂肪率</h1>

      <Card title="記録する">
        <div className="flex flex-col gap-3">
          <Input
            label="日付"
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="体重"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              suffix="kg"
              placeholder="65.3"
            />
            <Input
              label="体脂肪率（任意）"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={bodyFatInput}
              onChange={(e) => setBodyFatInput(e.target.value)}
              suffix="%"
              placeholder="18.5"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              過去の日付も選べます。体組成計の値をそのまま入れてOK
            </p>
            <Button onClick={handleSave}>記録</Button>
          </div>
        </div>
      </Card>

      <Card title="体重の推移（直近60日）">
        {chartData.length < 2 ? (
          <EmptyState title="データが不足しています" description="2日以上記録すると推移が表示されます" />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number) => `${v.toFixed(1)} kg`}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke={PFC_COLORS.weight}
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {hasBodyFatData && (
        <Card title="体脂肪率の推移（直近60日）">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number) => `${v.toFixed(1)} %`}
                />
                <Line
                  type="monotone"
                  dataKey="bf"
                  stroke={PFC_COLORS.fat}
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card title={`直近の記録 (${sorted.length}件)`}>
        {sorted.length === 0 ? (
          <EmptyState title="まだ記録がありません" />
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {sorted.slice(0, 30).map((w) => (
              <li key={w.weight_id} className="flex items-center justify-between gap-3 py-2.5">
                {editing === w.weight_id ? (
                  <InlineEdit
                    date={w.recorded_date}
                    initialKg={String(w.weight_kg)}
                    initialBf={w.body_fat_pct != null ? String(w.body_fat_pct) : ''}
                    onSave={(kg, bf) => handleEdit(w.weight_id, kg, bf)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {w.recorded_date}
                    </div>
                    <div className="flex-1 text-right text-sm tabular-nums">
                      <div className="font-semibold">{w.weight_kg.toFixed(1)} kg</div>
                      {w.body_fat_pct != null && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          体脂肪 {w.body_fat_pct.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(w.weight_id)}
                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('削除しますか？')) {
                            deleteWeight(w.weight_id);
                            show('削除しました', 'success');
                          }
                        }}
                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-rose-500 dark:hover:bg-zinc-800"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function InlineEdit({
  date,
  initialKg,
  initialBf,
  onSave,
  onCancel,
}: {
  date: string;
  initialKg: string;
  initialBf: string;
  onSave: (kg: string, bf: string) => void;
  onCancel: () => void;
}) {
  const [kg, setKg] = useState(initialKg);
  const [bf, setBf] = useState(initialBf);
  return (
    <div className="flex flex-1 items-center gap-1.5">
      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{date}</span>
      <input
        type="number"
        step="0.1"
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        placeholder="kg"
        className="h-8 w-16 rounded border border-zinc-200 bg-white px-2 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
        autoFocus
      />
      <input
        type="number"
        step="0.1"
        value={bf}
        onChange={(e) => setBf(e.target.value)}
        placeholder="体脂肪%"
        className="h-8 w-20 rounded border border-zinc-200 bg-white px-2 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
      />
      <Button size="sm" onClick={() => onSave(kg, bf)}>
        保存
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        取消
      </Button>
    </div>
  );
}

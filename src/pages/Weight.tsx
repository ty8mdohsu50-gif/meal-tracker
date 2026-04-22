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
  const [value, setValue] = useState('');
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
        .map((w) => ({ date: w.recorded_date.slice(5), kg: w.weight_kg })),
    [weights],
  );

  const handleSave = () => {
    const kg = Number(value);
    if (!kg || kg < APP_CONFIG.WEIGHT_MIN || kg > APP_CONFIG.WEIGHT_MAX) {
      show('体重は 20〜300 kg の範囲で入力してください', 'error');
      return;
    }
    if (!date) {
      show('日付を選んでください', 'error');
      return;
    }
    const now = new Date().toISOString();
    const existing = sorted.find((w) => w.recorded_date === date);
    const weight: Weight = {
      weight_id: existing?.weight_id ?? uuid(),
      recorded_date: date,
      weight_kg: kg,
      recorded_at: now,
    };
    saveWeight(weight);
    setValue('');
    setDate(todayKey());
    show(existing ? `${date} の記録を更新しました` : '記録しました', 'success');
  };

  const handleEdit = (id: string, newValue: string) => {
    const kg = Number(newValue);
    if (!kg || kg < APP_CONFIG.WEIGHT_MIN || kg > APP_CONFIG.WEIGHT_MAX) {
      show('不正な値です', 'error');
      return;
    }
    const w = weights.find((x) => x.weight_id === id);
    if (!w) return;
    saveWeight({ ...w, weight_kg: kg, recorded_at: new Date().toISOString() });
    setEditing(null);
    show('更新しました', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">体重記録</h1>

      <Card title="体重を記録">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="日付"
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              label="体重"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              suffix="kg"
              placeholder="65.3"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              過去の日付を選べば後から記録・修正できます
            </p>
            <Button onClick={handleSave}>記録</Button>
          </div>
        </div>
      </Card>

      <Card title="推移（直近60日）">
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

      <Card title={`直近の記録 (${sorted.length}件)`}>
        {sorted.length === 0 ? (
          <EmptyState title="まだ体重記録がありません" />
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {sorted.slice(0, 30).map((w) => (
              <li key={w.weight_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {w.recorded_date}
                </div>
                {editing === w.weight_id ? (
                  <InlineEdit
                    initial={String(w.weight_kg)}
                    onSave={(v) => handleEdit(w.weight_id, v)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <div className="flex-1 text-right text-sm font-semibold tabular-nums">
                      {w.weight_kg.toFixed(1)} kg
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
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.1"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="h-8 w-20 rounded border border-zinc-200 bg-white px-2 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
        autoFocus
      />
      <Button size="sm" onClick={() => onSave(v)}>
        保存
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        取消
      </Button>
    </div>
  );
}

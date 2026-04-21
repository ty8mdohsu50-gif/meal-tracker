import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, EmptyState, Select } from '@/components/ui';
import { PFC_COLORS } from '@/constants';
import { useSettings } from '@/contexts/SettingsContext';
import { aggregateRange } from '@/domain/mealAggregator';
import { useMeals } from '@/hooks/useMeals';
import { useWeights } from '@/hooks/useWeights';
import { addDays, todayKey } from '@/utils/date';

type Range = '7d' | '30d' | '90d';

export function HistoryPage() {
  const [range, setRange] = useState<Range>('7d');
  const { meals } = useMeals();
  const { weights } = useWeights();
  const { settings } = useSettings();

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const today = todayKey();
  const startDate = addDays(today, -(days - 1));

  const series = useMemo(() => aggregateRange(meals, startDate, today), [meals, startDate, today]);

  const weightSeries = useMemo(() => {
    const byDate = new Map(weights.map((w) => [w.recorded_date, w.weight_kg]));
    return series.map((s) => ({ date: s.date.slice(5), kg: byDate.get(s.date) ?? null }));
  }, [series, weights]);

  const kcalData = series.map((s) => ({ date: s.date.slice(5), kcal: s.kcal }));
  const pfcData = series.map((s) => ({ date: s.date.slice(5), P: s.p, F: s.f, C: s.c }));

  const targetKcal = settings?.current_target_kcal ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">履歴・トレンド</h1>
        <Select value={range} onChange={(e) => setRange(e.target.value as Range)} className="w-32">
          <option value="7d">直近7日</option>
          <option value="30d">直近30日</option>
          <option value="90d">直近90日</option>
        </Select>
      </div>

      <Card title="カロリー推移">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kcalData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <ReferenceLine
                y={targetKcal}
                stroke={PFC_COLORS.target}
                strokeDasharray="3 3"
                label={{ value: `目標 ${targetKcal}`, fontSize: 10, fill: '#6b7280' }}
              />
              <Line
                type="monotone"
                dataKey="kcal"
                stroke={PFC_COLORS.kcal}
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="PFC 推移 (g)">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pfcData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="P" stroke={PFC_COLORS.protein} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="F" stroke={PFC_COLORS.fat} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="C" stroke={PFC_COLORS.carbs} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="体重推移">
        {weightSeries.every((w) => w.kg === null) ? (
          <EmptyState title="体重データがまだありません" description="体重画面から記録してください" />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => (typeof v === 'number' ? `${v.toFixed(1)} kg` : '—')}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke={PFC_COLORS.weight}
                  strokeWidth={2.5}
                  connectNulls
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

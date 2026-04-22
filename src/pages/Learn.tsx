import { useMemo } from 'react';
import { Card } from '@/components/ui';
import { useSettings } from '@/contexts/SettingsContext';

type Exercise = {
  name: string;
  detail: string;
  met: number;
  color: string;
};

const EXERCISES: Exercise[] = [
  { name: 'ウォーキング（普通）', detail: '時速4km／散歩ペース', met: 3.0, color: 'emerald' },
  { name: 'ウォーキング（速歩）', detail: '時速6km／少し息が弾む', met: 4.3, color: 'emerald' },
  { name: 'ジョギング', detail: '時速8km／会話はできる', met: 8.0, color: 'sky' },
  { name: 'ランニング', detail: '時速10km／1km=6分', met: 10.0, color: 'sky' },
  { name: 'ランニング（速め）', detail: '時速12km／1km=5分', met: 12.0, color: 'sky' },
  { name: 'サイクリング（通勤）', detail: '時速16km／緩め', met: 6.8, color: 'violet' },
  { name: 'サイクリング（速め）', detail: '時速20km／少しきつい', met: 8.0, color: 'violet' },
  { name: 'サイクリング（速い）', detail: '時速25km／本格的', met: 10.0, color: 'violet' },
];

const MINUTES = [15, 30, 60] as const;

const COLOR_CLASS: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  sky: 'text-sky-600 dark:text-sky-400',
  violet: 'text-violet-600 dark:text-violet-400',
};

function kcal(met: number, kg: number, minutes: number): number {
  return Math.round(met * kg * (minutes / 60));
}

export function LearnPage() {
  const { settings } = useSettings();
  const userKg = settings?.current_weight_kg ?? 65;

  const exerciseRows = useMemo(
    () =>
      EXERCISES.map((ex) => ({
        ...ex,
        values: MINUTES.map((m) => kcal(ex.met, userKg, m)),
      })),
    [userKg],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">学ぶ</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          カロリーや PFC、運動消費の基本をまとめました。
        </p>
      </div>

      <Card title="1. カロリーの基本">
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            体重は <span className="font-semibold">「摂取カロリー − 消費カロリー」</span> の差で変動します。毎日少しずつでも消費のほうが多ければ減り、摂取のほうが多ければ増えます。
          </p>
          <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            体脂肪 <span className="font-semibold">1kg ≒ 7,200 kcal</span> の差が必要。
            <br />
            例：1日 500 kcal の不足を続けると、約 2 週間で 1 kg 減。
          </div>
          <p>
            消費カロリーは大きく分けて3つ。
          </p>
          <ul className="ml-5 list-disc space-y-1 text-xs">
            <li>
              <span className="font-semibold">BMR（基礎代謝）</span>：
              寝ていても使われる生命維持のためのエネルギー。全体の 60〜70%。
            </li>
            <li>
              <span className="font-semibold">活動代謝</span>：
              日常の動きや運動で使われる分。活動量が高いほど多い。
            </li>
            <li>
              <span className="font-semibold">食事誘発性熱産生 (DIT)</span>：
              食べ物を消化するときに使う分（全体の約 10%）。
            </li>
          </ul>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            このアプリでは BMR を Harris-Benedict 改訂版（1984）で計算し、活動レベルをかけて TDEE（総消費）を求めています。詳しい計算式は「設定」→「目標kcalの計算式」からあなたの数値で展開できます。
          </p>
        </div>
      </Card>

      <Card title="2. PFC とは">
        <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
          三大栄養素のこと。<span className="font-semibold">P</span>rotein（タンパク質）・
          <span className="font-semibold">F</span>at（脂質）・
          <span className="font-semibold">C</span>arbohydrate（炭水化物）の頭文字。
        </p>
        <div className="flex flex-col gap-2">
          <MacroCard
            letter="P"
            title="タンパク質"
            kcalPerGram="4 kcal/g"
            color="sky"
            summary="筋肉・臓器・酵素・ホルモンの材料"
            detail="摂取量が少ないと筋肉が落ちやすい。減量中はむしろ増やす。目安は体重1kgあたり1.2〜2.2g。"
          />
          <MacroCard
            letter="F"
            title="脂質"
            kcalPerGram="9 kcal/g"
            color="amber"
            summary="ホルモン合成・細胞膜・エネルギー源"
            detail="高カロリーだが必須。極端に減らすとホルモンバランスを崩す。総カロリーの20〜30%が目安。"
          />
          <MacroCard
            letter="C"
            title="炭水化物"
            kcalPerGram="4 kcal/g"
            color="violet"
            summary="脳と筋肉のメインエネルギー"
            detail="運動・勉強・仕事のパフォーマンスを支える。残り（P・Fを引いた分）をここに当てるのが定番。"
          />
        </div>
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          合計 kcal ＝ P×4 ＋ F×9 ＋ C×4。同じカロリーでも「何から摂るか」で体作りの結果が変わります。
        </div>
      </Card>

      <Card title="3. 目的別の考え方">
        <div className="flex flex-col gap-3">
          <GoalCard
            title="ダイエット（脂肪を減らす）"
            color="rose"
            points={[
              'TDEE より 300〜500 kcal 少なめを狙う（週 0.3〜0.5kg 減ペース）',
              'タンパク質は体重1kgあたり 1.6〜2.2g。筋肉を残すために重要',
              '脂質は総 kcal の約 25%。下げすぎない',
              '急激な減量は筋肉とメンタルを失う。無理のない期間設定を',
            ]}
          />
          <GoalCard
            title="増量（筋肉を増やす）"
            color="amber"
            points={[
              'TDEE より 200〜400 kcal 多めを狙う（週 +0.2〜0.3kg が理想）',
              'タンパク質は体重1kgあたり 1.8〜2.0g。炭水化物も十分に摂る',
              '筋トレとセットで初めて「筋肉」として増える。食べるだけだと脂肪優勢',
              '食欲がない日はプロテインやおにぎり等で調整',
            ]}
          />
          <GoalCard
            title="健康維持"
            color="emerald"
            points={[
              '摂取 = 消費 のバランス。週ごとの体重変動を見て微調整',
              'タンパク質は体重1kgあたり 1.0〜1.2g あれば十分',
              '有酸素運動は週 150 分（速歩なら週5日×30分）が目安',
              '野菜350g / 食物繊維 20g / 水分 2L を意識',
            ]}
          />
        </div>
      </Card>

      <Card title={`4. 運動で消費するカロリー（体重 ${userKg}kg の場合）`}>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          体重と運動時間で変わります。このアプリのあなたの体重（{userKg}kg）で自動計算しています。
        </p>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[320px] table-fixed text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                <th className="py-2 pl-1 text-left font-medium">運動</th>
                {MINUTES.map((m) => (
                  <th key={m} className="py-2 text-right font-medium">
                    {m}分
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exerciseRows.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-800"
                >
                  <td className="py-2.5 pl-1">
                    <div className={`text-sm font-medium ${COLOR_CLASS[row.color]}`}>{row.name}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {row.detail}
                    </div>
                  </td>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-2.5 text-right font-mono tabular-nums">
                      {v}
                      <span className="ml-0.5 text-[10px] text-zinc-400">kcal</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-[11px] leading-relaxed text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          計算式：<span className="font-mono">MET × 体重(kg) × 時間(h)</span>
          <br />
          例：ランニング（10 MET）を 30 分、体重 70 kg → 10 × 70 × 0.5 ＝ <span className="font-semibold">350 kcal</span>
        </div>
      </Card>

      <Card title="5. よくある誤解と注意点">
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <Tip
            title="「体重が減らない＝停滞」ではない"
            body="水分や便通で1〜2kgは普通に変動します。週単位の平均で判断を。"
          />
          <Tip
            title="カロリーさえ低ければ OK ではない"
            body="タンパク質不足だと筋肉が落ち、基礎代謝が下がってかえって痩せにくい体に。"
          />
          <Tip
            title="有酸素だけだと筋肉が減る"
            body="減量期こそ週1〜2回の筋トレを。維持期以上の筋量が「リバウンドしにくさ」に直結。"
          />
          <Tip
            title="睡眠不足は太る"
            body="6時間未満が続くと食欲ホルモン（グレリン）が増え、満腹ホルモン（レプチン）が減る。7時間確保を。"
          />
          <Tip
            title="チートデイは慎重に"
            body="1 日で +3,000 kcal 摂れば、1 週間の赤字をほぼ帳消しにできる計算。頑張りが無駄になる前にルール化を。"
          />
        </ul>
      </Card>

      <p className="mb-6 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        ※ ここに書かれている数値は一般的な目安です。病気・妊娠中・極端な体型などの場合は、医師や管理栄養士に相談してください。
      </p>
    </div>
  );
}

function MacroCard({
  letter,
  title,
  kcalPerGram,
  color,
  summary,
  detail,
}: {
  letter: string;
  title: string;
  kcalPerGram: string;
  color: 'sky' | 'amber' | 'violet';
  summary: string;
  detail: string;
}) {
  const badge: Record<typeof color, string> = {
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  };
  return (
    <div className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg font-bold ${badge[color]}`}>
        {letter}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{kcalPerGram}</span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">{summary}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{detail}</p>
      </div>
    </div>
  );
}

function GoalCard({
  title,
  color,
  points,
}: {
  title: string;
  color: 'rose' | 'amber' | 'emerald';
  points: string[];
}) {
  const accent: Record<typeof color, string> = {
    rose: 'border-rose-200 dark:border-rose-900/60',
    amber: 'border-amber-200 dark:border-amber-900/60',
    emerald: 'border-emerald-200 dark:border-emerald-900/60',
  };
  const bullet: Record<typeof color, string> = {
    rose: 'text-rose-600 dark:text-rose-400',
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div className={`rounded-lg border p-3 ${accent[color]}`}>
      <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className={`shrink-0 ${bullet[color]}`}>●</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tip({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-2">
      <span className="shrink-0 text-emerald-600 dark:text-emerald-400">✓</span>
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{body}</p>
      </div>
    </li>
  );
}

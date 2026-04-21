import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { ACTIVITY_LEVELS, APP_CONFIG, PFC_POLICY_CONFIG } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { errorLogRepository } from '@/infrastructure/storage/errorLogRepository';
import { useApiUsage } from '@/hooks/useApiUsage';
import { useGoal } from '@/hooks/useGoal';
import { downloadJson } from '@/services/exportService';
import { importFromJson } from '@/services/importService';
import type { ActivityLevelKey, PfcPolicy, Settings, Sex, ThemeMode } from '@/types/domain';
import { decodeApiKey, encodeApiKey } from '@/utils/base64';

export function SettingsPage() {
  const { settings, computed, updateSettings, recalculateTargets } = useGoal();
  const { show } = useToast();
  const { todayCount, limit } = useApiUsage();
  const { user, signOutUser } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [errorLogs, setErrorLogs] = useState(() => errorLogRepository.findAll());
  const [draft, setDraft] = useState<Settings | null>(settings);

  useEffect(() => setDraft(settings), [settings]);

  if (!settings || !draft) return null;

  const recompute = () => {
    const computed = recalculateTargets(draft);
    setDraft({ ...draft, ...computed });
    show('目標値を再計算しました', 'success');
  };

  const save = () => {
    updateSettings({
      sex: draft.sex,
      age: draft.age,
      height_cm: draft.height_cm,
      current_weight_kg: draft.current_weight_kg,
      activity_level_key: draft.activity_level_key,
      pfc_policy: draft.pfc_policy,
      protein_coef: draft.protein_coef,
      fat_ratio: draft.fat_ratio,
      target_weight_change_per_week: draft.target_weight_change_per_week,
      current_target_kcal: draft.current_target_kcal,
      current_target_p: draft.current_target_p,
      current_target_f: draft.current_target_f,
      current_target_c: draft.current_target_c,
    });
    show('設定を保存しました', 'success');
  };

  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      show('APIキーを入力してください', 'error');
      return;
    }
    updateSettings({ api_key_enc: encodeApiKey(trimmed) });
    setApiKeyInput('');
    show('APIキーを保存しました', 'success');
  };

  const deleteApiKey = () => {
    if (!confirm('APIキーを削除しますか？')) return;
    updateSettings({ api_key_enc: null });
    show('APIキーを削除しました', 'success');
  };

  const handleImport = async (file: File, mode: 'overwrite' | 'merge') => {
    const text = await file.text();
    try {
      importFromJson(text, mode);
      show(`インポートしました (${mode === 'overwrite' ? '上書き' : 'マージ'})`, 'success');
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      show(e instanceof Error ? e.message : 'インポートに失敗しました', 'error');
    }
  };

  const maskedKey = settings.api_key_enc
    ? '****' + decodeApiKey(settings.api_key_enc).slice(-5)
    : '（未設定）';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">設定</h1>

      <Card title="アカウント">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user?.displayName ?? '—'}</div>
              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {user?.email ?? ''}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (confirm('ログアウトしますか？（端末内のキャッシュはクリアされます）')) {
                signOutUser();
              }
            }}
          >
            ログアウト
          </Button>
        </div>
      </Card>

      <Card title="目標設定">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="性別"
            value={draft.sex}
            onChange={(e) => setDraft({ ...draft, sex: e.target.value as Sex })}
          >
            <option value="male">男性</option>
            <option value="female">女性</option>
          </Select>
          <Input
            label="年齢"
            type="number"
            value={draft.age}
            onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })}
            suffix="歳"
          />
          <Input
            label="身長"
            type="number"
            value={draft.height_cm}
            onChange={(e) => setDraft({ ...draft, height_cm: Number(e.target.value) })}
            suffix="cm"
          />
          <Input
            label="現在の体重"
            type="number"
            step="0.1"
            value={draft.current_weight_kg}
            onChange={(e) =>
              setDraft({ ...draft, current_weight_kg: Number(e.target.value) })
            }
            suffix="kg"
          />
          <Select
            label="活動レベル"
            value={draft.activity_level_key}
            onChange={(e) =>
              setDraft({ ...draft, activity_level_key: e.target.value as ActivityLevelKey })
            }
          >
            {(Object.keys(ACTIVITY_LEVELS) as ActivityLevelKey[]).map((k) => (
              <option key={k} value={k}>
                {ACTIVITY_LEVELS[k].label}（×{ACTIVITY_LEVELS[k].coef}）
              </option>
            ))}
          </Select>
          <Select
            label="PFC 方針"
            value={draft.pfc_policy}
            onChange={(e) => setDraft({ ...draft, pfc_policy: e.target.value as PfcPolicy })}
          >
            {(Object.keys(PFC_POLICY_CONFIG) as PfcPolicy[]).map((k) => (
              <option key={k} value={k}>
                {PFC_POLICY_CONFIG[k].label}
              </option>
            ))}
          </Select>
          <Input
            label="脂質比率"
            type="number"
            value={Math.round(draft.fat_ratio * 100)}
            onChange={(e) =>
              setDraft({ ...draft, fat_ratio: Number(e.target.value) / 100 })
            }
            suffix="%"
          />
          <Input
            label="体重変化目標"
            type="number"
            step="0.1"
            value={draft.target_weight_change_per_week}
            onChange={(e) =>
              setDraft({ ...draft, target_weight_change_per_week: Number(e.target.value) })
            }
            suffix="kg/週"
          />
        </div>

        <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
          <div className="grid grid-cols-2 gap-1">
            <span className="text-xs text-zinc-500">BMR</span>
            <span className="text-right font-mono">{computed?.bmr} kcal</span>
            <span className="text-xs text-zinc-500">TDEE</span>
            <span className="text-right font-mono">{computed?.tdee} kcal</span>
            <span className="text-xs font-semibold">目標 kcal</span>
            <span className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {draft.current_target_kcal.toLocaleString()}
            </span>
            <span className="text-xs font-semibold">P / F / C</span>
            <span className="text-right font-mono">
              {draft.current_target_p} / {draft.current_target_f} / {draft.current_target_c} g
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={recompute}>
            再計算
          </Button>
          <Button onClick={save}>保存</Button>
        </div>
      </Card>

      <Card title="Gemini API キー">
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          現在のキー: <span className="font-mono">{maskedKey}</span>
        </p>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          本日の使用量: <span className="font-mono">{todayCount} / {limit}</span>
        </p>
        <div className="flex gap-2">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AIza..."
            className="flex-1"
          />
          <Button variant="secondary" size="md" onClick={() => setShowApiKey((s) => !s)}>
            {showApiKey ? '隠す' : '表示'}
          </Button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {settings.api_key_enc && (
            <Button variant="ghost" onClick={deleteApiKey}>
              削除
            </Button>
          )}
          <Button onClick={saveApiKey}>保存</Button>
        </div>
      </Card>

      <Card title="データ管理">
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={downloadJson}>
            📥 JSON エクスポート
          </Button>
          <div>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              インポート（既存データとのマージ or 上書き）
            </p>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const mode = confirm(
                  'OK でマージ（上書きなし）、キャンセルで上書き（既存データを置換）',
                )
                  ? 'merge'
                  : 'overwrite';
                await handleImport(file, mode);
                if (importRef.current) importRef.current.value = '';
              }}
            />
            <Button variant="secondary" onClick={() => importRef.current?.click()}>
              📤 JSON インポート
            </Button>
          </div>
        </div>
      </Card>

      <Card title="表示">
        <div className="flex gap-2">
          {(['auto', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSettings({ theme_mode: mode })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                settings.theme_mode === mode
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              {mode === 'auto' ? '自動' : mode === 'light' ? 'ライト' : 'ダーク'}
            </button>
          ))}
        </div>
      </Card>

      <Card
        title={`エラーログ (${errorLogs.length}件)`}
        action={
          errorLogs.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                errorLogRepository.clear();
                setErrorLogs([]);
                show('ログをクリアしました', 'success');
              }}
            >
              クリア
            </Button>
          )
        }
      >
        {errorLogs.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">エラー履歴はありません</p>
        ) : (
          <ul className="flex max-h-48 flex-col divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {errorLogs.slice(0, 10).map((log) => (
              <li key={log.log_id} className="py-2 text-xs">
                <div className="font-mono text-zinc-500 dark:text-zinc-400">
                  {log.occurred_at.slice(0, 19).replace('T', ' ')} ・ {log.category}
                </div>
                <div className="mt-0.5 text-zinc-800 dark:text-zinc-200">{log.message}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Alert variant="info">
        バージョン {APP_CONFIG.VERSION} / スキーマ {APP_CONFIG.SCHEMA_VERSION}
      </Alert>
    </div>
  );
}

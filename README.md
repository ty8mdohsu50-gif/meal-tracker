# 食事管理 (Meal Tracker)

個人用 食事管理 Web アプリ。写真から Gemini API でカロリー・PFC を推定し、日次・週次・月次で可視化する。

## 技術スタック

- React 18 / TypeScript / Vite
- Tailwind CSS / Recharts / Fuse.js / React Router
- 永続化: localStorage
- 写真認識: Google Gemini 2.5 Flash
- デプロイ: GitHub Pages（任意）

## セットアップ

```bash
# Node 20 系
corepack enable
pnpm install    # or npm install / yarn install

pnpm dev        # http://localhost:5173 で起動
pnpm typecheck  # 型チェック
pnpm build      # 本番ビルド (dist/)
pnpm preview    # ビルド結果のローカル確認
```

## 使い方

1. 初回起動で初期設定ウィザード（性別・年齢・身長・体重・活動レベル・目標）を入力
2. 設定画面から Gemini API キーを登録（任意、未登録でも検索記録は可能）
3. ダッシュボードの「+ 記録」または `/record` から食事を登録
   - 写真モード: 画像を選択 → Gemini が料理＋分量を推定 → 確認して記録
   - 検索モード: 食品名（2文字以上）で部分一致検索

## ディレクトリ構成

```
src/
├─ components/    Layout, Toast, 汎用UI
├─ contexts/      FoodsContext, SettingsContext
├─ data/          foods.json（食品マスタ）
├─ domain/        BMR/PFC/FuzzyMatcher/MealAggregator etc
├─ hooks/         useMeals / useWeights / useGoal / useApiUsage / useCustomFoods
├─ infrastructure/
│  ├─ gemini/     Gemini API クライアント＋リトライ
│  └─ storage/    localStorage Repository 群
├─ pages/         Dashboard / MealRecord / History / Weight / Settings / FoodMaster / Wizard
├─ services/      geminiService / exportService / importService / weeklyAdjustmentService
├─ types/         domain.ts
└─ utils/         date / id / base64
```

## データ

- 食品マスタ: `src/data/foods.json`（約 180 品目、起動時に一度だけロード）
- カスタム食品: localStorage
- 食事記録: `MEAL` + `MEAL_ITEM`（スナップショット方式）
- localStorage キーは `meal_tracker.*` にプレフィックス

## API キーの取り扱い

- キーはブラウザの localStorage に Base64 難読化で保存
- 送信先は `generativelanguage.googleapis.com` のみ（CSP で制限）
- エクスポートしたJSONからは API キーは除外される

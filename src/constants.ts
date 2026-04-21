import type { ActivityLevelKey, MealType, PfcPolicy } from '@/types/domain';

export const APP_CONFIG = {
  APP_NAME: '食事管理',
  VERSION: '1.0.0',
  SCHEMA_VERSION: '1.0',

  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_ENDPOINT:
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  GEMINI_DAILY_LIMIT: 237,
  GEMINI_WARNING_THRESHOLD: 0.9,
  GEMINI_TIMEOUT_MS: 15_000,
  GEMINI_MAX_RETRIES: 3,
  GEMINI_BASE_RETRY_DELAY_MS: 1000,

  IMAGE_MAX_SIZE_BYTES: 5 * 1024 * 1024,
  IMAGE_ACCEPTED_MIME: ['image/jpeg', 'image/png'] as const,

  FUZZY_THRESHOLD: 0.4,
  FUZZY_MAX_RESULTS: 3,
  FUZZY_FILTER_SCORE: 0.6,

  WEEKLY_ADJUSTMENT_MIN_SAMPLES: 3,
  WEEKLY_ADJUSTMENT_GAP_THRESHOLD_KG: 0.2,
  WEEKLY_ADJUSTMENT_KCAL_STEP: 100,

  API_USAGE_RETENTION_DAYS: 7,
  ERROR_LOG_MAX_COUNT: 30,
  ERROR_LOG_RETENTION_DAYS: 30,

  WEIGHT_MIN: 20,
  WEIGHT_MAX: 300,
  HEIGHT_MIN: 100,
  HEIGHT_MAX: 250,
  AGE_MIN: 10,
  AGE_MAX: 120,
  TARGET_KCAL_MIN: 500,
  TARGET_KCAL_MAX: 10000,
  GRAM_MIN: 0.1,
  GRAM_MAX: 5000,
} as const;

export const STORAGE_KEYS = {
  MEALS: 'meal_tracker.meals',
  MEAL_ITEMS: 'meal_tracker.meal_items',
  CUSTOM_FOODS: 'meal_tracker.custom_foods',
  WEIGHTS: 'meal_tracker.weights',
  SETTINGS: 'meal_tracker.settings',
  GOAL_HISTORY: 'meal_tracker.goal_history',
  API_USAGE: 'meal_tracker.api_usage',
  ERROR_LOGS: 'meal_tracker.error_logs',
  SCHEMA_VERSION: 'meal_tracker.schema_version',
  WEEKLY_SUGGESTION: 'meal_tracker.weekly_suggestion_dismissed',
} as const;

export const ACTIVITY_LEVELS: Record<
  ActivityLevelKey,
  { label: string; description: string; coef: number }
> = {
  sedentary: { label: '座位中心', description: 'デスクワーク中心、運動ほぼなし', coef: 1.2 },
  lightlyActive: { label: '軽い運動', description: '週1〜3日の軽い運動・散歩', coef: 1.375 },
  moderatelyActive: { label: '中程度', description: '週3〜5日の運動', coef: 1.55 },
  veryActive: { label: '活発', description: '週6〜7日の激しい運動', coef: 1.725 },
  extremelyActive: {
    label: '極めて活発',
    description: '毎日激しい運動・肉体労働',
    coef: 1.9,
  },
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

export const PFC_POLICY_CONFIG: Record<
  PfcPolicy,
  { label: string; proteinCoef: number; fatRatio: number }
> = {
  maintain: { label: '維持', proteinCoef: 1.2, fatRatio: 0.25 },
  diet: { label: 'ダイエット', proteinCoef: 1.8, fatRatio: 0.25 },
  bulk: { label: '増量', proteinCoef: 2.0, fatRatio: 0.25 },
};

export const PFC_COLORS = {
  protein: '#0ea5e9',
  fat: '#f59e0b',
  carbs: '#8b5cf6',
  kcal: '#10b981',
  weight: '#6366f1',
  target: '#9ca3af',
} as const;

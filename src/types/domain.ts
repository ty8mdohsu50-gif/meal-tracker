export type Sex = 'male' | 'female';

export type ActivityLevelKey =
  | 'sedentary'
  | 'lightlyActive'
  | 'moderatelyActive'
  | 'veryActive'
  | 'extremelyActive';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type InputMethod = 'photo' | 'search' | 'custom';
export type FoodType = 'master' | 'custom';
export type GoalChangeReason = 'manual' | 'weekly-suggestion' | 'initial';
export type ErrorCategory = 'gemini' | 'storage' | 'validation' | 'unknown';
export type ThemeMode = 'auto' | 'light' | 'dark';
export type PfcPolicy = 'maintain' | 'diet' | 'bulk';

export type Meal = {
  meal_id: string;
  recorded_at: string;
  meal_type: MealType;
  total_kcal: number;
  total_p: number;
  total_f: number;
  total_c: number;
  input_method: InputMethod;
  gemini_confidence?: number;
};

export type MealItem = {
  item_id: string;
  meal_id: string;
  food_ref_id: string;
  food_type: FoodType;
  food_name_snapshot: string;
  grams: number;
  kcal_per_100g_snapshot: number;
  p_per_100g_snapshot: number;
  f_per_100g_snapshot: number;
  c_per_100g_snapshot: number;
  calculated_kcal: number;
  calculated_p: number;
  calculated_f: number;
  calculated_c: number;
};

export type Food = {
  food_id: string;
  name: string;
  category: string;
  kcal_per_100g: number;
  p_per_100g: number;
  f_per_100g: number;
  c_per_100g: number;
};

export type CustomFood = {
  food_id: string;
  name: string;
  kcal_per_100g: number;
  p_per_100g: number;
  f_per_100g: number;
  c_per_100g: number;
  barcode?: string | null;
  created_at: string;
  updated_at: string;
};

export type Weight = {
  weight_id: string;
  recorded_date: string;
  weight_kg: number;
  body_fat_pct?: number | null;
  recorded_at: string;
};

export type Settings = {
  sex: Sex;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  activity_level_key: ActivityLevelKey;
  pfc_policy: PfcPolicy;
  protein_coef: number;
  fat_ratio: number;
  target_weight_change_per_week: number;
  target_weight_kg?: number | null;
  target_date?: string | null;
  current_body_fat_pct?: number | null;
  target_body_fat_pct?: number | null;
  current_target_kcal: number;
  current_target_p: number;
  current_target_f: number;
  current_target_c: number;
  api_key_enc: string | null;
  theme_mode: ThemeMode;
  schema_version: string;
  created_at: string;
  updated_at: string;
};

export type GoalHistory = {
  goal_id: string;
  changed_at: string;
  old_kcal: number;
  new_kcal: number;
  old_p: number;
  new_p: number;
  old_f: number;
  new_f: number;
  old_c: number;
  new_c: number;
  reason: GoalChangeReason;
};

export type ApiUsage = Record<string, number>;

export type ErrorLog = {
  log_id: string;
  occurred_at: string;
  category: ErrorCategory;
  message: string;
  stack?: string;
};

export type DishResult = {
  name: string;
  estimated_grams: number;
  confidence: number;
};

export type FoodSearchResult = {
  food: Food | CustomFood;
  foodType: FoodType;
  score: number;
};

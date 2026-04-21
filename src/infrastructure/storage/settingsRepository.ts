import { STORAGE_KEYS } from '@/constants';
import type { GoalHistory, Settings } from '@/types/domain';
import { uuid } from '@/utils/id';
import { readJson, writeJson } from './storage';

export const settingsRepository = {
  get(): Settings | null {
    return readJson<Settings | null>(STORAGE_KEYS.SETTINGS, null);
  },
  save(settings: Settings): void {
    writeJson(STORAGE_KEYS.SETTINGS, settings);
  },
  getGoalHistory(): GoalHistory[] {
    return readJson<GoalHistory[]>(STORAGE_KEYS.GOAL_HISTORY, []).sort((a, b) =>
      a.changed_at.localeCompare(b.changed_at),
    );
  },
  appendGoalHistory(entry: Omit<GoalHistory, 'goal_id'>): void {
    const all = this.getGoalHistory();
    const full: GoalHistory = { goal_id: uuid(), ...entry };
    writeJson(STORAGE_KEYS.GOAL_HISTORY, [...all, full]);
  },
  replaceAll(settings: Settings, history: GoalHistory[]): void {
    writeJson(STORAGE_KEYS.SETTINGS, settings);
    writeJson(STORAGE_KEYS.GOAL_HISTORY, history);
  },
};

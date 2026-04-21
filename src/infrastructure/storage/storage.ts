import { StorageError } from '@/domain/errors';
import { pushToFirestore } from '@/infrastructure/firebase/syncService';

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    throw new StorageError(
      e instanceof Error ? e.message : 'localStorage への書き込みに失敗しました',
    );
  }
  pushToFirestore(key, value).catch((err) => {
    window.dispatchEvent(
      new CustomEvent('meal-tracker:sync-error', { detail: String(err) }),
    );
  });
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

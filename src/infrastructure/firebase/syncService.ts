import { doc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { firestore } from './firebase';

const SYNC_KEYS = [
  'meal_tracker.meals',
  'meal_tracker.meal_items',
  'meal_tracker.custom_foods',
  'meal_tracker.weights',
  'meal_tracker.settings',
  'meal_tracker.goal_history',
  'meal_tracker.api_usage',
  'meal_tracker.error_logs',
] as const;

type SyncKey = (typeof SYNC_KEYS)[number];

function isSyncKey(key: string): key is SyncKey {
  return (SYNC_KEYS as readonly string[]).includes(key);
}

function docIdFromKey(key: string): string {
  return key.replace(/\./g, '__');
}

function userCollectionPath(uid: string): string {
  return `users/${uid}/app_data`;
}

let currentUid: string | null = null;

export function setSyncUid(uid: string | null): void {
  currentUid = uid;
}

export function getSyncUid(): string | null {
  return currentUid;
}

export async function pullAllFromFirestore(uid: string): Promise<Record<string, unknown>> {
  const snap = await getDocs(collection(firestore, userCollectionPath(uid)));
  const result: Record<string, unknown> = {};
  snap.forEach((d) => {
    const reverseKey = d.id.replace(/__/g, '.');
    const data = d.data() as { value?: unknown };
    if (data && 'value' in data) result[reverseKey] = data.value;
  });
  return result;
}

export async function pushToFirestore(key: string, value: unknown): Promise<void> {
  if (!currentUid) return;
  if (!isSyncKey(key)) return;
  const ref = doc(firestore, userCollectionPath(currentUid), docIdFromKey(key));
  await setDoc(ref, { value, updated_at: new Date().toISOString() });
}

export async function clearUserData(uid: string): Promise<void> {
  const snap = await getDocs(collection(firestore, userCollectionPath(uid)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export function syncKeys(): readonly string[] {
  return SYNC_KEYS;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  browserPopupRedirectResolver,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth, googleProvider } from '@/infrastructure/firebase/firebase';
import {
  pullAllFromFirestore,
  pushToFirestore,
  setSyncUid,
  syncKeys,
} from '@/infrastructure/firebase/syncService';

type AuthStatus = 'loading' | 'signedOut' | 'syncing' | 'ready';

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(firebaseAuth, browserPopupRedirectResolver).catch((e) => {
      if (e instanceof Error && e.message) setError(e.message);
    });
    return onAuthStateChanged(firebaseAuth, async (next) => {
      setError(null);
      if (!next) {
        setSyncUid(null);
        clearLocalSyncKeys();
        setUser(null);
        setStatus('signedOut');
        return;
      }
      setUser(next);
      setStatus('syncing');
      setSyncUid(next.uid);
      try {
        const remote = await pullAllFromFirestore(next.uid);
        const remoteHasData = Object.keys(remote).length > 0;
        const localSnapshot = snapshotLocalSyncKeys();
        const localHasData = Object.keys(localSnapshot).length > 0;

        if (remoteHasData) {
          applyRemoteToLocal(remote);
        } else if (localHasData) {
          await Promise.all(
            Object.entries(localSnapshot).map(([k, v]) => pushToFirestore(k, v)),
          );
        } else {
          applyRemoteToLocal({});
        }
        window.dispatchEvent(new Event('meal-tracker:auth-synced'));
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'データ取得に失敗しました');
        setStatus('ready');
      }
    });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    if (shouldUseRedirect()) {
      try {
        await signInWithRedirect(firebaseAuth, googleProvider);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ログインに失敗しました');
      }
      return;
    }
    try {
      await signInWithPopup(firebaseAuth, googleProvider, browserPopupRedirectResolver);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      const popupFailure =
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment';
      if (popupFailure) {
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
          return;
        } catch (e2) {
          setError(e2 instanceof Error ? e2.message : 'ログインに失敗しました');
          return;
        }
      }
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(firebaseAuth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, error, signIn, signOutUser }),
    [user, status, error, signIn, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function shouldUseRedirect(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  const isStandalone =
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIOS || isSafari || isStandalone;
}

function clearLocalSyncKeys() {
  for (const key of syncKeys()) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }
}

function snapshotLocalSyncKeys(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of syncKeys()) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      out[key] = JSON.parse(raw);
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

function applyRemoteToLocal(remote: Record<string, unknown>) {
  for (const key of syncKeys()) {
    if (key in remote) {
      try {
        localStorage.setItem(key, JSON.stringify(remote[key]));
      } catch {
        /* noop */
      }
    } else {
      try {
        localStorage.removeItem(key);
      } catch {
        /* noop */
      }
    }
  }
}

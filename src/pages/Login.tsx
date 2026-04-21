import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { signIn, error, status } = useAuth();
  const loading = status === 'loading';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-zinc-50 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3c4.5 0 7 3 7 7 0 4-3 7-7 7s-7-3-7-7c0-4 2.5-7 7-7z" />
              <path d="M12 7v6l3 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">食事管理</h1>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Google アカウントでログインすると<br />
            端末をまたいで記録が同期されます
          </p>
        </div>

        <button
          onClick={signIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Google でログイン
        </button>

        {error && (
          <div className="w-full rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
          認証情報は Google のみ、記録データは Firestore（あなた専用領域）に保存されます。
        </p>
      </div>
    </div>
  );
}

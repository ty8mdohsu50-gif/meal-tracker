import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useSettings } from '@/contexts/SettingsContext';

type NavItem = { to: string; label: string; icon: ReactNode };

const NAV: NavItem[] = [
  {
    to: '/',
    label: 'ダッシュボード',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: '/record',
    label: '記録',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: '履歴',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-6" />
      </svg>
    ),
  },
  {
    to: '/weight',
    label: '体重',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M8 12a4 4 0 0 1 8 0" />
        <path d="M12 8v4" />
      </svg>
    ),
  },
  {
    to: '/foods',
    label: '食品',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a5 5 0 0 0-5 5c0 3 3 6 3 10a2 2 0 0 0 4 0c0-4 3-7 3-10a5 5 0 0 0-5-5z" />
      </svg>
    ),
  },
  {
    to: '/learn',
    label: '学ぶ',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: '設定',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
];

export function Layout() {
  const { settings, setSettings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = settings?.theme_mode ?? 'auto';

  const cycleTheme = () => {
    const next = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto';
    setSettings((prev) => (prev ? { ...prev, theme_mode: next, updated_at: new Date().toISOString() } : prev));
  };

  const currentIndex = NAV.findIndex((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex >= 0 && currentIndex < NAV.length - 1) {
        navigate(NAV[currentIndex + 1].to);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        navigate(NAV[currentIndex - 1].to);
      }
    },
    delta: 60,
    preventScrollOnSwipe: false,
    trackMouse: false,
    swipeDuration: 500,
  });

  return (
    <div
      className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
      {...swipeHandlers}
    >
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3c4.5 0 7 3 7 7 0 4-3 7-7 7s-7-3-7-7c0-4 2.5-7 7-7z" />
                <path d="M12 7v6l3 2" />
              </svg>
            </div>
            <span className="text-sm font-bold">食事管理</span>
          </div>
          <button
            onClick={cycleTheme}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title={`テーマ: ${theme}`}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
              </svg>
            ) : theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3a9 9 0 0 0 0 18z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 pb-24 pt-5 md:pb-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-20 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-7">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

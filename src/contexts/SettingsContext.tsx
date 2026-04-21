import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { settingsRepository } from '@/infrastructure/storage/settingsRepository';
import type { Settings } from '@/types/domain';

type SettingsContextValue = {
  settings: Settings | null;
  setSettings: (updater: (prev: Settings | null) => Settings | null) => void;
  reload: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings | null>(() => settingsRepository.get());

  const reload = useCallback(() => setSettingsState(settingsRepository.get()), []);

  const setSettings = useCallback(
    (updater: (prev: Settings | null) => Settings | null) => {
      setSettingsState((prev) => {
        const next = updater(prev);
        if (next) settingsRepository.save(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    applyThemeMode(settings?.theme_mode ?? 'auto');
  }, [settings?.theme_mode]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

function applyThemeMode(mode: 'auto' | 'light' | 'dark') {
  const root = document.documentElement;
  const isDark =
    mode === 'dark' ||
    (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}

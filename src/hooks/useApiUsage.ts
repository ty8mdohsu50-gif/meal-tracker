import { useCallback, useEffect, useState } from 'react';
import { APP_CONFIG } from '@/constants';
import { apiUsageRepository } from '@/infrastructure/storage/apiUsageRepository';

const EVT = 'meal-tracker:api-usage-updated';

export function notifyApiUsageUpdated() {
  window.dispatchEvent(new Event(EVT));
}

export function useApiUsage() {
  const [todayCount, setTodayCount] = useState<number>(() => apiUsageRepository.getTodayCount());

  const reload = useCallback(() => setTodayCount(apiUsageRepository.getTodayCount()), []);

  useEffect(() => {
    window.addEventListener(EVT, reload);
    const id = setInterval(reload, 60_000);
    return () => {
      window.removeEventListener(EVT, reload);
      clearInterval(id);
    };
  }, [reload]);

  const isWarning = todayCount / APP_CONFIG.GEMINI_DAILY_LIMIT >= APP_CONFIG.GEMINI_WARNING_THRESHOLD;
  const isBlocked = todayCount >= APP_CONFIG.GEMINI_DAILY_LIMIT;
  const percent = Math.min(100, (todayCount / APP_CONFIG.GEMINI_DAILY_LIMIT) * 100);

  return {
    todayCount,
    limit: APP_CONFIG.GEMINI_DAILY_LIMIT,
    percent,
    isWarning,
    isBlocked,
    reload,
  };
}

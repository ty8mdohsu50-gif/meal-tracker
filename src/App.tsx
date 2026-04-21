import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FoodsProvider } from '@/contexts/FoodsContext';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { DashboardPage } from '@/pages/Dashboard';
import { FoodMasterPage } from '@/pages/FoodMaster';
import { HistoryPage } from '@/pages/History';
import { LoginPage } from '@/pages/Login';
import { MealRecordPage } from '@/pages/MealRecord';
import { SettingsPage } from '@/pages/Settings';
import { WeightPage } from '@/pages/Weight';
import { WizardPage } from '@/pages/Wizard';

export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <SettingsProvider>
          <FoodsProvider>
            <ToastProvider>
              <AppRouter />
            </ToastProvider>
          </FoodsProvider>
        </SettingsProvider>
      </AuthGate>
    </AuthProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <CenterMessage text="読み込み中..." />;
  }
  if (!user) {
    return <LoginPage />;
  }
  if (status === 'syncing') {
    return <CenterMessage text="データを同期中..." />;
  }
  return <>{children}</>;
}

function CenterMessage({ text }: { text: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
      {text}
    </div>
  );
}

function AppRouter() {
  const { settings } = useSettings();

  if (!settings) {
    return (
      <Routes>
        <Route path="/wizard" element={<WizardPage />} />
        <Route path="*" element={<Navigate to="/wizard" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/record" element={<MealRecordPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/foods" element={<FoodMasterPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/wizard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

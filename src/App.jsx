import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import useAppStore from './stores/useAppStore';
import useUserStore from './stores/useUserStore';
import useRelationshipStore from './stores/useRelationshipStore';
import useEventStore from './stores/useEventStore';
import useGiftStore from './stores/useGiftStore';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Relationships = lazy(() => import('./pages/Relationships'));
const RelationshipDetail = lazy(() => import('./pages/RelationshipDetail'));
const Calendar = lazy(() => import('./pages/Calendar'));
const GiftTracker = lazy(() => import('./pages/GiftTracker'));
const Settings = lazy(() => import('./pages/Settings'));
const Premium = lazy(() => import('./pages/Premium'));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          GiftMaster
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
}

function RequireOnboarding({ children }) {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);
  const location = useLocation();

  if (!isOnboardingComplete && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export default function App() {
  const isInitialized = useAppStore(s => s.isInitialized);
  const initialize = useAppStore(s => s.initialize);

  useEffect(() => {
    async function init() {
      await initialize();
      await Promise.all([
        useUserStore.getState().hydrate(),
        useRelationshipStore.getState().hydrate(),
        useEventStore.getState().hydrate(),
        useGiftStore.getState().hydrate(),
      ]);
    }
    init();
  }, [initialize]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/onboarding/:step" element={<Onboarding />} />

        <Route element={
          <RequireOnboarding>
            <AppShell />
          </RequireOnboarding>
        }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/people" element={<Relationships />} />
          <Route path="/people/:id" element={<RelationshipDetail />} />
          <Route path="/people/:id/edit" element={<RelationshipDetail />} />
          <Route path="/people/new" element={<RelationshipDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/gifts" element={<GiftTracker />} />
          <Route path="/gifts/new" element={<GiftTracker />} />
          <Route path="/gifts/:id" element={<GiftTracker />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/premium" element={<Premium />} />
          <Route path="/settings/export" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

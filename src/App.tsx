import { Suspense, lazy, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PlanGuard from './components/PlanGuard';
import { getKpIndex } from './services/noaaApi';

const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Forecast = lazy(() => import('./pages/Forecast'));
const Aurora = lazy(() => import('./pages/Aurora'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Mood = lazy(() => import('./pages/Mood'));
const Auth = lazy(() => import('./pages/Auth'));
const UV = lazy(() => import('./pages/UV'));
const SunTimes = lazy(() => import('./pages/SunTimes'));
const SkyVisibility = lazy(() => import('./pages/SkyVisibility'));
const ISS = lazy(() => import('./pages/ISS'));
// TODO: Remove when Stripe payments are live — pricing page hidden until payment system is ready
// const Pricing = lazy(() => import('./pages/Pricing'));

const LoadingFallback = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] gap-4">
      <div className="w-12 h-12 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin"></div>
      <div className="text-[#f97316] font-bold tracking-widest text-sm uppercase animate-pulse">{t('app.loading')}</div>
    </div>
  );
};

function AppRoutes() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [stormKp, setStormKp] = useState<number | null>(null);
  const isStorm = stormKp !== null && stormKp >= 5;

  useEffect(() => {
    const check = async () => {
      try {
        const data = await getKpIndex();
        if (data?.length) {
          const latest = data[data.length - 1];
          setStormKp(latest.kp_index || latest.estimated_kp || 0);
        }
      } catch { /* silent */ }
    };
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-100' : 'bg-[#0a0a1a]'}`}>
      <Navigation />
      {isStorm && (
        <div className="fixed left-0 right-0 z-40 storm-banner pulse-alert">
          <div className="bg-gradient-to-r from-[#ef4444] via-[#f97316] to-[#7c3aed] px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
              <AlertTriangle className="w-5 h-5 text-white" />
              <span className="text-white font-bold uppercase tracking-wider text-sm">
                {t('home.stormBanner')} {stormKp?.toFixed(1)}
              </span>
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      )}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={user && user.email_confirmed_at ? <Navigate to="/dashboard" replace /> : <Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/aurora" element={<PlanGuard requiredPlan="pro"><Aurora /></PlanGuard>} />
          <Route path="/alerts" element={<PlanGuard requiredPlan="pro"><Alerts /></PlanGuard>} />
          <Route path="/mood" element={<Mood />} />
          <Route path="/uv" element={<UV />} />
          <Route path="/sun" element={<SunTimes />} />
          <Route path="/sky" element={<SkyVisibility />} />
          <Route path="/iss" element={<ISS />} />
          {/* TODO: Remove when Stripe payments are live */}
          <Route path="/pricing" element={<Navigate to="/" replace />} />
          {/* <Route path="/pricing" element={<Pricing />} /> */}
        </Routes>
      </Suspense>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
      <Analytics />
      <SpeedInsights />
    </Router>
  );
}

export default App;

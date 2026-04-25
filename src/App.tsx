import { Suspense, lazy } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PlanGuard from './components/PlanGuard';
import ErrorBoundary from './components/ErrorBoundary';

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
const AuthReset = lazy(() => import('./pages/AuthReset'));
const Profile = lazy(() => import('./pages/Profile'));
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

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-100' : 'bg-[#0a0a1a]'}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#f97316] focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      <Navigation />
      <main id="main">
      <ErrorBoundary>
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
            <Route path="/auth/reset" element={<AuthReset />} />
            <Route path="/profile" element={<Profile />} />
            {/* TODO: Remove when Stripe payments are live */}
            <Route path="/pricing" element={<Navigate to="/" replace />} />
            {/* <Route path="/pricing" element={<Pricing />} /> */}
          </Routes>
        </Suspense>
      </ErrorBoundary>
      </main>
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

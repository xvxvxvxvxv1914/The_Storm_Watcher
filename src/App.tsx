import { Suspense, lazy, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter as Router, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';
import { AnimatedRoutes } from './components/AnimatedRoutes';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PlanGuard from './components/PlanGuard';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingTour from './components/OnboardingTour';

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
  const navigate = useNavigate();

  // Активиране на слайдването
  useSwipeNavigation();

  // After email confirmation Supabase lands the user back on the site with
  // #access_token=...&type=signup in the hash. Redirect them to /dashboard
  // once the session resolves instead of leaving them on the homepage.
  useEffect(() => {
    if (user?.email_confirmed_at && window.location.hash.includes('type=signup')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-100' : 'bg-[#0a0a1a]'}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#f97316] focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      <Navigation />
      <main id="main" className="pt-[env(safe-area-inset-top)]">
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <AnimatedRoutes />
        </Suspense>
      </ErrorBoundary>
      </main>
      <Footer />
      <OnboardingTour />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <ThemeProvider>
          <SettingsProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </Router>
    </HelmetProvider>
  );
}

export default App;

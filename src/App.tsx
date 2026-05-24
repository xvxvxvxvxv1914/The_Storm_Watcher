import { Suspense, useEffect, useState } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter as Router, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';
import { useKpAlert } from './hooks/useKpAlert';
import { AnimatedRoutes } from './components/AnimatedRoutes';
import Navigation from './components/Navigation';
import BottomTabBar from './components/BottomTabBar';
import Footer from './components/Footer';

import ErrorBoundary from './components/ErrorBoundary';
import HreflangTags from './components/HreflangTags';
import OnboardingTour from './components/OnboardingTour';
import ScrollToTop from './components/ScrollToTop';
import CookieConsent from './components/CookieConsent';
import InstallPrompt from './components/InstallPrompt';
import SplashAnimation from './components/SplashAnimation';
import LocationPrompt, { useLocationPromptVisible } from './components/LocationPrompt';
import KpAlertPrompt from './components/KpAlertPrompt';
import TrialBanner from './components/TrialBanner';

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
  const shouldShowLocationPrompt = useLocationPromptVisible();
  const [locationPromptDone, setLocationPromptDone] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 2600);
    return () => clearTimeout(t);
  }, []);
  useSwipeNavigation();
  useKpAlert();

  // After email confirmation Supabase lands the user back on the site with
  // #access_token=...&type=signup in the hash. Redirect them to /dashboard
  // once the session resolves instead of leaving them on the homepage.
  useEffect(() => {
    if (user?.email_confirmed_at && window.location.hash.includes('type=signup')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Block unverified email users from accessing the app
  useEffect(() => {
    if (user && !user.email_confirmed_at) {
      const path = window.location.pathname;
      if (path !== '/auth' && path !== '/auth/reset' && path !== '/privacy' && path !== '/terms') {
        navigate('/auth?verify=pending', { replace: true });
      }
    }
  }, [user, navigate]);

  // Handle deep links from iOS widget (stormwatcher://dashboard, stormwatcher://forecast)
  useEffect(() => {
    const ALLOWED_ROUTES = new Set(['dashboard','forecast','aurora','alerts','uv','sun','mood','iss','profile','settings','pricing','privacy','terms']);
    const sub = CapApp.addListener('appUrlOpen', ({ url }) => {
      try {
        const host = new URL(url).hostname;
        if (ALLOWED_ROUTES.has(host)) navigate(`/${host}`, { replace: true });
      } catch { /* ignore malformed URLs */ }
    });
    return () => { sub.then(h => h.remove()); };
  }, [navigate]);

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-100' : 'bg-[#0a0a1a]'}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#f97316] focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      <HreflangTags />
      <Navigation />
      <TrialBanner />
      <main id="main" className="pt-[env(safe-area-inset-top)] pb-24 lg:pb-0">
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <AnimatedRoutes />
        </Suspense>
      </ErrorBoundary>
      </main>
      <Footer />
      <ScrollToTop />
      <BottomTabBar />
      <CookieConsent />
      <InstallPrompt />
      <OnboardingTour />
      <SplashAnimation />
      {shouldShowLocationPrompt && !locationPromptDone && splashDone && (
        <LocationPrompt onDone={() => setLocationPromptDone(true)} />
      )}
      <KpAlertPrompt />
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

import { Suspense, useEffect, useState } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter as Router, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import * as Sentry from '@sentry/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';
import { useKpAlert } from './hooks/useKpAlert';
import { usePushNotifications } from './hooks/usePushNotifications';
import { AnimatedRoutes } from './components/AnimatedRoutes';
import Navigation from './components/Navigation';
import BottomTabBar from './components/BottomTabBar';
import Footer from './components/Footer';

import ErrorBoundary from './components/ErrorBoundary';
import HreflangTags from './components/HreflangTags';
import OfflineBanner from './components/OfflineBanner';
import OnboardingTour from './components/OnboardingTour';
import ScrollToTop from './components/ScrollToTop';
import CookieConsent from './components/CookieConsent';
import InstallPrompt from './components/InstallPrompt';
import SplashAnimation from './components/SplashAnimation';
import LocationPrompt, { useLocationPromptVisible } from './components/LocationPrompt';
import KpAlertPrompt from './components/KpAlertPrompt';
import TrialBanner from './components/TrialBanner';
import { captureReferralCode } from './utils/referral';

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
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const shouldShowLocationPrompt = useLocationPromptVisible();
  const [locationPromptDone, setLocationPromptDone] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1500);
    return () => clearTimeout(t);
  }, []);
  // Stash ?ref=CODE from the landing URL so it survives until signup.
  useEffect(() => { captureReferralCode(); }, []);
  useSwipeNavigation();
  useKpAlert();
  usePushNotifications();

  // After email confirmation Supabase lands the user back on the site with
  // #access_token=...&type=signup in the hash. Redirect them to /dashboard
  // once the session resolves instead of leaving them on the homepage.
  useEffect(() => {
    if (user?.email_confirmed_at && window.location.hash.includes('type=signup')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Set Sentry user context with plan info for better error debugging
  useEffect(() => {
    if (user) {
      Sentry.setUser({ id: user.id, plan: profile?.plan ?? 'free' });
    } else {
      Sentry.setUser(null);
    }
  }, [user, profile?.plan]);

  // Block unverified email users from accessing the app
  useEffect(() => {
    if (user && !user.email_confirmed_at) {
      const path = window.location.pathname;
      if (path !== '/auth' && path !== '/auth/reset' && path !== '/privacy' && path !== '/terms') {
        navigate('/auth?verify=pending', { replace: true });
      }
    }
  }, [user, navigate]);

  // Handle deep links — stormwatcher://dashboard, stormwatcher://alerts?kp=7, etc.
  useEffect(() => {
    const ALLOWED_ROUTES = new Set(['dashboard','forecast','aurora','alerts','uv','sun','mood','iss','profile','settings','pricing','privacy','terms','calendar','gallery','magnetic-effects']);
    const sub = CapApp.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url);
        const route = parsed.hostname;
        if (ALLOWED_ROUTES.has(route)) {
          const qs = parsed.search; // preserve ?kp=7 etc.
          navigate(`/${route}${qs}`, { replace: true });
        }
      } catch { /* ignore malformed URLs */ }
    });
    return () => { sub.then(h => h.remove()); };
  }, [navigate]);

  // Navigate from push notification tap (native)
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<string>).detail;
      if (url) navigate(url, { replace: true });
    };
    window.addEventListener('push-navigate', handler);
    return () => window.removeEventListener('push-navigate', handler);
  }, [navigate]);

  // Dispatch a custom event when app comes to foreground so data hooks can refresh
  useEffect(() => {
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) window.dispatchEvent(new CustomEvent('app-foreground'));
    });
    return () => { sub.then(h => h.remove()); };
  }, []);

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-100' : 'bg-[#0a0a1a]'}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#f97316] focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      <HreflangTags />
      <OfflineBanner />
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

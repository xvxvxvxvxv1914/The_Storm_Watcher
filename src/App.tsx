import { Suspense, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
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
import { useKpLive } from './hooks/useKpLive';
import { useKpAlert } from './hooks/useKpAlert';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useStormLiveActivity } from './hooks/useStormLiveActivity';
import { AnimatedRoutes } from './components/AnimatedRoutes';
import Navigation from './components/Navigation';
import BottomTabBar from './components/BottomTabBar';
import Footer from './components/Footer';

import ErrorBoundary from './components/ErrorBoundary';
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
import { isNative } from './utils/platform';
import { langBasename, stripLangPrefix } from './utils/langUrl';

// English lives at the root; the other 15 locales are served under a path prefix
// (`/de/sky`). Run the Router under that prefix as a basename so the existing
// non-prefixed routes match and `<Link>`s stay within the language subtree.
// Computed once at startup — switching language does a full navigation.
const ROUTER_BASENAME = langBasename(window.location.pathname);

const LoadingFallback = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
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
  const kp = useKpLive();
  const isStorm = kp !== null && kp >= 5;
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1500);
    return () => clearTimeout(t);
  }, []);
  // Stash ?ref=CODE from the landing URL so it survives until signup.
  useEffect(() => { captureReferralCode(); }, []);
  // Native app opens straight on the live dashboard — '/' is the web landing
  // page. Runs once at launch; deep links arrive later via appUrlOpen.
  useEffect(() => {
    if (isNative() && window.location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useSwipeNavigation();
  useKpAlert();
  usePushNotifications();
  useStormLiveActivity();

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
      const path = stripLangPrefix(window.location.pathname);
      if (path !== '/auth' && path !== '/auth/reset' && path !== '/privacy' && path !== '/terms') {
        navigate('/auth?verify=pending', { replace: true });
      }
    }
  }, [user, navigate]);

  // Handle deep links — stormwatcher://dashboard, stormwatcher://alerts?kp=7, etc.
  useEffect(() => {
    const ALLOWED_ROUTES = new Set(['dashboard','forecast','aurora','alerts','uv','sun','sky','mood','iss','profile','settings','pricing','privacy','terms','calendar','gallery','hunt','livestream','faq','log','aurora-map','referrals','magnetic-effects']);
    const sub = CapApp.addListener('appUrlOpen', async ({ url }) => {
      try {
        const parsed = new URL(url);
        const route = parsed.hostname;
        // OAuth return leg: Supabase redirects to
        // stormwatcher://auth-callback#access_token=…&refresh_token=…
        if (route === 'auth-callback') {
          const { Browser } = await import('@capacitor/browser');
          Browser.close().catch(() => {});
          const params = new URLSearchParams(parsed.hash.slice(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { supabase } = await import('./lib/supabase');
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (!error) navigate('/dashboard', { replace: true });
          }
          return;
        }
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
    <div className="min-h-screen" style={{ background: theme === 'light' ? '#eef2f8' : '#000008' }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#f97316] focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      <OfflineBanner />
      <Navigation />
      <TrialBanner />
      <main id="main" className="pt-[env(safe-area-inset-top)] pb-24 lg:pb-0" style={isStorm ? { paddingTop: 'calc(env(safe-area-inset-top) + 2.25rem)' } : undefined}>
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
    <MotionConfig reducedMotion="user">
    <HelmetProvider>
      <Router basename={ROUTER_BASENAME}>
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
    </MotionConfig>
  );
}

export default App;

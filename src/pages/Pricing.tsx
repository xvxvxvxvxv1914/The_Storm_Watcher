import { useState, useEffect } from 'react';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import StarField from '../components/StarField';
import { useNavigate, useLocation } from 'react-router-dom';
import { isNative } from '../utils/platform';
import { Check, Zap, Star, CreditCard, Sparkles, Smartphone, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useIAP } from '../hooks/useIAP';

type Billing = 'monthly' | 'yearly';

const PRICES = {
  pro: {
    monthly: { id: 'price_1TSKUBLh5QwxSql30JIjhhn1', amount: '€3.99' },
    yearly:  { id: 'price_1TSKUGLh5QwxSql3vXTaBCH8', amount: '€35.99' },
  },
  premium: {
    monthly: { id: 'price_1TSKUFLh5QwxSql3JjNf7s34', amount: '€7.99' },
    yearly:  { id: 'price_1TSKUBLh5QwxSql3krNLC1CB', amount: '€71.99' },
  },
};

const FREE_FEATURE_KEYS = [
  'pricing.free.feat.realtime',
  'pricing.free.feat.aurora',
  'pricing.free.feat.forecast',
  'pricing.free.feat.iss',
  'pricing.free.feat.weather',
];

const PRO_FEATURE_KEYS = [
  'pricing.pro.feat.forecasts',
  'pricing.pro.feat.visibility',
  'pricing.pro.feat.alerts',
  'pricing.pro.feat.adfree',
  'pricing.pro.feat.basics',
];

const PREMIUM_FEATURE_KEYS = [
  'pricing.premium.feat.everything',
  'pricing.premium.feat.history',
  'pricing.premium.feat.priority',
  'pricing.premium.feat.iss',
  'pricing.premium.feat.export',
  'pricing.premium.feat.earlyAccess',
];

export default function Pricing() {
  const { user, profile, session } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const [billing, setBilling] = useState<Billing>('monthly');
  const [loading, setLoading] = useState<'pro' | 'premium' | 'portal' | null>(null);
  const [error, setError] = useState('');
  const [cancelledMessage, setCancelledMessage] = useState(false);

  const iap = useIAP();

  useEffect(() => {
    // Native: stay on /pricing to show IAP UI (no redirect to home)
    if (isNative()) return;
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'cancelled') {
      setCancelledMessage(true);
      navigate('/pricing', { replace: true });
    }
  }, [location.search, navigate]);

  const currentPlan = profile?.plan ?? 'free';
  const subscriptionStatus = profile?.subscription_status;
  const hasSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isTrialing = subscriptionStatus === 'trialing';

  async function subscribe(plan: 'pro' | 'premium') {
    if (!user) { navigate('/auth', { state: { from: '/pricing' } }); return; }
    setError('');
    setLoading(plan);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      const priceId = PRICES[plan][billing].id;

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start checkout');
      if (!/^https:\/\/checkout\.stripe\.com\//.test(data.url)) throw new Error('Invalid checkout URL');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(null);
    }
  }

  async function manageSubscription() {
    setError('');
    setLoading('portal');
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to open portal');
      if (!/^https:\/\/billing\.stripe\.com\//.test(data.url)) throw new Error('Invalid portal URL');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(null);
    }
  }

  // suppress unused warning — session used implicitly via supabase.auth.getSession()
  void session;

  // ── Native IAP UI ─────────────────────────────────────────────────────────
  if (isNative()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
        style={{ background: isDark ? 'transparent' : '#eef2f8' }}
      >
        <StarField />
        <PageMeta title={`${t('pricing.title') || 'Pricing'} — The Storm Watcher`} description="" path="/pricing" noindex />
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: '#7c3aed22' }}>
            <Smartphone className="w-8 h-8" style={{ color: '#a78bfa' }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('pricing.heroTitle') || 'Choose your plan'}</h1>
          <p className="text-[#64748b] text-sm mb-8 leading-relaxed">
            {t('pricing.nativeDesc') || 'Subscriptions are managed through the App Store or Google Play. Tap a plan below to subscribe.'}
          </p>

          {/* Plan cards */}
          {(['pro', 'premium'] as const).map(plan => {
            const color = plan === 'pro' ? '#f97316' : '#7c3aed';
            const Icon = plan === 'pro' ? Zap : Star;
            const isPurchasing = iap.purchasing === iap.getProductId(plan, 'monthly') || iap.purchasing === iap.getProductId(plan, 'yearly');
            const isCurrent = currentPlan === plan;
            return (
              <div key={plan} className="glass-surface rounded-2xl p-6 mb-4 border text-left" style={{ borderColor: `${color}33` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <div className="text-white font-bold">{plan === 'pro' ? 'Pro' : 'Premium'}</div>
                    <div className="text-[#64748b] text-xs">{iap.getFallbackPrice(plan, 'monthly')} / {t('pricing.perMonth') || 'month'}</div>
                  </div>
                </div>
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-center text-sm font-bold" style={{ background: `${color}22`, color }}>
                    {t('pricing.currentPlan') || 'Current plan'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {(['monthly', 'yearly'] as const).map(billing => (
                      <button
                        key={billing}
                        onClick={() => iap.purchase(plan, billing)}
                        disabled={iap.purchasing !== null}
                        className="py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: `linear-gradient(to right, ${color}, ${plan === 'pro' ? '#fbbf24' : '#6d28d9'})` }}
                      >
                        {isPurchasing ? '…' : billing === 'monthly'
                          ? (t('pricing.monthly') || 'Monthly')
                          : `${t('pricing.yearly') || 'Yearly'} (−25%)`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {iap.error && <p className="text-red-400 text-sm mb-4">{iap.error}</p>}

          {/* Restore Purchases — required by App Store guidelines */}
          <button
            onClick={iap.restore}
            disabled={iap.purchasing !== null}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm text-[#64748b] hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            {t('pricing.restorePurchases') || 'Restore Purchases'}
          </button>

          <p className="text-[#475569] text-xs mt-4 leading-relaxed">
            {t('pricing.nativeFooter') || 'Subscriptions auto-renew unless cancelled. Manage in device Settings.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-16"
      style={{ background: isDark ? 'transparent' : '#eef2f8' }}
    >
      <StarField />
      <PageMeta
        title={`${t('pricing.title') || 'Pricing'} — The Storm Watcher`}
        description={t('pricing.metaDescription') || 'Choose your plan. Free space weather monitoring or Pro/Premium with advanced alerts and aurora forecasting.'}
        path="/pricing"
      >
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "The Storm Watcher",
          "url": "https://www.thestormwatcher.com/pricing",
          "operatingSystem": "Web, iOS, Android",
          "applicationCategory": "WeatherApplication",
          "offers": [
            {
              "@type": "Offer",
              "name": "Pro",
              "price": "3.99",
              "priceCurrency": "EUR",
              "priceValidUntil": "2027-01-01",
              "availability": "https://schema.org/InStock",
              "url": "https://www.thestormwatcher.com/pricing"
            },
            {
              "@type": "Offer",
              "name": "Premium",
              "price": "7.99",
              "priceCurrency": "EUR",
              "priceValidUntil": "2027-01-01",
              "availability": "https://schema.org/InStock",
              "url": "https://www.thestormwatcher.com/pricing"
            }
          ]
        })}</script>
      </PageMeta>
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }]} />
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">{t('pricing.heroTitle') || 'Choose your plan'}</h1>
          <p className="text-[#64748b] text-lg">{t('pricing.heroSubtitle') || 'Unlock the full power of Storm Watcher'}</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-white' : 'text-[#64748b]'}`}>{t('pricing.monthly') || 'Monthly'}</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-12 h-6 rounded-full transition-colors duration-200"
            style={{ background: billing === 'yearly' ? '#7c3aed' : '#334155' }}
          >
            <span
              className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200"
              style={{ transform: billing === 'yearly' ? 'translateX(24px)' : 'translateX(0)' }}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-white' : 'text-[#64748b]'}`}>{t('pricing.yearly') || 'Yearly'}</span>
            {/* #4ade80 on the light chip is 1.55:1 — the discount badge was the
                least readable thing in the pricing header. */}
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#15803d22', color: theme === 'light' ? '#15803d' : '#4ade80' }}
            >
              {t('pricing.save25') || 'Save 25%'}
            </span>
          </div>
        </div>

        {/* Cancelled payment notice */}
        {cancelledMessage && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl px-4 py-3 border"
            style={{ background: '#1e293b66', borderColor: '#f9731644' }}>
            <span className="text-[#94a3b8] text-sm">
              {t('payment.cancelled') || 'Payment cancelled — no charge was made. Choose a plan to continue.'}
            </span>
            <button onClick={() => setCancelledMessage(false)} className="text-[#475569] hover:text-white text-xs transition-colors flex-shrink-0">
              ✕
            </button>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Free */}
          <div
            className="glass-surface rounded-2xl p-8 border relative"
            style={{ borderColor: currentPlan === 'free' && !hasSubscription ? '#10b981' : '#10b98122' }}
          >
            {currentPlan === 'free' && !hasSubscription && (
              <span className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: '#10b98122', color: '#10b981' }}>
                {t('pricing.currentPlan') || 'Current plan'}
              </span>
            )}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#10b98122' }}>
                <Sparkles className="w-5 h-5" style={{ color: '#10b981' }} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">{t('pricing.free') || 'Free'}</div>
                <div className="text-[#64748b] text-sm">{t('pricing.free.tagline') || 'Always free'}</div>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-white">€0</span>
              <span className="text-[#64748b] text-sm ml-1">/ {t('pricing.perMonth') || 'month'}</span>
            </div>

            <ul className="space-y-3 mb-8">
              {FREE_FEATURE_KEYS.map(key => (
                <li key={key} className="flex items-center gap-3 text-sm text-[#94a3b8]">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
                  {t(key)}
                </li>
              ))}
            </ul>

            {user ? (
              currentPlan === 'free' && !hasSubscription ? (
                <div className="w-full py-3 rounded-xl font-bold text-center text-sm"
                  style={{ background: '#10b98122', color: '#10b981' }}>
                  {t('pricing.currentPlan') || 'Current plan'}
                </div>
              ) : (
                <button
                  onClick={manageSubscription}
                  disabled={loading === 'portal'}
                  className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: '#1e293b' }}
                >
                  <CreditCard className="w-4 h-4" />
                  {loading === 'portal' ? (t('pricing.loading') || 'Loading…') : (t('pricing.manageSubscription') || 'Manage subscription')}
                </button>
              )
            ) : (
              <button
                onClick={() => navigate('/auth', { state: { from: '/pricing' } })}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ background: 'linear-gradient(to right, #10b981, #14b8a6)' }}
              >
                {t('pricing.getStarted') || 'Get Started'}
              </button>
            )}
          </div>

          {/* Pro */}
          <div
            className="glass-surface rounded-2xl p-8 border relative"
            style={{ borderColor: currentPlan === 'pro' ? '#f97316' : '#f9731622' }}
          >
            {currentPlan === 'pro' && (
              <span className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: '#f9731622', color: '#f97316' }}>
                {isTrialing ? (t('trial.active') || 'Trial active') : (t('pricing.currentPlan') || 'Current plan')}
              </span>
            )}
            {!hasSubscription && (
              <span className="absolute -top-3 left-6 text-xs font-bold px-3 py-1 rounded-full text-white"
                style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}>
                {t('pricing.trialBadge') || '14-day free trial'}
              </span>
            )}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#f9731622' }}>
                <Zap className="w-5 h-5" style={{ color: '#f97316' }} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">Pro</div>
                <div className="text-[#64748b] text-sm">{t('pricing.pro.tagline') || 'For enthusiasts'}</div>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-white">{PRICES.pro[billing].amount}</span>
              <span className="text-[#64748b] text-sm ml-1">/ {billing === 'monthly' ? (t('pricing.perMonth') || 'month') : (t('pricing.perYear') || 'year')}</span>
              {billing === 'yearly' && (
                <div className="text-[#64748b] text-xs mt-1">€3.00 / {t('pricing.perMonthBilledYearly') || 'month billed annually'}</div>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {PRO_FEATURE_KEYS.map(key => (
                <li key={key} className="flex items-center gap-3 text-sm text-[#94a3b8]">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#f97316' }} />
                  {t(key)}
                </li>
              ))}
            </ul>

            {hasSubscription ? (
              <button
                onClick={manageSubscription}
                disabled={loading === 'portal'}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
              >
                <CreditCard className="w-4 h-4" />
                {loading === 'portal' ? (t('pricing.loading') || 'Loading…') : (t('pricing.manageSubscription') || 'Manage subscription')}
              </button>
            ) : (
              <button
                onClick={() => subscribe('pro')}
                disabled={loading !== null}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
              >
                {loading === 'pro'
                  ? (t('pricing.loading') || 'Loading…')
                  : (currentPlan === 'free' ? (t('pricing.tryProFree') || 'Try Pro free for 14 days') : (t('pricing.getPro') || 'Get Pro'))}
              </button>
            )}
          </div>

          {/* Premium */}
          <div
            className="glass-surface rounded-2xl p-8 border relative"
            style={{ borderColor: currentPlan === 'premium' ? '#7c3aed' : '#7c3aed22' }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-xs font-bold px-3 py-1 rounded-full text-white"
                style={{ background: 'linear-gradient(to right, #7c3aed, #6d28d9)' }}>
                {t('pricing.mostPopular') || 'Most popular'}
              </span>
            </div>

            {currentPlan === 'premium' && (
              <span className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: '#7c3aed22', color: '#a78bfa' }}>
                {t('pricing.currentPlan') || 'Current plan'}
              </span>
            )}

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#7c3aed22' }}>
                <Star className="w-5 h-5" style={{ color: '#7c3aed' }} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">Premium</div>
                <div className="text-[#64748b] text-sm">{t('pricing.premium.tagline') || 'For power users'}</div>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-white">{PRICES.premium[billing].amount}</span>
              <span className="text-[#64748b] text-sm ml-1">/ {billing === 'monthly' ? (t('pricing.perMonth') || 'month') : (t('pricing.perYear') || 'year')}</span>
              {billing === 'yearly' && (
                <div className="text-[#64748b] text-xs mt-1">€6.00 / {t('pricing.perMonthBilledYearly') || 'month billed annually'}</div>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURE_KEYS.map(key => (
                <li key={key} className="flex items-center gap-3 text-sm text-[#94a3b8]">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#7c3aed' }} />
                  {t(key)}
                </li>
              ))}
            </ul>

            {hasSubscription ? (
              <button
                onClick={manageSubscription}
                disabled={loading === 'portal'}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(to right, #7c3aed, #6d28d9)' }}
              >
                <CreditCard className="w-4 h-4" />
                {loading === 'portal' ? (t('pricing.loading') || 'Loading…') : (t('pricing.manageSubscription') || 'Manage subscription')}
              </button>
            ) : (
              <button
                onClick={() => subscribe('premium')}
                disabled={loading !== null}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #7c3aed, #6d28d9)' }}
              >
                {loading === 'premium' ? (t('pricing.loading') || 'Loading…') : (t('pricing.getPremium') || 'Get Premium')}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-center text-red-400 text-sm">{error}</p>
        )}

        <p className="text-center text-[#475569] text-xs mt-6">
          {t('pricing.footer') || 'Cancel anytime · Secure payments via Stripe · VAT may apply'}
        </p>
      </div>
    </div>
  );
}

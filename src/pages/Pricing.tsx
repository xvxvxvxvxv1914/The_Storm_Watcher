import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Star, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Billing = 'monthly' | 'yearly';

const PRICES = {
  pro: {
    monthly: { id: 'price_1TSJBmLqQEtEOCx4utzZ07gf', amount: '€3.99' },
    yearly:  { id: 'price_1TSJGvLqQEtEOCx4VGsGFSyH', amount: '€35.99' },
  },
  premium: {
    monthly: { id: 'price_1TSJHYLqQEtEOCx43ks9UAAc', amount: '€7.99' },
    yearly:  { id: 'price_1TSJHtLqQEtEOCx4Q1RuknHo', amount: '€71.99' },
  },
};

const PRO_FEATURES = [
  'Detailed geomagnetic forecasts',
  'Aurora visibility predictions',
  'Push notifications & alerts',
  'Ad-free experience',
  'All basic features',
];

const PREMIUM_FEATURES = [
  'Everything in Pro',
  'Historical data & charts',
  'Priority alerts',
  'ISS tracking (advanced)',
  'Export data',
  'Early access to new features',
];

export default function Pricing() {
  const { user, profile, session } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing>('monthly');
  const [loading, setLoading] = useState<'pro' | 'premium' | 'portal' | null>(null);
  const [error, setError] = useState('');

  const currentPlan = profile?.plan ?? 'free';
  const hasSubscription = !!profile?.stripe_customer_id && profile?.subscription_status === 'active';

  async function subscribe(plan: 'pro' | 'premium') {
    if (!user) { navigate('/auth'); return; }
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
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(null);
    }
  }

  // suppress unused warning — session used implicitly via supabase.auth.getSession()
  void session;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-16"
      style={{ background: 'radial-gradient(ellipse at top, #0d1b2a 0%, #0a0a1a 60%)' }}
    >
      <Helmet>
        <title>Pricing — The Storm Watcher</title>
        <meta name="description" content="Choose your plan. Free space weather monitoring or Pro/Premium with advanced alerts and aurora forecasting." />
        <link rel="canonical" href="https://thestormwatcher.com/pricing" />
        <meta property="og:title" content="Pricing — The Storm Watcher" />
        <meta property="og:description" content="Free space weather monitoring or Pro with advanced alerts and aurora forecasting. Choose your plan." />
        <meta property="og:url" content="https://thestormwatcher.com/pricing" />
        <meta name="twitter:title" content="Pricing — The Storm Watcher" />
        <meta name="twitter:description" content="Free space weather monitoring or Pro with advanced alerts and aurora forecasting. Choose your plan." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "The Storm Watcher Pro",
          "url": "https://thestormwatcher.com/pricing",
          "offers": { "@type": "Offer", "priceCurrency": "EUR", "availability": "https://schema.org/InStock" }
        })}</script>
      </Helmet>
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Choose your plan</h1>
          <p className="text-[#64748b] text-lg">Unlock the full power of Storm Watcher</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-white' : 'text-[#64748b]'}`}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: billing === 'yearly' ? '#7c3aed' : '#334155' }}
          >
            <span
              className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
              style={{ transform: billing === 'yearly' ? 'translateX(26px)' : 'translateX(4px)' }}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-white' : 'text-[#64748b]'}`}>Yearly</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#15803d22', color: '#4ade80' }}>
              Save 25%
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pro */}
          <div
            className="glass-surface rounded-2xl p-8 border relative"
            style={{ borderColor: currentPlan === 'pro' ? '#f97316' : '#f9731622' }}
          >
            {currentPlan === 'pro' && (
              <span className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: '#f9731622', color: '#f97316' }}>
                Current plan
              </span>
            )}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#f9731622' }}>
                <Zap className="w-5 h-5" style={{ color: '#f97316' }} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">Pro</div>
                <div className="text-[#64748b] text-sm">For enthusiasts</div>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-white">{PRICES.pro[billing].amount}</span>
              <span className="text-[#64748b] text-sm ml-1">/ {billing === 'monthly' ? 'month' : 'year'}</span>
              {billing === 'yearly' && (
                <div className="text-[#64748b] text-xs mt-1">€3.00 / month billed annually</div>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-[#94a3b8]">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#f97316' }} />
                  {f}
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
                {loading === 'portal' ? 'Loading…' : 'Manage subscription'}
              </button>
            ) : (
              <button
                onClick={() => subscribe('pro')}
                disabled={loading !== null}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
              >
                {loading === 'pro' ? 'Loading…' : 'Get Pro'}
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
                Most popular
              </span>
            </div>

            {currentPlan === 'premium' && (
              <span className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: '#7c3aed22', color: '#a78bfa' }}>
                Current plan
              </span>
            )}

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#7c3aed22' }}>
                <Star className="w-5 h-5" style={{ color: '#7c3aed' }} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">Premium</div>
                <div className="text-[#64748b] text-sm">For power users</div>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-white">{PRICES.premium[billing].amount}</span>
              <span className="text-[#64748b] text-sm ml-1">/ {billing === 'monthly' ? 'month' : 'year'}</span>
              {billing === 'yearly' && (
                <div className="text-[#64748b] text-xs mt-1">€6.00 / month billed annually</div>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-[#94a3b8]">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#7c3aed' }} />
                  {f}
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
                {loading === 'portal' ? 'Loading…' : 'Manage subscription'}
              </button>
            ) : (
              <button
                onClick={() => subscribe('premium')}
                disabled={loading !== null}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #7c3aed, #6d28d9)' }}
              >
                {loading === 'premium' ? 'Loading…' : 'Get Premium'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-center text-red-400 text-sm">{error}</p>
        )}

        <p className="text-center text-[#475569] text-xs mt-6">
          Cancel anytime · Secure payments via Stripe · VAT may apply
        </p>
      </div>
    </div>
  );
}

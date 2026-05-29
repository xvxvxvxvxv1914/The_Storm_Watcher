import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { isNative } from '../utils/platform';
import StarField from './StarField';

type Plan = 'free' | 'pro' | 'premium';

interface PlanGuardProps {
  requiredPlan: Plan;
  children: React.ReactNode;
  /** When true: renders a full-screen gate page instead of a blur overlay.
   *  Use for route-level gating (/aurora, /alerts). */
  fullPage?: boolean;
}

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 };

const PlanGuard = ({ requiredPlan, children, fullPage = false }: PlanGuardProps) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
  const userPlan: Plan = profile?.plan ?? 'free';
  const isTrialing = profile?.subscription_status === 'trialing';
  const effectivePlan: Plan = (isTrialing && PLAN_RANK[userPlan] < PLAN_RANK['pro']) ? 'pro' : userPlan;
  const hasAccess = isNative() || !paymentsEnabled || PLAN_RANK[effectivePlan] >= PLAN_RANK[requiredPlan];

  if (hasAccess) return <>{children}</>;

  const planLabel = requiredPlan === 'pro' ? 'Pro' : 'Premium';
  const gradientFrom = requiredPlan === 'pro' ? '#f97316' : '#7c3aed';
  const gradientTo = requiredPlan === 'pro' ? '#fbbf24' : '#6d28d9';

  const card = (
    <div className="glass-surface rounded-2xl p-8 sm:p-10 max-w-sm w-full mx-4 text-center border"
      style={{ borderColor: `${gradientFrom}40` }}
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: `${gradientFrom}18`, border: `1px solid ${gradientFrom}30` }}
      >
        <Lock className="w-8 h-8" style={{ color: gradientFrom }} />
      </div>

      {/* Badge */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" style={{ color: gradientFrom }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: gradientFrom }}>
          {planLabel === 'Pro' ? t('planguard.proFeature') : t('planguard.premiumFeature')}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-3">
        {t('planguard.unlockTitle')}
      </h2>

      {/* Description */}
      <p className="text-[#64748b] text-sm mb-7 leading-relaxed">
        {t('planguard.availableOn').split('Pro')[0]}
        <span className="font-semibold" style={{ color: gradientFrom }}>Pro</span>
        {t('planguard.availableOn').split('Pro')[1]?.split('Premium')[0]}
        <span className="font-semibold text-[#a78bfa]">Premium</span>
        {t('planguard.availableOn').split('Premium')[1]}
      </p>

      {/* CTA */}
      {!user ? (
        <Link
          to="/auth"
          state={{ from: location.pathname }}
          className="block w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
          style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
        >
          {t('planguard.signInUpgrade')}
        </Link>
      ) : requiredPlan === 'pro' ? (
        <>
          <Link
            to="/pricing"
            className="block w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
            style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
          >
            {t('pricing.tryProFree') || 'Try Pro free for 14 days'}
          </Link>
          <p className="text-[#475569] text-xs mt-2">{t('home.noCC') || '— no credit card required'}</p>
        </>
      ) : (
        <Link
          to="/pricing"
          className="block w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
          style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
        >
          {t('planguard.upgradePro')}
        </Link>
      )}

      {/* Back link */}
      {fullPage && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-1.5 mx-auto mt-5 text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('planguard.goBack') || 'Go back'}
        </button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 relative"
        style={{ background: 'radial-gradient(ellipse at top, #0d1b2a 0%, #0a0a1a 70%)' }}
      >
        <StarField />
        <div className="relative z-10">
          {card}
        </div>
      </div>
    );
  }

  // Inline compact lock banner (for section-level gating)
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.2 }}>
        {children}
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center z-10"
        style={{ background: 'rgba(10,10,26,0.88)' }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4 px-6 py-4 text-center sm:text-left">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${gradientFrom}18`, border: `1px solid ${gradientFrom}40` }}
          >
            <Lock className="w-5 h-5" style={{ color: gradientFrom }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">
              {planLabel === 'Pro' ? t('planguard.proFeature') : t('planguard.premiumFeature')}
            </p>
            <p className="text-[#64748b] text-xs mt-0.5">
              {t('planguard.availableOn').replace('Pro', '').replace('Premium', '').trim() || 'Upgrade to unlock this feature'}
            </p>
          </div>
          <Link
            to={user ? '/pricing' : '/auth'}
            state={user ? undefined : { from: location.pathname }}
            className="shrink-0 px-5 py-2 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 hover:shadow-lg whitespace-nowrap"
            style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
          >
            {user
              ? (requiredPlan === 'pro' ? (t('pricing.tryProFree') || 'Try Pro free') : (t('planguard.upgradePro') || 'Upgrade'))
              : (t('planguard.signInUpgrade') || 'Sign in to upgrade')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlanGuard;

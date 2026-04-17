import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Plan = 'free' | 'pro' | 'premium';

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 };

interface PlanGuardProps {
  requiredPlan: Plan;
  children: React.ReactNode;
}

const PlanGuard = ({ requiredPlan, children }: PlanGuardProps) => {
  const { user, profile } = useAuth();

  const userPlan: Plan = profile?.plan ?? 'free';
  const hasAccess = PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];

  if (hasAccess) return <>{children}</>;

  const planLabel = requiredPlan === 'pro' ? 'Pro' : 'Premium';
  const gradientFrom = requiredPlan === 'pro' ? '#f97316' : '#7c3aed';
  const gradientTo = requiredPlan === 'pro' ? '#fbbf24' : '#6d28d9';

  return (
    <div className="relative">
      {/* Blurred content underneath */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.45 }}>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(10,10,26,0.3) 0%, rgba(10,10,26,0.7) 60%, rgba(10,10,26,0.95) 100%)' }}
      >
        <div className="glass-surface rounded-2xl p-10 max-w-sm w-full mx-4 text-center border"
          style={{ borderColor: `${gradientFrom}33` }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `${gradientFrom}22` }}
          >
            <Lock className="w-7 h-7" style={{ color: gradientFrom }} />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" style={{ color: gradientFrom }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: gradientFrom }}>
              {planLabel} Feature
            </span>
          </div>

          <h2 className="text-xl font-bold text-white mb-3">
            Unlock this with Pro or Premium
          </h2>
          <p className="text-[#64748b] text-sm mb-7 leading-relaxed">
            Available on <span className="font-semibold" style={{ color: gradientFrom }}>Pro</span> and <span className="font-semibold text-[#7c3aed]">Premium</span> plans.
          </p>

          {!user ? (
            <Link
              to="/auth"
              className="block w-full py-3 rounded-lg font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`, boxShadow: `0 0 0 0 ${gradientFrom}` }}
            >
              Sign In to Upgrade
            </Link>
          ) : (
            <Link
              to="/pricing"
              className="block w-full py-3 rounded-lg font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
            >
              Upgrade to Pro or Premium
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanGuard;

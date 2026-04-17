import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-surface rounded-2xl p-12 max-w-md w-full text-center border border-[#f97316]/20">
        <div className="w-16 h-16 bg-[#f97316]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-[#f97316]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
          {requiredPlan === 'pro' ? 'Pro' : 'Premium'} Feature
        </h2>
        <p className="text-[#94a3b8] mb-8 leading-relaxed">
          This section is available on the <span className="text-[#f97316] font-semibold capitalize">{requiredPlan}</span> plan and above.
        </p>
        {!user ? (
          <Link
            to="/auth"
            className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold hover:shadow-lg hover:shadow-[#f97316]/30 transition-all"
          >
            Sign In
          </Link>
        ) : (
          <Link
            to="/pricing"
            className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold hover:shadow-lg hover:shadow-[#f97316]/30 transition-all"
          >
            Upgrade Plan
          </Link>
        )}
      </div>
    </div>
  );
};

export default PlanGuard;

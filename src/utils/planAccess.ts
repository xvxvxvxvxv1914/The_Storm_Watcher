import { FREE_ACCESS_ENABLED } from '../../supabase/functions/_shared/accessPolicy';

type Plan = 'free' | 'pro' | 'premium';

/** The launch policy takes precedence over older paid-build environment flags. */
export const arePaymentsEnabled = (): boolean =>
  !FREE_ACCESS_ENABLED && import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 };

export interface PlanAccessOpts {
  requiredPlan: Plan;
  userPlan: Plan;
  subscriptionStatus: string | null | undefined;
  referralProUntil: string | null | undefined;
  paymentsEnabled: boolean;
  native: boolean;
}

export function hasPlanAccess(opts: PlanAccessOpts): boolean {
  const { requiredPlan, userPlan, subscriptionStatus, referralProUntil, paymentsEnabled, native } = opts;
  const isTrialing = subscriptionStatus === 'trialing';
  const hasReferralPro = !!referralProUntil && new Date(referralProUntil) > new Date();
  const effectivePlan: Plan =
    (isTrialing || hasReferralPro) && PLAN_RANK[userPlan] < PLAN_RANK['pro'] ? 'pro' : userPlan;
  return native || !paymentsEnabled || PLAN_RANK[effectivePlan] >= PLAN_RANK[requiredPlan];
}

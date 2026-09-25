export type Plan = 'free' | 'pro' | 'premium';
export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 };
export function referralActive(until: string | null | undefined, now = Date.now()): boolean {
  return !!until && Date.parse(until) > now;
}
export function effectivePlan(plan: Plan, status: string | null | undefined, referralUntil: string | null | undefined, now = Date.now()): Plan {
  return (status === 'trialing' || referralActive(referralUntil, now)) && plan === 'free' ? 'pro' : plan;
}
// PostgREST equivalent of effectivePlan >= pro, evaluated at invocation time.
export const paidPlanFilter = (now = new Date()): string =>
  `plan.in.(pro,premium),subscription_status.eq.trialing,referral_pro_until.gt.${now.toISOString()}`;

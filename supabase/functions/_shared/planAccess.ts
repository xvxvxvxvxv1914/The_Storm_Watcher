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
import { FREE_ACCESS_ENABLED } from './accessPolicy.ts';


// Leave every threshold, cooldown and profile join on the original query.
// Free access removes only the subscription requirement; switching it off
// restores the same paid/trial/referral filter used before free access.
export function withPushPlanAccess<Query extends {
  or(filters: string, options: { referencedTable: string }): Query;
}>(query: Query, now = new Date(), freeAccessEnabled: boolean = FREE_ACCESS_ENABLED): Query {
  return freeAccessEnabled
    ? query
    : query.or(paidPlanFilter(now), { referencedTable: 'profiles' });
}

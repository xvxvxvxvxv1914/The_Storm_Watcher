import { useAuth } from '../contexts/AuthContext';
import { isNative } from '../utils/platform';
import { arePaymentsEnabled } from '../utils/planAccess';

/**
 * Single source of truth for plan-based access checks.
 *
 * Rules:
 * - Native apps always have full access (IAP handles billing separately)
 * - The shared free-launch policy unlocks every feature, including Premium
 * - With the launch policy off, VITE_PAYMENTS_ENABLED controls paid builds
 * - Trialing users get Pro access even if profile.plan hasn't updated yet
 */
export function usePaymentGate() {
  const { profile } = useAuth();

  const paymentsEnabled = arePaymentsEnabled();
  const plan = profile?.plan ?? 'free';
  const isTrialing = profile?.subscription_status === 'trialing';

  // Free Pro earned through the referral program (granted server-side on a
  // referred user's first payment). Active while referral_pro_until is in the future.
  const referralProUntil = profile?.referral_pro_until ?? null;
  const hasReferralPro = referralProUntil !== null && new Date(referralProUntil) > new Date();

  const native = isNative();
  const gateActive = paymentsEnabled && !native;

  const hasPro =
    !gateActive ||
    plan === 'pro' ||
    plan === 'premium' ||
    isTrialing ||
    hasReferralPro;

  const hasPremium =
    !gateActive ||
    plan === 'premium';

  return {
    plan,
    isTrialing,
    hasPro,
    hasPremium,
    hasReferralPro,
    referralProUntil,
    paymentsEnabled,
    gateActive,
  };
}

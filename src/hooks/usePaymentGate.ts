import { useAuth } from '../contexts/AuthContext';
import { isNative } from '../utils/platform';

/**
 * Single source of truth for plan-based access checks.
 *
 * Rules:
 * - Native apps always have full access (IAP handles billing separately)
 * - When VITE_PAYMENTS_ENABLED=false, all features are unlocked (dev mode)
 * - Trialing users get Pro access even if profile.plan hasn't updated yet
 */
export function usePaymentGate() {
  const { profile } = useAuth();

  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
  const plan = profile?.plan ?? 'free';
  const isTrialing = profile?.subscription_status === 'trialing';

  const native = isNative();
  const gateActive = paymentsEnabled && !native;

  const hasPro =
    !gateActive ||
    plan === 'pro' ||
    plan === 'premium' ||
    isTrialing;

  const hasPremium =
    !gateActive ||
    plan === 'premium';

  return {
    plan,
    isTrialing,
    hasPro,
    hasPremium,
    paymentsEnabled,
    gateActive,
  };
}

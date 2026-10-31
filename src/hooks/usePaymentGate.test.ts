import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePaymentGate } from './usePaymentGate';

const state = vi.hoisted(() => ({
  free: true,
  native: false,
  profile: null as null | { plan: string; subscription_status?: string; referral_pro_until?: string },
}));
vi.mock('../../supabase/functions/_shared/accessPolicy', () => ({
  get FREE_ACCESS_ENABLED() { return state.free; },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ profile: state.profile }) }));
vi.mock('../utils/platform', () => ({ isNative: () => state.native }));

beforeEach(() => {
  state.free = true;
  state.native = false;
  state.profile = null;
  vi.stubEnv('VITE_PAYMENTS_ENABLED', 'true');
});
afterEach(() => vi.unstubAllEnvs());

describe('launch access and later paid access', () => {
  it.each([null, { plan: 'free' }])('gives guests and free accounts full access during launch (%j)', profile => {
    state.profile = profile;
    const { result } = renderHook(usePaymentGate);
    expect(result.current).toMatchObject({ hasPro: true, hasPremium: true, paymentsEnabled: false, gateActive: false });
    expect(result.current.plan).toBe('free'); // access does not rewrite billing records
  });

  it('restores paid plan restrictions when launch mode ends', () => {
    state.free = false;
    state.profile = { plan: 'free' };
    const { result } = renderHook(usePaymentGate);
    expect(result.current).toMatchObject({ hasPro: false, hasPremium: false, paymentsEnabled: true, gateActive: true });
  });

  it.each(['pro', 'premium'])('keeps %s entitlements when paid access returns', plan => {
    state.free = false;
    state.profile = { plan };
    const { result } = renderHook(usePaymentGate);
    expect(result.current.hasPro).toBe(true);
    expect(result.current.hasPremium).toBe(plan === 'premium');
  });

  it.each([
    { plan: 'free', subscription_status: 'trialing' },
    { plan: 'free', referral_pro_until: '2999-01-01T00:00:00Z' },
  ])('retains trial/referral access when paid mode is restored (%j)', profile => {
    state.free = false;
    state.profile = profile;
    const { result } = renderHook(usePaymentGate);
    expect(result.current).toMatchObject({ hasPro: true, hasPremium: false });
  });

  it('keeps the existing native bypass', () => {
    state.free = false;
    state.native = true;
    const { result } = renderHook(usePaymentGate);
    expect(result.current).toMatchObject({ hasPro: true, hasPremium: true, gateActive: false });
  });
});

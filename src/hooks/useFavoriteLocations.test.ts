import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFavoriteLocations } from './useFavoriteLocations';

const state = vi.hoisted(() => ({ free: true }));
vi.mock('../../supabase/functions/_shared/accessPolicy', () => ({
  get FREE_ACCESS_ENABLED() { return state.free; },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('../utils/platform', () => ({ isNative: () => false }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));

beforeEach(() => {
  state.free = true;
  localStorage.clear();
  vi.stubEnv('VITE_PAYMENTS_ENABLED', 'true');
});
afterEach(() => vi.unstubAllEnvs());

it('lets a launch visitor save more than both old free and Pro quotas, including after reload', async () => {
  const { result, unmount } = renderHook(useFavoriteLocations);
  for (let i = 0; i < 12; i++) {
    await act(async () => { await result.current.add(`Place ${i}`, i, i); });
  }
  expect(result.current.favorites).toHaveLength(12);
  expect(result.current.isSaved(11, 11)).toBe(true);
  unmount();
  const restored = renderHook(useFavoriteLocations);
  expect(restored.result.current.favorites).toHaveLength(12);
});

it('restores the free-account quota when paid access returns', async () => {
  state.free = false;
  const { result } = renderHook(useFavoriteLocations);
  for (let i = 0; i < 4; i++) {
    await act(async () => { await result.current.add(`Place ${i}`, i, i); });
  }
  expect(result.current.favorites).toHaveLength(3);
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * The half of web push that was missing. Everything server-side was already in
 * place — table, RLS, VAPID keys, the SW push handler, and send-kp-alerts
 * querying push_subscriptions every five minutes — so the only thing between a
 * web user and a storm alert was a row that nothing ever inserted.
 */

// Captured rather than read off mock.calls, so both parameters are genuinely
// used and the assertions stay typed.
const upserted: Array<{ row: Record<string, unknown>; opts: { onConflict: string } }> = [];
const upsert = vi.fn((row: Record<string, unknown>, opts: { onConflict: string }) => {
  upserted.push({ row, opts });
  return Promise.resolve({ error: null });
});
const del = vi.fn(() => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }));
const update = vi.fn(() => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }));
vi.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ upsert, delete: del, update }) },
}));

// Mutable rather than a per-test vi.doMock: doMock registrations are NOT undone
// by resetModules or by afterEach, so the signed-out case leaked into every test
// that happened to run after it — invisible in declaration order, because the
// only test following it asserts that nothing was called. Shuffled order shows
// it at once (`--sequence.shuffle --sequence.seed=2`).
let user: { id: string } | null = { id: 'user-1' };
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));
vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      kpThreshold: 6, bzAlertsEnabled: true, bzThreshold: -12,
      preferredLat: 42.7, preferredLon: 23.3,
    },
  }),
}));
vi.mock('../utils/platform', () => ({ isNative: () => false }));
vi.mock('../utils/logger', () => ({ logError: vi.fn() }));

const subscription = {
  endpoint: 'https://push.example/abc',
  toJSON: () => ({ keys: { p256dh: 'P256', auth: 'AUTH' } }),
  getKey: () => null,
  unsubscribe: vi.fn(() => Promise.resolve(true)),
};

let existing: typeof subscription | null = null;
const pushManager = {
  getSubscription: vi.fn(() => Promise.resolve(existing)),
  subscribe: vi.fn(() => { existing = subscription; return Promise.resolve(subscription); }),
};

describe('useWebPush', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    existing = null;
    user = { id: 'user-1' };
    upserted.length = 0;
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn(() => Promise.resolve('granted')) });
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ pushManager }) } });
    vi.stubGlobal('PushManager', function () {});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('stores a subscription the cron can actually find', async () => {
    const { useWebPush } = await import('./useWebPush');
    const { result } = renderHook(() => useWebPush());

    await act(async () => { await result.current.subscribe(); });

    expect(pushManager.subscribe).toHaveBeenCalled();
    const { row, opts } = upserted[0];
    expect(row).toMatchObject({
      user_id: 'user-1',
      endpoint: 'https://push.example/abc',
      p256dh: 'P256',
      auth: 'AUTH',
      // The alert preferences must travel with it, or the cron filters on defaults.
      threshold_kp: 6,
      bz_alerts_enabled: true,
      bz_threshold: -12,
    });
    // Keyed on the unique constraint, so re-subscribing updates rather than 409s.
    expect(opts).toEqual({ onConflict: 'user_id,endpoint' });
  });

  it('reuses an existing browser subscription instead of creating a second', async () => {
    existing = subscription;
    const { useWebPush } = await import('./useWebPush');
    const { result } = renderHook(() => useWebPush());

    await act(async () => { await result.current.subscribe(); });
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalled();
  });

  it('drops the row before unsubscribing the browser', async () => {
    existing = subscription;
    const { useWebPush } = await import('./useWebPush');
    const { result } = renderHook(() => useWebPush());
    await waitFor(() => expect(result.current.subscribed).toBe(true));

    await act(async () => { await result.current.unsubscribe(); });

    // Order matters: a browser unsubscribe that lands while the delete fails
    // leaves the cron pushing at a dead endpoint until it 410s.
    expect(del).toHaveBeenCalled();
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('refuses to subscribe without a signed-in user — RLS owns the row', async () => {
    user = null;
    const { useWebPush } = await import('./useWebPush');
    const { result } = renderHook(() => useWebPush());

    await act(async () => { expect(await result.current.subscribe()).toBe(false); });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('reports unconfigured when the deployment has no VAPID key', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    vi.resetModules();
    const { useWebPush } = await import('./useWebPush');
    const { result } = renderHook(() => useWebPush());

    expect(result.current.status).toBe('unconfigured');
    expect(result.current.canSubscribe).toBe(false);
    await act(async () => { expect(await result.current.subscribe()).toBe(false); });
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });
});

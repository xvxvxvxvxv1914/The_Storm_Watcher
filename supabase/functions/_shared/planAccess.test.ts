// @vitest-environment node
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { withPushPlanAccess } from './planAccess';

const NOW = new Date('2026-10-31T12:00:00.000Z');
const CUTOFF = '2026-10-31T10:00:00.000Z';
const PROFILE_COLUMNS = 'profiles!inner(plan,subscription_status,quiet_start,quiet_end)';
const PAID_FILTER = '(plan.in.(pro,premium),subscription_status.eq.trialing,referral_pro_until.gt.2026-10-31T12:00:00.000Z)';

// Use the real PostgREST builder and inspect its outgoing request. This checks
// whether a free account would be excluded by a database selection constraint,
// while also keeping the independent alert preferences on that same request.
describe.each(['push_subscriptions', 'device_push_tokens'])('%s notification access', (table) => {
  it.each([true, false])('Kp query with free access %s retains threshold and cooldown', async (freeAccess) => {
    const fetchRequest = vi.fn<typeof fetch>(async () => new Response('[]', {
      headers: { 'Content-Type': 'application/json' },
    }));
    const supabase = createClient('https://example.supabase.co', 'test-key', {
      global: { fetch: fetchRequest },
    });
    const query = supabase.from(table).select(`id,threshold_kp,tz_offset_min,${PROFILE_COLUMNS}`)
      .lte('threshold_kp', 5)
      .or(`last_notified_at.is.null,last_notified_at.lt.${CUTOFF}`);

    const { error } = await withPushPlanAccess(query, NOW, freeAccess);
    expect(error).toBeNull();
    const input = fetchRequest.mock.calls[0][0];
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);

    expect(url.pathname).toBe(`/rest/v1/${table}`);
    expect(url.searchParams.get('threshold_kp')).toBe('lte.5');
    expect(url.searchParams.get('or')).toBe(`(last_notified_at.is.null,last_notified_at.lt.${CUTOFF})`);
    expect(url.searchParams.get('select')).toContain(PROFILE_COLUMNS);
    // With no profiles.or clause, ordinary free profiles remain eligible too.
    expect(url.searchParams.get('profiles.or')).toBe(freeAccess ? null : PAID_FILTER);
  });

  it.each([true, false])('Bz query with free access %s retains opt-in, threshold and its own cooldown', async (freeAccess) => {
    const fetchRequest = vi.fn<typeof fetch>(async () => new Response('[]', {
      headers: { 'Content-Type': 'application/json' },
    }));
    const supabase = createClient('https://example.supabase.co', 'test-key', {
      global: { fetch: fetchRequest },
    });
    const query = supabase.from(table).select(`id,bz_threshold,tz_offset_min,${PROFILE_COLUMNS}`)
      .eq('bz_alerts_enabled', true)
      .gte('bz_threshold', -8)
      .or(`last_bz_notified_at.is.null,last_bz_notified_at.lt.${CUTOFF}`);

    const { error } = await withPushPlanAccess(query, NOW, freeAccess);
    expect(error).toBeNull();
    const input = fetchRequest.mock.calls[0][0];
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);

    expect(url.pathname).toBe(`/rest/v1/${table}`);
    expect(url.searchParams.get('bz_alerts_enabled')).toBe('eq.true');
    expect(url.searchParams.get('bz_threshold')).toBe('gte.-8');
    expect(url.searchParams.get('or')).toBe(`(last_bz_notified_at.is.null,last_bz_notified_at.lt.${CUTOFF})`);
    expect(url.searchParams.get('select')).toContain(PROFILE_COLUMNS);
    expect(url.searchParams.get('profiles.or')).toBe(freeAccess ? null : PAID_FILTER);
  });
});

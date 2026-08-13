import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push';
import { BZ_SUSTAINED_MIN, sustainedBz, repairNonStandardJson, type MagRow } from './bz.ts';

const GFZ_KP_URL = 'https://kp.gfz.de/app/json/';
const NOAA_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours between alerts per subscription

interface KpEntry {
  kp_index?: number;
  estimated_kp?: number;
}

interface GfzResponse {
  datetime: string[];
  // Trailing bins are null until GFZ publishes the period.
  Kp: (number | null)[];
}

/**
 * GFZ primary, NOAA fallback — the same cascade as `getKpIndex` in
 * src/services/noaaApi.ts, KpSource.swift and KpSource.kt. This is the fourth
 * copy; see the "iOS widget data flow" section of CLAUDE.md before touching it.
 *
 * The alert body says "Kp has reached X", and the user taps through to a screen
 * reading GFZ. Sourcing X from NOAA alone made the two disagree — and worse,
 * decided whether the alert fired at all: with a threshold of 5, GFZ 5.0 against
 * NOAA 4.67 is a storm the app shows and the phone never announces. The two
 * really do differ (2026-08-06: GFZ 0.333, NOAA kp_index 0).
 */
async function fetchCurrentKp(): Promise<number> {
  const gfzEnd = new Date();
  const gfzStart = new Date(gfzEnd.getTime() - 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().split('.')[0] + 'Z';

  try {
    const url = `${GFZ_KP_URL}?start=${encodeURIComponent(iso(gfzStart))}`
      + `&end=${encodeURIComponent(iso(gfzEnd))}&index=Kp`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`GFZ ${res.status}`);
    const data: GfzResponse = await res.json();
    // Skip the bins GFZ has not published yet rather than reading them as 0 —
    // Kp 0.0 is a real ultra-quiet value and would suppress every alert.
    for (let i = (data.Kp?.length ?? 0) - 1; i >= 0; i--) {
      const kp = data.Kp[i];
      if (typeof kp === 'number' && kp >= 0) return kp;
    }
    throw new Error('GFZ returned no published bin');
  } catch (err) {
    console.warn('GFZ Kp unavailable, falling back to NOAA:', err);
  }

  const res = await fetch(NOAA_KP_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`NOAA ${res.status}`);
  const data: KpEntry[] = await res.json();
  if (data.length === 0) throw new Error('NOAA returned an empty series');
  const latest = data[data.length - 1];
  // kp_index (3-hour bin) first, matching every other surface.
  return latest.kp_index ?? latest.estimated_kp ?? 0;
}

// ── Bz early warning ─────────────────────────────────────────────────────────

const NOAA_MAG_URL = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json';

/** Sustained Bz, or null when the feed is unavailable — never blocks Kp alerts. */
async function fetchSustainedBz(): Promise<number | null> {
  try {
    const res = await fetch(NOAA_MAG_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`NOAA mag ${res.status}`);
    // Read as text and repair before parsing: NOAA emits bare NaN, which makes
    // res.json() reject the whole document and takes the early warning with it.
    const text = await res.text();
    let rows: MagRow[];
    try {
      rows = JSON.parse(text) as MagRow[];
    } catch {
      rows = JSON.parse(repairNonStandardJson(text)) as MagRow[];
    }
    return sustainedBz(rows);
  } catch (err) {
    console.warn('Bz feed unavailable, skipping early warning:', err);
    return null;
  }
}

interface QuietProfile {
  quiet_start: number | null;
  quiet_end: number | null;
}

interface PushSub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  threshold_kp: number;
  bz_alerts_enabled: boolean;
  bz_threshold: number;
  last_bz_notified_at: string | null;
  tz_offset_min: number | null;
  profiles: QuietProfile;
}

interface DeviceToken {
  id: string;
  token: string;
  platform: 'ios' | 'android';
  threshold_kp: number;
  bz_alerts_enabled: boolean;
  bz_threshold: number;
  last_notified_at: string | null;
  last_bz_notified_at: string | null;
  tz_offset_min: number | null;
  profiles: QuietProfile;
}

// True while the device-local hour falls inside the user's quiet window.
// quiet_start/quiet_end are local hours (0-23); the window may wrap midnight
// (23 → 7). tz_offset_min is minutes EAST of UTC; unknown tz → assume UTC.
function inQuietHours(p: QuietProfile | null, tzOffsetMin: number | null): boolean {
  const qs = p?.quiet_start ?? null;
  const qe = p?.quiet_end ?? null;
  if (qs === null || qe === null || qs === qe) return false;
  const localMin = ((Date.now() / 60000 + (tzOffsetMin ?? 0)) % 1440 + 1440) % 1440;
  const h = Math.floor(localMin / 60);
  return qs < qe ? h >= qs && h < qe : h >= qs || h < qe;
}

// There is deliberately NO aurora-visibility gate here. This used to carry an
// inline copy of calcAuroraVisibility (src/utils/auroraVisibility.ts) and both
// Kp passes dropped anyone it scored at 0.
//
// Two things were wrong with that. It silently overrode the one setting the user
// actually chose: after the 2026-08-13 recalibration Sofia scores 0 until Kp
// 8.33, so someone there who asked for alerts at Kp 5 would have received none —
// their threshold was overruled by a filter they never saw. And it answered a
// question these notifications do not ask: the body reads "Kp has reached X,
// above your threshold of Y", which promises a storm, not a sight of one. A
// geomagnetic storm has effects at mid-latitudes whether or not the oval is
// overhead, and this app reports them.
//
// So the threshold decides alone, and the copy of the visibility model is gone
// with it — one fewer place to keep in step with the JS. If the gate ever comes
// back it should be an explicit per-subscription opt-in ("only when it is
// visible from my location"), never an implicit override.

// ── APNs JWT helpers ─────────────────────────────────────────────────────────

async function buildApnsJWT(p8Pem: string, keyId: string, teamId: string): Promise<string> {
  const pemBody = p8Pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const header  = b64url({ alg: 'ES256', kid: keyId });
  const payload = b64url({ iss: teamId, iat: Math.floor(Date.now() / 1000) });
  const toSign  = `${header}.${payload}`;

  const sigRaw = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(toSign),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigRaw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${toSign}.${sigB64}`;
}

async function sendApns(
  deviceToken: string,
  jwt: string,
  bundleId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; gone: boolean }> {
  try {
    const res = await fetch(`https://api.push.apple.com/3/device/${deviceToken}`, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ aps: { alert: { title, body }, sound: 'default' }, ...data }),
    });
    return { ok: res.ok, gone: res.status === 410 || res.status === 400 };
  } catch {
    return { ok: false, gone: false };
  }
}

// ── FCM (Android) helpers ────────────────────────────────────────────────────

interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

// OAuth2 access token from the Firebase service account (RS256 JWT bearer grant).
async function getFcmAccessToken(sa: FcmServiceAccount): Promise<string> {
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const nowSec = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const payload = b64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSec,
    exp: nowSec + 3600,
  });
  const toSign = `${header}.${payload}`;

  const sigRaw = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(toSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigRaw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${toSign}.${sigB64}`,
    }),
  });
  if (!res.ok) throw new Error(`FCM OAuth failed: ${res.status}`);
  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

async function sendFcm(
  projectId: string,
  accessToken: string,
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ ok: boolean; gone: boolean }> {
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          data,
          android: { priority: 'HIGH', notification: { sound: 'default' } },
        },
      }),
    });
    // 404 = UNREGISTERED (token dead), 400 = invalid token format → drop it
    return { ok: res.ok, gone: res.status === 404 || res.status === 400 };
  } catch {
    return { ok: false, gone: false };
  }
}

// Storm threshold and G-level mapping mirror the client (useStormLiveActivity).
const STORM_THRESHOLD = 5;
function gLevelOf(kp: number): number {
  if (kp >= 9) return 5;
  if (kp >= 8) return 4;
  if (kp >= 7) return 3;
  if (kp >= 6) return 2;
  if (kp >= 5) return 1;
  return 0;
}

// Push an update (or end) to a storm Live Activity. Separate from sendApns
// because Live Activities use a different push type, topic and payload shape.
// content-state keys MUST match StormActivityAttributes.ContentState in Swift.
async function sendApnsLiveActivity(
  token: string,
  jwt: string,
  bundleId: string,
  kp: number,
  event: 'update' | 'end',
): Promise<{ ok: boolean; gone: boolean }> {
  const now = Math.floor(Date.now() / 1000);
  const aps: Record<string, unknown> = {
    timestamp: now,
    event,
    'content-state': { kp, gLevel: gLevelOf(kp), updatedAt: now },
  };
  if (event === 'update') aps['stale-date'] = now + 45 * 60;
  else aps['dismissal-date'] = now;

  try {
    const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': `${bundleId}.push-type.liveactivity`,
        'apns-push-type': 'liveactivity',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ aps }),
    });
    return { ok: res.ok, gone: res.status === 410 || res.status === 400 };
  } catch {
    return { ok: false, gone: false };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Guard: CRON_SECRET must be set in Edge Function secrets.
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidEmail      = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@thestormwatcher.com';

  const apnsP8Key   = Deno.env.get('APNS_PRIVATE_KEY_P8');
  const apnsKeyId   = Deno.env.get('APNS_KEY_ID');
  const apnsTeamId  = Deno.env.get('APNS_TEAM_ID');
  const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.stormwatcher.app';

  const apnsEnabled = !!(apnsP8Key && apnsKeyId && apnsTeamId);

  // Android FCM — enabled once the GOOGLE_SERVICE_ACCOUNT secret (full service
  // account JSON from Firebase Console) is configured.
  let fcmSa: FcmServiceAccount | null = null;
  const fcmSaRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
  if (fcmSaRaw) {
    try {
      fcmSa = JSON.parse(fcmSaRaw) as FcmServiceAccount;
    } catch {
      console.error('GOOGLE_SERVICE_ACCOUNT is not valid JSON — FCM disabled');
    }
  }
  const fcmEnabled = !!fcmSa;

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys not configured');
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  // 1. Fetch current Kp — GFZ primary, NOAA fallback (see fetchCurrentKp) — and
  // the sustained Bz used for the early warning. Bz is fetched alongside rather
  // than after, and its failure is non-fatal: a missing IMF feed must never stop
  // the Kp alerts, which are the ones users already rely on.
  let currentKp = 0;
  let bz: number | null = null;
  try {
    [currentKp, bz] = await Promise.all([fetchCurrentKp(), fetchSustainedBz()]);
  } catch (err) {
    console.error('Kp fetch failed:', err);
    return new Response(JSON.stringify({ error: 'Kp fetch failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
  const kpLabel = currentKp.toFixed(1);
  const now = new Date().toISOString();
  let sent = 0;
  let nativeSent = 0;

  // 2. Web push (existing push_subscriptions)
  // Only send to Pro/Premium users — push notifications are a paid feature.
  // Trialing users are also included (trialing = pro access).
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, threshold_kp, bz_alerts_enabled, bz_threshold, last_bz_notified_at, tz_offset_min, profiles!inner(plan, subscription_status, quiet_start, quiet_end)')
    .lte('threshold_kp', currentKp)
    .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownCutoff}`)
    .or('profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing', { referencedTable: 'profiles' });

  if (subsError) {
    console.error('DB query failed:', subsError.message);
  } else if (subs && subs.length > 0) {
    const expiredIds: string[] = [];

    await Promise.allSettled(
      (subs as unknown as PushSub[]).filter(sub => !inQuietHours(sub.profiles, sub.tz_offset_min)).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: `Geomagnetic Storm — Kp ${kpLabel}`,
              body: `Kp has reached ${kpLabel}, above your alert threshold of ${sub.threshold_kp}.`,
              url: '/dashboard',
              kp: currentKp,
            }),
          );
          await supabase
            .from('push_subscriptions')
            .update({ last_notified_at: now })
            .eq('id', sub.id);
          sent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            expiredIds.push(sub.id);
          } else {
            console.error(`Web push failed for ${sub.id}:`, err);
          }
        }
      })
    );

    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
    }
  }

  // 3. Native push (device_push_tokens — iOS APNs + Android FCM)
  if (apnsEnabled || fcmEnabled) {
    const { data: tokens, error: tokensError } = await supabase
      .from('device_push_tokens')
      .select('id, token, platform, threshold_kp, bz_alerts_enabled, bz_threshold, last_notified_at, last_bz_notified_at, tz_offset_min, profiles!inner(plan, subscription_status, quiet_start, quiet_end)')
      .lte('threshold_kp', currentKp)
      .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownCutoff}`)
      .or('profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing', { referencedTable: 'profiles' });

    if (tokensError) {
      console.error('Device tokens query failed:', tokensError.message);
    } else if (tokens && tokens.length > 0) {
      const eligible = (tokens as unknown as DeviceToken[]).filter(t => {
        if (t.platform === 'ios' && !apnsEnabled) return false;
        if (t.platform === 'android' && !fcmEnabled) return false;
        return !inQuietHours(t.profiles, t.tz_offset_min);
      });

      const needApns = apnsEnabled && eligible.some(t => t.platform === 'ios');
      const needFcm  = fcmEnabled  && eligible.some(t => t.platform === 'android');

      const apnsJWT = needApns ? await buildApnsJWT(apnsP8Key!, apnsKeyId!, apnsTeamId!) : null;
      let fcmToken: string | null = null;
      if (needFcm) {
        try {
          fcmToken = await getFcmAccessToken(fcmSa!);
        } catch (err) {
          console.error('FCM OAuth failed:', err);
        }
      }

      const title = `Geomagnetic Storm — Kp ${kpLabel}`;
      const expiredTokenIds: string[] = [];

      await Promise.allSettled(
        eligible.map(async (t) => {
          const body = `Kp has reached ${kpLabel}, above your threshold of ${t.threshold_kp}.`;
          let result: { ok: boolean; gone: boolean };
          if (t.platform === 'ios' && apnsJWT) {
            result = await sendApns(t.token, apnsJWT, apnsBundleId, title, body, { url: '/dashboard', kp: currentKp });
          } else if (t.platform === 'android' && fcmToken) {
            // FCM data values must be strings
            result = await sendFcm(fcmSa!.project_id, fcmToken, t.token, title, body, { url: '/dashboard', kp: String(currentKp) });
          } else {
            return;
          }
          if (result.ok) {
            await supabase
              .from('device_push_tokens')
              .update({ last_notified_at: now })
              .eq('id', t.id);
            nativeSent++;
          } else if (result.gone) {
            expiredTokenIds.push(t.id);
          }
        })
      );

      if (expiredTokenIds.length > 0) {
        await supabase.from('device_push_tokens').delete().in('id', expiredTokenIds);
      }
    }
  }

  // 4. Live Activity push-to-update (live_activity_tokens — Phase B). Keeps the
  // lock-screen storm banner fresh while the app is closed. While a storm is on
  // (Kp ≥ threshold) we update; once it passes we end the banner and drop the
  // token. No cooldown — the activity is meant to track the storm continuously.
  // Quiet hours deliberately do NOT gate Live Activity updates: they refresh an
  // existing lock-screen banner silently (no sound/wake), unlike alert pushes.
  let liveActivitySent = 0;
  if (apnsEnabled) {
    const { data: laTokens, error: laError } = await supabase
      .from('live_activity_tokens')
      .select('id, token');

    if (laError) {
      console.error('Live activity tokens query failed:', laError.message);
    } else if (laTokens && laTokens.length > 0) {
      const apnsJWT = await buildApnsJWT(apnsP8Key!, apnsKeyId!, apnsTeamId!);
      const event = currentKp >= STORM_THRESHOLD ? 'update' : 'end';
      const deadIds: string[] = [];

      await Promise.allSettled(
        (laTokens as { id: string; token: string }[]).map(async (t) => {
          const { ok, gone } = await sendApnsLiveActivity(t.token, apnsJWT, apnsBundleId, currentKp, event);
          if (ok && event === 'update') {
            await supabase.from('live_activity_tokens').update({ last_pushed_at: now }).eq('id', t.id);
            liveActivitySent++;
          } else if (gone || event === 'end') {
            // Token expired, or the storm is over and we just dismissed it.
            deadIds.push(t.id);
          }
        })
      );

      if (deadIds.length > 0) {
        await supabase.from('live_activity_tokens').delete().in('id', deadIds);
      }
    }
  }

  // 5. Bz early warning — the one alert in here that is ahead of the storm
  // rather than behind it. Kp is a 3-hour retrospective index, so a Kp alert
  // always reports a storm already under way; a sustained southward Bz precedes
  // the Kp rise by roughly 15-45 minutes.
  //
  // Deliberately separate from the Kp pass in three ways:
  //  - its own cooldown column, so an early warning cannot swallow the Kp alert
  //    for the very storm it predicted;
  //  - opt-in per subscription (bz_alerts_enabled), because this is a forecast
  //    and a user who did not ask for predictions should not get them;
  //  - wording that says "may" and names Bz, so a notification arriving while
  //    the app still shows a low Kp reads as a forecast rather than a bug.
  let bzSent = 0;

  // Thresholds are constrained to [-50, 0), so a sustained Bz that is not
  // southward can never match one — skip the two queries entirely rather than
  // asking the database five times an hour for a row that cannot exist.
  if (bz !== null && bz < 0) {
    const bzLabel = bz.toFixed(1);
    const bzCooldownCutoff = cooldownCutoff;

    const [webRes, nativeRes] = await Promise.all([
      supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth, bz_threshold, tz_offset_min, profiles!inner(plan, subscription_status, quiet_start, quiet_end)')
        .eq('bz_alerts_enabled', true)
        .gte('bz_threshold', bz)   // threshold is negative; Bz at or below it fires
        .or(`last_bz_notified_at.is.null,last_bz_notified_at.lt.${bzCooldownCutoff}`)
        .or('profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing', { referencedTable: 'profiles' }),
      (apnsEnabled || fcmEnabled)
        ? supabase
            .from('device_push_tokens')
            .select('id, token, platform, bz_threshold, tz_offset_min, profiles!inner(plan, subscription_status, quiet_start, quiet_end)')
            .eq('bz_alerts_enabled', true)
            .gte('bz_threshold', bz)
            .or(`last_bz_notified_at.is.null,last_bz_notified_at.lt.${bzCooldownCutoff}`)
            .or('profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing', { referencedTable: 'profiles' })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const title = `Aurora watch — Bz ${bzLabel} nT`;
    const body = `The interplanetary magnetic field has been southward at ${bzLabel} nT for ${BZ_SUSTAINED_MIN} minutes. `
      + `Geomagnetic activity may pick up in the next 15–45 minutes — this is a forecast, not a measured Kp reading.`;

    if (webRes.error) {
      console.error('Bz web query failed:', webRes.error.message);
    } else {
      const eligible = ((webRes.data ?? []) as unknown as PushSub[])
        .filter(s => !inQuietHours(s.profiles, s.tz_offset_min));

      await Promise.allSettled(eligible.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body, url: '/dashboard', bz }),
          );
          await supabase.from('push_subscriptions').update({ last_bz_notified_at: now }).eq('id', sub.id);
          bzSent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          // Expired endpoints are reaped by the Kp pass; don't double-delete here.
          if (status !== 410 && status !== 404) console.error(`Bz web push failed for ${sub.id}:`, err);
        }
      }));
    }

    if (nativeRes.error) {
      console.error('Bz device query failed:', nativeRes.error.message);
    } else if ((nativeRes.data ?? []).length > 0) {
      const eligible = ((nativeRes.data ?? []) as unknown as DeviceToken[]).filter(t => {
        if (t.platform === 'ios' && !apnsEnabled) return false;
        if (t.platform === 'android' && !fcmEnabled) return false;
        return !inQuietHours(t.profiles, t.tz_offset_min);
      });

      const apnsJWT = eligible.some(t => t.platform === 'ios')
        ? await buildApnsJWT(apnsP8Key!, apnsKeyId!, apnsTeamId!) : null;
      let fcmToken: string | null = null;
      if (eligible.some(t => t.platform === 'android')) {
        try { fcmToken = await getFcmAccessToken(fcmSa!); }
        catch (err) { console.error('FCM OAuth failed (Bz):', err); }
      }

      await Promise.allSettled(eligible.map(async (t) => {
        let result: { ok: boolean; gone: boolean };
        if (t.platform === 'ios' && apnsJWT) {
          result = await sendApns(t.token, apnsJWT, apnsBundleId, title, body, { url: '/dashboard', bz });
        } else if (t.platform === 'android' && fcmToken) {
          result = await sendFcm(fcmSa!.project_id, fcmToken, t.token, title, body, { url: '/dashboard', bz: String(bz) });
        } else {
          return;
        }
        if (result.ok) {
          await supabase.from('device_push_tokens').update({ last_bz_notified_at: now }).eq('id', t.id);
          bzSent++;
        }
      }));
    }
  }

  console.log(`Kp=${kpLabel} | bz=${bz ?? 'n/a'} | web=${sent} | native=${nativeSent} | bz_alerts=${bzSent} | liveActivity=${liveActivitySent} | apns=${apnsEnabled} | fcm=${fcmEnabled}`);
  return new Response(
    JSON.stringify({ sent, nativeSent, bzSent, liveActivitySent, kp: currentKp, bz, apnsEnabled, fcmEnabled }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push';

const NOAA_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours between alerts per subscription

interface KpEntry {
  kp_index?: number;
  estimated_kp?: number;
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
  lat: number | null;
  lon: number | null;
  tz_offset_min: number | null;
  profiles: QuietProfile;
}

interface DeviceToken {
  id: string;
  token: string;
  platform: 'ios' | 'android';
  threshold_kp: number;
  last_notified_at: string | null;
  lat: number | null;
  lon: number | null;
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

// Dipole-approximation aurora visibility (mirrors src/utils/auroraVisibility.ts).
// Returns 0 if aurora is not expected at this lat/lon for the given Kp.
function calcAuroraVisibility(lat: number, lon: number, kp: number): number {
  const POLE_LAT = 80.7 * (Math.PI / 180);
  const POLE_LON = -72.2 * (Math.PI / 180);
  const latR = lat * (Math.PI / 180);
  const lonR = lon * (Math.PI / 180);
  const sinGm = Math.sin(latR) * Math.sin(POLE_LAT) + Math.cos(latR) * Math.cos(POLE_LAT) * Math.cos(lonR - POLE_LON);
  const gmlat = Math.asin(Math.max(-1, Math.min(1, sinGm))) * (180 / Math.PI);
  const margin = gmlat - (67.0 - 5.3 * kp);
  return Math.round(Math.min(100, Math.max(0, (margin / 15) * 100)));
}

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

  // 1. Fetch current Kp from NOAA
  let currentKp = 0;
  try {
    const res = await fetch(NOAA_KP_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`NOAA ${res.status}`);
    const data: KpEntry[] = await res.json();
    if (data.length > 0) {
      const latest = data[data.length - 1];
      currentKp = latest.kp_index ?? latest.estimated_kp ?? 0;
    }
  } catch (err) {
    console.error('NOAA fetch failed:', err);
    return new Response(JSON.stringify({ error: 'NOAA fetch failed' }), {
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
    .select('id, endpoint, p256dh, auth, threshold_kp, lat, lon, tz_offset_min, profiles!inner(plan, subscription_status, quiet_start, quiet_end)')
    .lte('threshold_kp', currentKp)
    .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownCutoff}`)
    .or('profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing', { referencedTable: 'profiles' });

  if (subsError) {
    console.error('DB query failed:', subsError.message);
  } else if (subs && subs.length > 0) {
    const expiredIds: string[] = [];

    await Promise.allSettled(
      (subs as unknown as PushSub[]).filter(sub => {
        if (inQuietHours(sub.profiles, sub.tz_offset_min)) return false;
        if (sub.lat !== null && sub.lon !== null) {
          return calcAuroraVisibility(sub.lat, sub.lon, currentKp) > 0;
        }
        return true; // unknown location → send
      }).map(async (sub) => {
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
      .select('id, token, platform, threshold_kp, last_notified_at, lat, lon, tz_offset_min, profiles!inner(plan, subscription_status, quiet_start, quiet_end)')
      .lte('threshold_kp', currentKp)
      .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownCutoff}`)
      .or('profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing', { referencedTable: 'profiles' });

    if (tokensError) {
      console.error('Device tokens query failed:', tokensError.message);
    } else if (tokens && tokens.length > 0) {
      const eligible = (tokens as unknown as DeviceToken[]).filter(t => {
        if (t.platform === 'ios' && !apnsEnabled) return false;
        if (t.platform === 'android' && !fcmEnabled) return false;
        if (inQuietHours(t.profiles, t.tz_offset_min)) return false;
        if (t.lat !== null && t.lon !== null) {
          return calcAuroraVisibility(t.lat, t.lon, currentKp) > 0;
        }
        return true; // unknown location → send
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

  console.log(`Kp=${kpLabel} | web=${sent} | native=${nativeSent} | liveActivity=${liveActivitySent} | apns=${apnsEnabled} | fcm=${fcmEnabled}`);
  return new Response(
    JSON.stringify({ sent, nativeSent, liveActivitySent, kp: currentKp, apnsEnabled, fcmEnabled }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

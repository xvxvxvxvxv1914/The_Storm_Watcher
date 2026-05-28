import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push';

const NOAA_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours between alerts per subscription

interface KpEntry {
  kp_index?: number;
  estimated_kp?: number;
}

interface PushSub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  threshold_kp: number;
}

interface DeviceToken {
  id: string;
  token: string;
  platform: 'ios' | 'android';
  threshold_kp: number;
  last_notified_at: string | null;
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
    .select('id, endpoint, p256dh, auth, threshold_kp, profiles!inner(plan, subscription_status)')
    .lte('threshold_kp', currentKp)
    .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownCutoff}`)
    .or('profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing', { referencedTable: 'profiles' });

  if (subsError) {
    console.error('DB query failed:', subsError.message);
  } else if (subs && subs.length > 0) {
    const expiredIds: string[] = [];

    await Promise.allSettled(
      (subs as PushSub[]).map(async (sub) => {
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

  // 3. Native push (device_push_tokens — iOS APNs)
  if (apnsEnabled) {
    const { data: tokens, error: tokensError } = await supabase
      .from('device_push_tokens')
      .select('id, token, platform, threshold_kp, last_notified_at, profiles!inner(plan, subscription_status)')
      .lte('threshold_kp', currentKp)
      .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownCutoff}`)
      .or('profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing', { referencedTable: 'profiles' });

    if (tokensError) {
      console.error('Device tokens query failed:', tokensError.message);
    } else if (tokens && tokens.length > 0) {
      const apnsJWT = await buildApnsJWT(apnsP8Key!, apnsKeyId!, apnsTeamId!);
      const expiredTokenIds: string[] = [];

      await Promise.allSettled(
        (tokens as DeviceToken[]).filter(t => t.platform === 'ios').map(async (t) => {
          const { ok, gone } = await sendApns(
            t.token,
            apnsJWT,
            apnsBundleId,
            `Geomagnetic Storm — Kp ${kpLabel}`,
            `Kp has reached ${kpLabel}, above your threshold of ${t.threshold_kp}.`,
            { url: '/dashboard', kp: currentKp },
          );
          if (ok) {
            await supabase
              .from('device_push_tokens')
              .update({ last_notified_at: now })
              .eq('id', t.id);
            nativeSent++;
          } else if (gone) {
            expiredTokenIds.push(t.id);
          }
        })
      );

      if (expiredTokenIds.length > 0) {
        await supabase.from('device_push_tokens').delete().in('id', expiredTokenIds);
      }
    }
  }

  console.log(`Kp=${kpLabel} | web=${sent} | native=${nativeSent} | apns=${apnsEnabled}`);
  return new Response(
    JSON.stringify({ sent, nativeSent, kp: currentKp, apnsEnabled }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

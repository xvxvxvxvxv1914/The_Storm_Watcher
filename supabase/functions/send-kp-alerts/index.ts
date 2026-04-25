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

Deno.serve(async (req: Request) => {
  // Guard: only accept calls authenticated with the CRON_SECRET header
  // (set CRON_SECRET in Supabase Edge Function secrets, same value in cron SQL)
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidEmail = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@thestormwatcher.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys not configured');
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  // 1. Fetch current Kp index from NOAA
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

  // 2. Query eligible subscriptions
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, threshold_kp')
    .lte('threshold_kp', currentKp)
    .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownCutoff}`);

  if (subsError) {
    console.error('DB query failed:', subsError.message);
    return new Response(JSON.stringify({ error: subsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!subs || subs.length === 0) {
    return new Response(
      JSON.stringify({ sent: 0, expired: 0, kp: currentKp }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Send notifications in parallel, collect expired endpoint IDs
  const kpLabel = currentKp.toFixed(1);
  let sent = 0;
  const expiredIds: string[] = [];
  const now = new Date().toISOString();

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
          // Subscription expired or invalid — clean up
          expiredIds.push(sub.id);
        } else {
          console.error(`Push failed for ${sub.id}:`, err);
        }
      }
    })
  );

  // 4. Delete expired subscriptions
  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds);
  }

  console.log(`Kp=${kpLabel} | sent=${sent} | expired=${expiredIds.length}`);
  return new Response(
    JSON.stringify({ sent, expired: expiredIds.length, kp: currentKp }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { isNative } from '../utils/platform';
import { logError } from '../utils/logger';

/**
 * Browser push subscriptions — the half of web push that was never built.
 *
 * Everything else already existed: the `push_subscriptions` table with its RLS
 * policies, VAPID keys in the edge function, a `push` handler in src/sw.ts,
 * `VITE_VAPID_PUBLIC_KEY` wired through CI, and send-kp-alerts faithfully
 * querying the table on every run. Nothing ever called `pushManager.subscribe`,
 * so that query matched zero rows and no web user could receive a storm alert
 * with the tab closed — including the new Bz early warning.
 *
 * Native builds are excluded: they use APNs/FCM through device_push_tokens.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type WebPushStatus =
  | 'unsupported'   // no Notification/PushManager (iOS WKWebView, old browsers)
  | 'unconfigured'  // no VAPID key in this deployment — subscribing is impossible
  | 'default'       // supported, not yet asked
  | 'granted'
  | 'denied';

const supported = typeof window !== 'undefined'
  && !isNative()
  && 'Notification' in window
  && 'serviceWorker' in navigator
  && 'PushManager' in window;

/**
 * The VAPID key travels as base64url; `applicationServerKey` needs raw bytes.
 * `atob` only understands standard base64, hence the two character swaps and
 * the padding — a key ending in `-` or `_` silently decodes to garbage without
 * them, and the subscription then fails with an opaque InvalidAccessError.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  // Explicit ArrayBuffer, not the default ArrayBufferLike: applicationServerKey
  // rejects a view that might be backed by a SharedArrayBuffer.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const keyToBase64 = (buf: ArrayBuffer | null): string =>
  buf ? btoa(String.fromCharCode(...new Uint8Array(buf))) : '';

const tzOffsetMin = () => -new Date().getTimezoneOffset();

export function useWebPush() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [status, setStatus] = useState<WebPushStatus>(() => {
    if (!supported) return 'unsupported';
    if (!VAPID_PUBLIC_KEY) return 'unconfigured';
    return Notification.permission as WebPushStatus;
  });
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reflect an existing browser subscription, so the UI does not offer to
  // enable something that is already on after a reload.
  useEffect(() => {
    if (!supported || !VAPID_PUBLIC_KEY) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (!cancelled) setSubscribed(!!sub); })
      .catch(() => { /* no SW yet — treat as not subscribed */ });
    return () => { cancelled = true; };
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !VAPID_PUBLIC_KEY || !user?.id) return false;
    setBusy(true);
    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      setStatus(permission as WebPushStatus);
      if (permission !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      // Reuse an existing subscription rather than creating a second one for
      // the same browser; the endpoint is what the row is keyed on.
      const sub = await reg.pushManager.getSubscription()
        ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const p256dh = json.keys?.p256dh ?? keyToBase64(sub.getKey('p256dh'));
      const auth = json.keys?.auth ?? keyToBase64(sub.getKey('auth'));

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        threshold_kp: settings.kpThreshold,
        bz_alerts_enabled: settings.bzAlertsEnabled,
        bz_threshold: settings.bzThreshold,
        lat: settings.preferredLat,
        lon: settings.preferredLon,
        tz_offset_min: tzOffsetMin(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' });

      if (error) {
        logError('Failed to save web push subscription', error);
        return false;
      }
      setSubscribed(true);
      return true;
    } catch (err) {
      logError('Web push subscribe failed', err);
      return false;
    } finally {
      setBusy(false);
    }
  }, [user?.id, settings]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Drop the row first: a browser unsubscribe that succeeds while the
        // delete fails would leave the cron pushing to a dead endpoint until it
        // 410s. The reverse order is harmless.
        if (user?.id) {
          await supabase.from('push_subscriptions')
            .delete().eq('user_id', user.id).eq('endpoint', sub.endpoint);
        }
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      logError('Web push unsubscribe failed', err);
    } finally {
      setBusy(false);
    }
  }, [user?.id]);

  // Keep the stored preferences in step with Settings, exactly as the native
  // hook does — otherwise the cron keeps filtering on whatever was true when
  // the user first subscribed.
  useEffect(() => {
    if (!subscribed || !user?.id) return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) return;
        return supabase.from('push_subscriptions').update({
          threshold_kp: settings.kpThreshold,
          bz_alerts_enabled: settings.bzAlertsEnabled,
          bz_threshold: settings.bzThreshold,
          lat: settings.preferredLat,
          lon: settings.preferredLon,
          tz_offset_min: tzOffsetMin(),
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id).eq('endpoint', sub.endpoint);
      })
      .catch(() => { /* transient — the next settings change retries */ });
  }, [
    subscribed, user?.id,
    settings.kpThreshold, settings.bzAlertsEnabled, settings.bzThreshold,
    settings.preferredLat, settings.preferredLon,
  ]);

  return { status, subscribed, busy, subscribe, unsubscribe, canSubscribe: supported && !!VAPID_PUBLIC_KEY };
}

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Check, Loader2 } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function bufToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const isSupported =
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

const PushNotificationBell = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { settings } = useSettings();

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);
    if (Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(sub !== null))
    );
  }, []);

  // Keep threshold in DB in sync when user changes it in Settings
  useEffect(() => {
    if (!subscribed || !user) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) return;
        supabase
          .from('push_subscriptions')
          .update({ threshold_kp: settings.kpThreshold })
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint);
      });
  }, [settings.kpThreshold, subscribed, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY || !user) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const p256dh = bufToBase64Url(sub.getKey('p256dh')!);
      const auth = bufToBase64Url(sub.getKey('auth')!);

      await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh,
          auth,
          threshold_kp: settings.kpThreshold,
        },
        { onConflict: 'user_id,endpoint' }
      );

      track('push_enabled', { kp_threshold: settings.kpThreshold });
      setSubscribed(true);
    } catch {
      // Permission denied or browser blocked — state already reflects this
    } finally {
      setLoading(false);
    }
  }, [user, settings.kpThreshold]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint);
      }
      track('push_disabled');
      setSubscribed(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  if (!isSupported || !VAPID_PUBLIC_KEY) return null;

  const isDenied = permission === 'denied';

  const handleClick = () => {
    if (loading || isDenied) return;
    if (!user) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }
    if (subscribed) unsubscribe();
    else subscribe();
  };

  const tooltip = !user
    ? (t('push.signInRequired') || 'Sign in to enable storm alerts')
    : subscribed
    ? t('push.enabled')
    : isDenied
    ? t('push.denied')
    : t('push.enable');

  return (
    <div data-tour="push-bell" className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isDenied || loading}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          subscribed
            ? 'text-[#10b981] bg-[#10b981]/10'
            : isDenied
            ? 'text-[#94a3b8] cursor-not-allowed opacity-50'
            : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
        }`}
        aria-label={tooltip}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : subscribed ? (
          <><Bell className="w-4 h-4" /><Check className="w-3 h-3" /></>
        ) : isDenied ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-10 w-56 glass-surface rounded-xl px-3 py-2 text-xs text-[#94a3b8] border border-white/10 z-50 pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default PushNotificationBell;

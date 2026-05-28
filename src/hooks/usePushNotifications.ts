import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { isIos } from '../utils/platform';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { logError } from '../utils/logger';

async function saveToken(userId: string, token: string, platform: string, thresholdKp: number) {
  const { error } = await supabase
    .from('device_push_tokens')
    .upsert(
      { user_id: userId, token, platform, threshold_kp: thresholdKp, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );
  if (error) logError('Failed to save push token', error);
}

export function usePushNotifications() {
  const { user, profile } = useAuth();
  const { settings } = useSettings();

  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
  const plan = profile?.plan ?? 'free';
  const isTrialing = profile?.subscription_status === 'trialing';
  const hasPro = !paymentsEnabled || plan === 'pro' || plan === 'premium' || isTrialing;

  useEffect(() => {
    if (!isIos()) return;
    // Push notifications are a Pro feature — skip registration for free users
    if (!hasPro) return;

    let registered = false;

    async function register() {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') return;

      await PushNotifications.register();
      registered = true;
    }

    const tokenListener = PushNotifications.addListener('registration', async ({ value: token }) => {
      if (!user?.id) return;
      const platform = /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'android';
      await saveToken(user.id, token, platform, settings.kpThreshold);
    });

    const errorListener = PushNotifications.addListener('registrationError', ({ error }) => {
      logError('Push registration error', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // App is in foreground — the notification arrived silently.
      // Dispatch a custom event so UI can optionally show an in-app banner.
      window.dispatchEvent(new CustomEvent('push-notification', { detail: notification }));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = (action.notification.data as Record<string, string>)?.url;
      if (url && url.startsWith('/')) {
        window.dispatchEvent(new CustomEvent('push-navigate', { detail: url }));
      }
    });

    register().catch((err) => logError('Push register failed', err));

    return () => {
      if (registered) {
        tokenListener.then(h => h.remove());
        errorListener.then(h => h.remove());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasPro]);

  // Sync threshold change to all existing device tokens in DB
  useEffect(() => {
    if (!isIos() || !user?.id) return;
    supabase
      .from('device_push_tokens')
      .update({ threshold_kp: settings.kpThreshold, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .then(({ error }) => { if (error) logError('Failed to sync push threshold', error); });
  }, [user?.id, settings.kpThreshold]);
}

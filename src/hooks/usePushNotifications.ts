import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from '../utils/platform';
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
  const { user } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    if (!isNative()) return;

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
  }, [user?.id]);
}

import { useEffect, useRef } from 'react';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { getKpIndex } from '../services/noaaApi';
import { useSettings } from '../contexts/SettingsContext';
import { calcAuroraVisibility } from '../utils/auroraVisibility';

const POLL_MS = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours between alerts
const COOLDOWN_KEY = 'tsw_kp_alert_last';

// iOS WKWebView does not implement the Web Notification API — guard every access.
const isWebNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;

export function useKpAlert() {
  const { settings } = useSettings();
  const thresholdRef = useRef(settings.kpThreshold);
  const latRef = useRef(settings.preferredLat);
  const lonRef = useRef(settings.preferredLon);

  useEffect(() => {
    thresholdRef.current = settings.kpThreshold;
    latRef.current = settings.preferredLat;
    lonRef.current = settings.preferredLon;
  }, [settings.kpThreshold, settings.preferredLat, settings.preferredLon]);

  useEffect(() => {
    if (!isWebNotificationSupported) return;
    if (Notification.permission !== 'granted') return;

    const check = async () => {
      const last = parseInt(localStorage.getItem(COOLDOWN_KEY) ?? '0', 10);
      if (Date.now() - last < COOLDOWN_MS) return;

      try {
        const entries = await getKpIndex();
        if (!entries.length) return;
        const kp = entries[entries.length - 1].kp_index ?? 0;
        if (kp < thresholdRef.current) return;

        // Skip if aurora has 0% visibility at the user's saved location
        const lat = latRef.current;
        const lon = lonRef.current;
        if (lat !== null && lon !== null && calcAuroraVisibility(lat, lon, kp) === 0) return;

        const gLevel = kp >= 9 ? 5 : kp >= 8 ? 4 : kp >= 7 ? 3 : kp >= 6 ? 2 : 1;
        new Notification(`🌌 Geomagnetic Storm — G${gLevel} (Kp ${kp.toFixed(1)})`, {
          body: `Kp index has reached ${kp.toFixed(1)}, above your alert threshold of ${thresholdRef.current}.`,
          icon: '/icons/icon-192.png',
          tag: 'kp-alert',
        });
        Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
        localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
      } catch {
        // silent — network issues shouldn't crash the app
      }
    };

    check();
    const interval = setInterval(check, POLL_MS);
    return () => clearInterval(interval);
  }, []);
}

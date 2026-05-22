import { useEffect, useRef } from 'react';
import { getKpIndex } from '../services/noaaApi';
import { useSettings } from '../contexts/SettingsContext';

const POLL_MS = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours between alerts
const COOLDOWN_KEY = 'tsw_kp_alert_last';

export function useKpAlert() {
  const { settings } = useSettings();
  const thresholdRef = useRef(settings.kpThreshold);

  useEffect(() => {
    thresholdRef.current = settings.kpThreshold;
  }, [settings.kpThreshold]);

  useEffect(() => {
    if (Notification.permission !== 'granted') return;

    const check = async () => {
      const last = parseInt(localStorage.getItem(COOLDOWN_KEY) ?? '0', 10);
      if (Date.now() - last < COOLDOWN_MS) return;

      try {
        const entries = await getKpIndex();
        if (!entries.length) return;
        const kp = entries[entries.length - 1].kp_index ?? 0;
        if (kp < thresholdRef.current) return;

        const gLevel = kp >= 9 ? 5 : kp >= 8 ? 4 : kp >= 7 ? 3 : kp >= 6 ? 2 : 1;
        new Notification(`🌌 Geomagnetic Storm — G${gLevel} (Kp ${kp.toFixed(1)})`, {
          body: `Kp index has reached ${kp.toFixed(1)}, above your alert threshold of ${thresholdRef.current}.`,
          icon: '/icons/icon-192.png',
          tag: 'kp-alert',
        });
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

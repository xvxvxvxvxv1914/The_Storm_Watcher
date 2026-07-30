import { useEffect, useState } from 'react';
import { Bell, X, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getKpIndex } from '../services/noaaApi';
import { isNative } from '../utils/platform';

const DISMISSED_KEY = 'tsw_kp_prompt_dismissed';
const PROMPT_KP_THRESHOLD = 4;
const CHECK_MS = 3 * 60 * 1000; // check every 3 minutes

const isSupported = !isNative() && typeof window !== 'undefined' && 'Notification' in window;

export default function KpAlertPrompt() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [kp, setKp] = useState<number | null>(null);

  useEffect(() => {
    if (!isSupported) return;
    if (Notification.permission !== 'default') return; // already granted or denied
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const check = async () => {
      try {
        const entries = await getKpIndex();
        if (!entries.length) return;
        const current = entries[entries.length - 1].kp_index ?? 0;
        if (current >= PROMPT_KP_THRESHOLD) {
          setKp(current);
          setVisible(true);
        }
      } catch { /* silent */ }
    };

    check();
    const interval = setInterval(check, CHECK_MS);
    return () => clearInterval(interval);
  }, []);

  const handleEnable = async () => {
    if (!isSupported) { setVisible(false); return; }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      const title = t('push.grantedTitle') || '🌌 Storm alerts enabled';
      const options: NotificationOptions = {
        body: t('push.grantedMsg') || "You'll receive alerts when Kp crosses your threshold.",
        icon: '/icons/icon-192.png',
        tag: 'kp-enabled',
      };
      // Android Chrome (and others) throw "Illegal constructor" on `new
      // Notification()` even with permission — the only supported path there is
      // ServiceWorkerRegistration.showNotification(). Prefer the SW, fall back to
      // the constructor for browsers without one, and never let it throw.
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      } catch {
        /* confirmation toast is best-effort; permission is already granted */
      }
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-md animate-slide-up">
      <div className="glass-surface border border-[#f97316]/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
        <div className="w-9 h-9 rounded-xl bg-[#f97316]/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-[#f97316]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">
            {t('push.prompt.title') || 'Geomagnetic activity rising'}
          </p>
          <p className="text-[#94a3b8] text-xs mt-0.5">
            {kp !== null
              ? (t('push.prompt.body') || 'Kp is at {kp} — want an alert if a storm hits?').replace('{kp}', kp.toFixed(1))
              : (t('push.prompt.bodyGeneric') || 'Want an alert when a storm hits?')}
          </p>
        </div>

        <button
          onClick={handleEnable}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold transition-colors flex-shrink-0"
        >
          <Bell className="w-3.5 h-3.5" />
          {t('push.prompt.enable') || 'Notify me'}
        </button>

        <button
          onClick={handleDismiss}
          className="text-[#475569] hover:text-white transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

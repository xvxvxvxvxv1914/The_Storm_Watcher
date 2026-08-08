import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebPush } from '../hooks/useWebPush';
import { isNative } from '../utils/platform';

const isSupported =
  !isNative() && typeof window !== 'undefined' && 'Notification' in window;

const PushNotificationBell = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { subscribed, busy, subscribe, unsubscribe, canSubscribe } = useWebPush();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (isSupported) setPermission(Notification.permission);
  }, []);

  const handleClick = useCallback(async () => {
    if (!isSupported || permission === 'denied' || busy) return;

    // Granting permission alone only enables the in-tab alert (useKpAlert).
    // Real push — alerts with the tab closed, including the Bz early warning —
    // needs a browser subscription stored server-side, which requires a signed-in
    // user because the row is owned by auth.uid() under RLS.
    if (canSubscribe && user?.id) {
      if (subscribed) await unsubscribe();
      else await subscribe();
      setPermission(Notification.permission);
      return;
    }

    if (permission === 'granted') {
      // Can't programmatically revoke — guide user
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
  }, [permission, busy, canSubscribe, user?.id, subscribed, subscribe, unsubscribe]);

  if (!isSupported) return null;

  const isDenied = permission === 'denied';
  const isEnabled = permission === 'granted';

  // Two different promises, and the bell must not overstate which one is live:
  // a stored subscription means alerts arrive with the tab closed, permission
  // alone means only while it is open, and without a signed-in user no
  // subscription can exist at all (the row is owned by auth.uid() under RLS).
  // All three strings already existed in all 16 locales from an earlier design;
  // push.signInRequired had never been wired up to anything.
  const tooltip = subscribed
    ? (t('push.subscribed') || 'Click to unsubscribe')
    : canSubscribe && !user?.id
    ? (t('push.signInRequired') || 'Sign in to enable storm alerts')
    : isEnabled
    ? (t('push.enabled') || 'Storm alerts enabled — alerts fire while this tab is open')
    : isDenied
    ? (t('push.denied') || 'Notifications blocked — enable in browser settings')
    : (t('push.enable') || 'Enable storm alerts');

  return (
    <div data-tour="push-bell" className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isDenied}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isEnabled
            ? 'text-[#10b981] bg-[#10b981]/10'
            : isDenied
            ? 'text-[#94a3b8] cursor-not-allowed opacity-50'
            : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
        }`}
        aria-label={tooltip}
      >
        {isEnabled ? (
          <><Bell className="w-4 h-4" /><Check className="w-3 h-3" /></>
        ) : isDenied ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-10 w-60 glass-surface rounded-xl px-3 py-2 text-xs text-[#94a3b8] border border-white/10 z-50 pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default PushNotificationBell;

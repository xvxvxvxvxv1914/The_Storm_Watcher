import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { isNative } from '../utils/platform';

const isSupported =
  !isNative() && typeof window !== 'undefined' && 'Notification' in window;

const PushNotificationBell = () => {
  const { t } = useLanguage();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (isSupported) setPermission(Notification.permission);
  }, []);

  const handleClick = useCallback(async () => {
    if (!isSupported || permission === 'denied') return;

    if (permission === 'granted') {
      // Can't programmatically revoke — guide user
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
  }, [permission]);

  if (!isSupported) return null;

  const isDenied = permission === 'denied';
  const isEnabled = permission === 'granted';

  const tooltip = isEnabled
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

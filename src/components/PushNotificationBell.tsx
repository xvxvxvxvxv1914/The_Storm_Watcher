import { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';

const PushNotificationBell = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Браузърът ти не поддържа известия.');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      new Notification('The Storm Watcher', {
        body: 'Ще получаваш известия при силни геомагнитни бури!',
        icon: '/favicon.svg',
      });
    }
  };

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';

  return (
    <div className="relative">
      <button
        onClick={isDenied ? undefined : requestPermission}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isGranted
            ? 'text-[#10b981] bg-[#10b981]/10'
            : isDenied
            ? 'text-[#94a3b8] cursor-not-allowed opacity-50'
            : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
        }`}
        disabled={isDenied}
      >
        {isGranted ? (
          <><Bell className="w-4 h-4" /><Check className="w-3 h-3" /></>
        ) : isDenied ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-10 w-52 glass-surface rounded-xl px-3 py-2 text-xs text-[#94a3b8] border border-white/10 z-50 pointer-events-none">
          {isGranted
            ? 'Известията са включени'
            : isDenied
            ? 'Известията са блокирани в браузъра'
            : 'Включи известия за бури'}
        </div>
      )}
    </div>
  );
};

export default PushNotificationBell;

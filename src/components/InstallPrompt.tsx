import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISSED_KEY = 'tsw_install_dismissed_at';
const COOLDOWN_DAYS = 14;

export default function InstallPrompt() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Inside Capacitor / standalone PWA — no prompt needed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ('Capacitor' in window) return;

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? '0');
    const cooldown = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (dismissedAt && Date.now() - dismissedAt < cooldown) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Delay 20s so we don't interrupt initial impression
      setTimeout(() => setVisible(true), 20_000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferred(null);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible || !deferred) return null;

  const isDark = theme === 'dark';

  return (
    <div
      className="fixed left-4 right-4 z-[80] pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
    >
      <div
        className="pointer-events-auto max-w-sm mx-auto rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: isDark ? 'rgba(10,10,26,0.92)' : 'rgba(248,250,252,0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 12px 40px -8px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.4s ease-out',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)' }}
        >
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('install.title') || 'Install Storm Watcher'}
          </div>
          <div className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
            {t('install.subtitle') || 'Get instant aurora alerts'}
          </div>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-2 rounded-lg text-xs font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}
        >
          {t('install.button') || 'Install'}
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isDark ? 'bg-white/8 text-white/60' : 'bg-black/6 text-slate-500'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

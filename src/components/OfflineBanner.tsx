import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function OfflineBanner() {
  const { t } = useLanguage();
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-slate-800 border-b border-slate-600 px-4 py-2 text-xs text-slate-200">
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
      <span>{t('offline.banner') || 'No internet connection — showing cached data'}</span>
    </div>
  );
}

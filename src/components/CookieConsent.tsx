import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { isNative } from '../utils/platform';

const CookieConsent = () => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Native apps declare data use via the App Store / Play privacy labels, not
    // a web cookie banner — showing it in-app looks out of place and eats the
    // bottom of every screen until dismissed.
    if (isNative()) return;
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Small delay so it doesn't flash on first paint
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-fade-in">
      <div className="glass-surface rounded-2xl border border-white/10 p-5 shadow-2xl shadow-black/40">
        <p className="text-[#94a3b8] text-sm leading-relaxed mb-4">
          {t('cookie.message')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={accept}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:scale-105 transition-transform"
          >
            {t('cookie.accept')}
          </button>
          <button
            onClick={accept}
            className="px-4 py-2.5 glass-surface text-[#94a3b8] rounded-xl text-sm font-bold uppercase tracking-wider border border-white/10 hover:text-white transition-colors"
          >
            {t('cookie.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

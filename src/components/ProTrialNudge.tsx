import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const DISMISS_KEY = 'tsw_trial_nudge_dismissed';
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function isDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  return Date.now() - parseInt(raw, 10) < DISMISS_TTL;
}

const PRO_HIGHLIGHTS = [
  'pricing.pro.feat.forecasts',
  'pricing.pro.feat.alerts',
  'pricing.pro.feat.adfree',
];

export default function ProTrialNudge() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(isDismissed);

  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

  // Show only for logged-in free users with no subscription history
  const shouldShow =
    paymentsEnabled &&
    user &&
    !dismissed &&
    profile !== null &&
    profile.plan === 'free' &&
    !profile.subscription_status;

  if (!shouldShow) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  return (
    <div
      className="rounded-2xl p-5 border mb-6 relative"
      style={{ background: 'linear-gradient(135deg, #f9731608 0%, #7c3aed08 100%)', borderColor: '#f9731630' }}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-[#475569] hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: '#f9731618' }}
        >
          <Sparkles className="w-5 h-5" style={{ color: '#f97316' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-sm">
              {t('trial.nudge.title') || 'Unlock Pro — Free for 14 Days'}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#f9731622', color: '#f97316' }}
            >
              {t('pricing.trialBadge') || '14-day free trial'}
            </span>
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {PRO_HIGHLIGHTS.map(key => (
              <li key={key} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#f97316' }} />
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Link
              to="/pricing"
              className="text-xs font-bold px-4 py-1.5 rounded-full text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
            >
              {t('trial.nudge.cta') || 'Start free trial'}
            </Link>
            <button
              onClick={dismiss}
              className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              {t('trial.nudge.dismiss') || 'Maybe later'}
            </button>
            <span className="text-xs text-[#334155]">
              {t('home.noCC') || '— no credit card required'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

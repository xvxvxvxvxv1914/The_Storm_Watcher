import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function TrialBanner() {
  const { profile } = useAuth();
  const { t } = useLanguage();

  if (profile?.subscription_status !== 'trialing') return null;

  const periodEnd = profile.subscription_period_end;
  const daysLeft = periodEnd
    ? Math.max(0, Math.ceil((new Date(periodEnd as unknown as string).getTime() - Date.now()) / 86_400_000))
    : 14;

  return (
    <div
      className="w-full py-2 px-4 flex items-center justify-center gap-3 text-sm"
      style={{ background: '#f9731611', borderBottom: '1px solid #f9731622' }}
    >
      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f97316' }} />
      <span className="text-[#94a3b8]">
        {(t('trial.banner') || 'Your Pro trial ends in {days} days').replace('{days}', String(daysLeft))}
      </span>
      <Link
        to="/pricing"
        className="font-bold text-xs px-3 py-1 rounded-full text-white flex-shrink-0"
        style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
      >
        {t('trial.upgradeNow') || 'Upgrade now'}
      </Link>
    </div>
  );
}

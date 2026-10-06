import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ErrorCard from './ErrorCard';

/** Unknown account data must not be presented as a free subscription. */
export default function ProfileLoadStatus() {
  const { loading, retryProfile } = useAuth();
  const { t } = useLanguage();
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4" aria-busy={loading}>
      {loading ? (
        <div role="status" className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm" style={{ color: 'var(--tsw-fg-muted)' }}>{t('app.loading')}</span>
        </div>
      ) : <ErrorCard onRetry={retryProfile} />}
    </div>
  );
}

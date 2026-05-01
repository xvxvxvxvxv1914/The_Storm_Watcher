import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  message?: string;
  onRetry: () => void;
}

export default function ErrorCard({ message, onRetry }: Props) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <AlertTriangle className="w-10 h-10 text-amber-400" />
      <p className="text-sm" style={{ color: 'var(--tsw-fg-muted)' }}>
        {message ?? t('error.loadFailed')}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
        style={{ color: 'var(--tsw-fg)' }}
      >
        {t('error.retry')}
      </button>
    </div>
  );
}

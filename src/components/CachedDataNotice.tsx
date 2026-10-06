import { useLanguage } from '../contexts/LanguageContext';

export default function CachedDataNotice({ fetchedAt, source }: { fetchedAt: number; source?: string }) {
  const { t, language } = useLanguage();
  const time = new Date(fetchedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' });
  return <p role="status" className="text-xs text-amber-400 mb-3">
    {source ? `${source} · ` : ''}{t('data.cachedAt').replace('{time}', time)}
  </p>;
}

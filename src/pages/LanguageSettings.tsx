import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Check, Loader2 } from 'lucide-react';
import { useLanguage, languages } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import StarField from '../components/StarField';
import { supabase } from '../lib/supabase';
import PageMeta from '../components/PageMeta';

export default function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');

  // Load saved preference from Supabase on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_preferences')
      .select('locale_settings')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setLoadError(t('settings.lang.loadError'));
          return;
        }
        const saved = (data?.locale_settings as { language?: string } | null)?.language;
        if (saved) setLanguage(saved as Parameters<typeof setLanguage>[0]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ id: user.id, locale_settings: { language }, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      setSaveError(t('settings.lang.saveError'));
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <StarField />
      <PageMeta
        title="Language Settings — The Storm Watcher"
        description="Choose your interface language."
        path="/settings/language"
        noindex
      />

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('settings.title') || 'Settings'}
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-7 h-7 text-[#f97316]" />
          <h1 className="text-3xl font-bold text-white">{t('settings.language') || 'Language'}</h1>
        </div>
        <p className="text-[#94a3b8] mb-10">
          {t('settings.languageDesc') || 'The interface language. You can also change it from the navigation bar.'}
        </p>

        {loadError && (
          <p className="mb-6 text-sm text-amber-400">{loadError}</p>
        )}

        <section className="glass-surface rounded-2xl p-4 sm:p-6 border border-white/10 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {languages.map(lang => {
              const active = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center justify-between gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    active
                      ? 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]'
                      : 'border-white/10 text-[#94a3b8] hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{lang.flag}</span>
                    <span className="truncate">{lang.name}</span>
                  </span>
                  {active && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between">
          {saveError && (
            <p className="text-sm text-red-400">{saveError}</p>
          )}
          {!saveError && <span />}

          {user ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold hover:shadow-lg hover:shadow-[#f97316]/40 transition-all disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saved && <Check className="w-4 h-4" />}
              {saved
                ? (t('settings.saved') || 'Saved!')
                : (t('settings.save') || 'Save Settings')}
            </button>
          ) : (
            <p className="text-sm text-[#94a3b8]">
              <Link to="/auth" className="text-[#f97316] hover:underline">
                {t('auth.signIn') || 'Sign in'}
              </Link>
              {' '}{t('settings.lang.signInPrompt')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

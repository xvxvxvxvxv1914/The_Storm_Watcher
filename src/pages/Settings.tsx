import { useState } from 'react';
import PageMeta from '../components/PageMeta';
import StarField from '../components/StarField';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Bell, Ruler, Globe, Check, Loader2, X, HelpCircle, Lock, Mail, Navigation2, Pin } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage, languages } from '../contexts/LanguageContext';
import { useOnboarding } from '../hooks/useOnboarding';
import LocationPicker from '../components/LocationPicker';
import { reverseGeocode } from '../utils/reverseGeocode';
import { getCurrentPosition } from '../utils/geolocation';
import { usePaymentGate } from '../hooks/usePaymentGate';
import { useAuth } from '../contexts/AuthContext';
import { FlaskConical } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { language, setLanguage, t } = useLanguage();
  const { reset: resetOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const { hasPro, hasPremium } = usePaymentGate();
  const { profile, updateProfile } = useAuth();
  const isBeta = profile?.is_beta === true;

  const [digestSaving, setDigestSaving] = useState(false);

  const handleDigestToggle = async () => {
    if (!profile) return;
    setDigestSaving(true);
    await updateProfile({ weekly_digest: !profile.weekly_digest });
    setDigestSaving(false);
  };

  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const handleRestartTour = () => {
    resetOnboarding();
    navigate('/dashboard');
  };

  const [kpThreshold, setKpThreshold] = useState(settings.kpThreshold);
  const [unitSystem, setUnitSystem] = useState(settings.unitSystem);

  const handleSave = () => {
    updateSettings({ kpThreshold, unitSystem });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleUseGPS = () => {
    setLocating(true);
    setLocError('');
    getCurrentPosition().then(async (pos) => {
      const lat = parseFloat(pos.coords.latitude.toFixed(4));
      const lon = parseFloat(pos.coords.longitude.toFixed(4));
      const name = await reverseGeocode(lat, lon);
      updateSettings({ preferredLat: lat, preferredLon: lon, preferredLocationName: name, locationMode: 'auto' });
      setLocating(false);
    }).catch(() => {
      setLocError(t('settings.gpsError') || 'Could not get your location. Check permissions.');
      setLocating(false);
    });
  };

  const handleLocationSelect = (lat: number, lon: number, name: string) => {
    // Picking a place by hand pins it — auto-follow must not override it.
    updateSettings({ preferredLat: lat, preferredLon: lon, preferredLocationName: name, locationMode: 'manual' });
  };

  const handleClearLocation = () => {
    updateSettings({ preferredLat: null, preferredLon: null, preferredLocationName: '', locationMode: 'auto' });
  };

  const handleModeChange = (mode: 'auto' | 'manual') => {
    if (mode === settings.locationMode) return;
    updateSettings({ locationMode: mode });
    if (mode === 'auto') handleUseGPS();
  };

  const kpLabels: Record<number, string> = {
    3: `Kp 3 — ${t('settings.kp.weak')}`,
    4: `Kp 4 — ${t('settings.kp.moderate')}`,
    5: `Kp 5 — ${t('settings.kp.storm')}`,
    6: `Kp 6 — ${t('settings.kp.strongStorm')}`,
    7: `Kp 7 — ${t('settings.kp.severeStorm')}`,
    8: `Kp 8 — ${t('settings.kp.extreme')}`,
    9: `Kp 9 — ${t('settings.kp.extremePlus')}`,
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 relative">
      <StarField />
      <PageMeta
        title="Settings — The Storm Watcher"
        description="Configure your location, notification threshold, units and language preferences."
        path="/settings"
        noindex
      />

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('profile.back') || 'Back'}
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">{t('settings.title') || 'Settings'}</h1>
        <p className="text-[#94a3b8] mb-10">{t('settings.subtitle') || 'Preferences are saved locally on this device.'}</p>

        <div className="space-y-8">

          {/* Location */}
          <section className="glass-surface rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-1">
              <MapPin className="w-5 h-5 text-[#f97316]" />
              <h2 className="text-lg font-semibold text-white">{t('settings.location') || 'Preferred Location'}</h2>
            </div>
            <p className="text-sm text-[#94a3b8] mb-5">
              {t('settings.locationDesc') || 'Used on Aurora, UV, Sun Times and Sky Visibility pages instead of asking for GPS every time.'}
            </p>

            {/* Auto-follow vs pinned location */}
            <div className="grid grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label={t('settings.location') || 'Preferred Location'}>
              {([
                ['auto', Navigation2, t('settings.locationModeAuto') || 'Follow my location', t('settings.locationModeAutoDesc') || 'Updates automatically as you travel'],
                ['manual', Pin, t('settings.locationModeManual') || 'Fixed location', t('settings.locationModeManualDesc') || 'Stays as chosen until you change it'],
              ] as const).map(([mode, Icon, label, desc]) => (
                <button
                  key={mode}
                  role="radio"
                  aria-checked={settings.locationMode === mode}
                  onClick={() => handleModeChange(mode)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    settings.locationMode === mode
                      ? 'border-[#f97316]/60 bg-[#f97316]/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${settings.locationMode === mode ? 'text-[#f97316]' : 'text-white'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                  <span className="block text-xs text-[#94a3b8] mt-1">{desc}</span>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <LocationPicker
                lat={settings.preferredLat ?? 42.7}
                lon={settings.preferredLon ?? 23.3}
                locationName={settings.preferredLocationName || ''}
                onSelect={handleLocationSelect}
                onRequestGPS={handleUseGPS}
              />
            </div>

            {settings.preferredLat !== null && (
              <button
                onClick={handleClearLocation}
                className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                {t('settings.clearLocation') || 'Clear saved location'}
              </button>
            )}

            {locating && (
              <div className="flex items-center gap-2 mt-3 text-sm text-[#94a3b8]">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('settings.detectingLocation') || 'Detecting location…'}
              </div>
            )}

            {locError && (
              <p className="mt-3 text-sm text-red-400">{locError}</p>
            )}
          </section>

          {/* Notifications */}
          <section className="glass-surface rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-1">
              <Bell className="w-5 h-5 text-[#f97316]" />
              <h2 className="text-lg font-semibold text-white">{t('settings.notifications') || 'Storm Notifications'}</h2>
            </div>
            <p className="text-sm text-[#94a3b8] mb-6">
              {t('settings.kpThresholdDesc') || 'Alert me when the Kp index reaches or exceeds this value.'}
            </p>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#94a3b8]">{t('settings.kpThreshold') || 'Alert threshold'}</span>
                {hasPro ? (
                  <span className="text-sm font-bold text-[#f97316]">{kpLabels[kpThreshold] ?? `Kp ${kpThreshold}`}</span>
                ) : (
                  <span className="text-sm font-bold text-[#f97316]">{kpLabels[5]}</span>
                )}
              </div>
              {hasPro ? (
                <>
                  <input
                    type="range"
                    min={hasPremium ? 3 : 5}
                    max={9}
                    step={1}
                    value={kpThreshold}
                    onChange={e => setKpThreshold(Number(e.target.value))}
                    className="w-full accent-[#f97316]"
                  />
                  <div className="flex justify-between text-xs text-[#64748b] mt-1">
                    <span>{hasPremium ? '3' : '5'}</span>
                    <span>9</span>
                  </div>
                  {!hasPremium && (
                    <p className="text-xs mt-2" style={{ color: '#7c3aed99' }}>
                      <Link to="/pricing" className="underline hover:text-[#a78bfa] transition-colors">
                        {t('settings.thresholdPremiumHint') || 'Upgrade to Premium for Kp 3–4 fine-grain thresholds'}
                      </Link>
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 mt-2 text-xs text-[#475569]">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f97316' }} />
                  <span>
                    {t('settings.thresholdProHint') || 'Custom thresholds require '}
                    <Link to="/pricing" className="text-[#f97316] underline hover:text-[#fb923c] transition-colors">
                      Pro
                    </Link>
                    {'. Default: Kp 5.'}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-[#64748b]">
              {t('settings.kpThresholdNote') || 'Push notifications require enabling them first via the bell icon in the navigation bar.'}
            </p>

            {/* Quiet hours — suppress storm pushes during the local window */}
            {profile && (
              <div className="mt-5 pt-5 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white font-medium">{t('settings.quietHours') || 'Quiet hours'}</span>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      {t('settings.quietHoursDesc') || "Don't send storm alerts during these hours."}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={profile.quiet_start != null}
                    onClick={() => updateProfile(
                      profile.quiet_start != null
                        ? { quiet_start: null, quiet_end: null }
                        : { quiet_start: 23, quiet_end: 7 }
                    )}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${profile.quiet_start != null ? 'bg-[#f97316]' : 'bg-white/15'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${profile.quiet_start != null ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {profile.quiet_start != null && (
                  <div className="flex items-center gap-3 mt-3">
                    {([['quiet_start', t('settings.quietFrom') || 'From'], ['quiet_end', t('settings.quietTo') || 'To']] as const).map(([field, label]) => (
                      <label key={field} className="flex items-center gap-2 text-sm text-[#94a3b8]">
                        {label}
                        <select
                          value={profile[field] ?? 0}
                          onChange={e => updateProfile({ [field]: Number(e.target.value) })}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm"
                        >
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h} className="bg-[#0a0a1a]">{String(h).padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Weekly Digest */}
          <section className="glass-surface rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-1">
              <Mail className="w-5 h-5 text-[#f97316]" />
              <h2 className="text-lg font-semibold text-white">{t('settings.digest') || 'Weekly Space Weather Digest'}</h2>
            </div>
            <p className="text-sm text-[#94a3b8] mb-5">
              {t('settings.digestDesc') || 'Receive a weekly email summary of solar activity, Kp peaks, and geomagnetic storm events.'}
            </p>

            {profile ? (
              <button
                onClick={handleDigestToggle}
                disabled={digestSaving}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-colors text-left ${
                  profile.weekly_digest
                    ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]'
                    : 'border-white/10 text-[#94a3b8] hover:border-white/30 hover:text-white'
                }`}
              >
                <div className={`w-9 h-5 rounded-full flex-shrink-0 transition-colors relative ${
                  profile.weekly_digest ? 'bg-[#10b981]' : 'bg-[#334155]'
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    profile.weekly_digest ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
                <span className="text-sm font-medium">
                  {digestSaving
                    ? (t('settings.saving') || 'Saving…')
                    : (t('settings.digestToggle') || 'Send me weekly digest emails')}
                </span>
              </button>
            ) : (
              <p className="text-sm text-[#64748b]">
                <Link to="/auth" className="text-[#f97316] underline hover:text-[#fb923c] transition-colors">
                  {t('settings.digestSignIn') || 'Sign in'}
                </Link>
                {' '}{t('settings.digestSignInSuffix') || 'to subscribe to the weekly digest.'}
              </p>
            )}
          </section>

          {/* Units */}
          <section className="glass-surface rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-1">
              <Ruler className="w-5 h-5 text-[#f97316]" />
              <h2 className="text-lg font-semibold text-white">{t('settings.units') || 'Units'}</h2>
            </div>
            <p className="text-sm text-[#94a3b8] mb-5">
              {t('settings.unitsDesc') || 'Choose how measurements are displayed across the app.'}
            </p>

            <div className="flex gap-3">
              {(['metric', 'imperial'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setUnitSystem(opt)}
                  className={`flex-1 py-3 px-4 rounded-xl border font-medium text-sm transition-colors ${
                    unitSystem === opt
                      ? 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]'
                      : 'border-white/10 text-[#94a3b8] hover:border-white/30 hover:text-white'
                  }`}
                >
                  {opt === 'metric'
                    ? (t('settings.unitsMetric') || 'Metric (km/s, °C)')
                    : (t('settings.unitsImperial') || 'Imperial (mi/s, °F)')}
                </button>
              ))}
            </div>
          </section>

          {/* Language */}
          <section className="glass-surface rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-1">
              <Globe className="w-5 h-5 text-[#f97316]" />
              <h2 className="text-lg font-semibold text-white">{t('settings.language') || 'Language'}</h2>
            </div>
            <p className="text-sm text-[#94a3b8] mb-5">
              {t('settings.languageDesc') || 'The interface language. You can also change it from the navigation bar.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    language === lang.code
                      ? 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]'
                      : 'border-white/10 text-[#94a3b8] hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="truncate">{lang.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Help & Onboarding */}
          <section className="glass-surface rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-1">
              <HelpCircle className="w-5 h-5 text-[#f97316]" />
              <h2 className="text-lg font-semibold text-white">{t('settings.help') || 'Help & Tour'}</h2>
            </div>
            <p className="text-sm text-[#94a3b8] mb-5">
              {t('settings.tourDesc') || 'Replay the introductory tour that explains the dashboard, push alerts and where to find your settings.'}
            </p>
            <button
              onClick={handleRestartTour}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20 transition-colors font-medium text-sm"
            >
              <HelpCircle className="w-4 h-4" />
              {t('settings.restartTour') || 'Restart onboarding tour'}
            </button>
          </section>

          {/* Beta Features — visible only to is_beta users */}
          {isBeta && (
            <section className="glass-surface rounded-2xl p-4 sm:p-6 border"
              style={{ borderColor: '#7c3aed44', background: 'linear-gradient(135deg, #7c3aed08, transparent)' }}>
              <div className="flex items-center gap-3 mb-1">
                <FlaskConical className="w-5 h-5" style={{ color: '#a78bfa' }} />
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  {t('settings.beta') || 'Beta Features'}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#7c3aed33', color: '#a78bfa', border: '1px solid #7c3aed44' }}>
                    BETA
                  </span>
                </h2>
              </div>
              <p className="text-sm text-[#94a3b8] mb-4">
                {t('settings.betaDesc') || 'You have early access to experimental features. These may change or be removed before general release.'}
              </p>
              <div className="rounded-xl p-4 text-sm text-[#64748b]"
                style={{ background: '#7c3aed0a', border: '1px solid #7c3aed22' }}>
                <p className="text-[#94a3b8] font-medium mb-1">{t('settings.betaEmpty') || 'No active beta features right now.'}</p>
                <p className="text-xs">{t('settings.betaWatch') || 'Watch this space — new experiments will appear here first.'}</p>
              </div>
            </section>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold hover:shadow-lg hover:shadow-[#f97316]/40 transition-all"
            >
              {saved ? <Check className="w-4 h-4" /> : null}
              {saved ? (t('settings.saved') || 'Saved!') : (t('settings.save') || 'Save Settings')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

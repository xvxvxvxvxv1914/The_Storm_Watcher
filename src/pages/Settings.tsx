import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Bell, Ruler, Globe, Check, Loader2, LocateFixed, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage, languages } from '../contexts/LanguageContext';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { language, setLanguage, t } = useLanguage();

  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const [kpThreshold, setKpThreshold] = useState(settings.kpThreshold);
  const [unitSystem, setUnitSystem] = useState(settings.unitSystem);

  const handleSave = () => {
    updateSettings({ kpThreshold, unitSystem });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setLocError(t('settings.gpsUnsupported') || 'GPS not supported in this browser.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        updateSettings({
          preferredLat: lat,
          preferredLon: lon,
          preferredLocationName: `${lat}, ${lon}`,
        });
        setLocating(false);
      },
      () => {
        setLocError(t('settings.gpsError') || 'Could not get your location. Check browser permissions.');
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const handleClearLocation = () => {
    updateSettings({ preferredLat: null, preferredLon: null, preferredLocationName: '' });
  };

  const kpLabels: Record<number, string> = {
    3: 'Kp 3 — Weak',
    4: 'Kp 4 — Moderate',
    5: 'Kp 5 — Storm',
    6: 'Kp 6 — Strong Storm',
    7: 'Kp 7 — Severe Storm',
    8: 'Kp 8 — Extreme',
    9: 'Kp 9 — Extreme+',
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Settings — The Storm Watcher</title>
        <meta name="description" content="Configure your location, notification threshold, units and language preferences." />
      </Helmet>

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
          <section className="glass-surface rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-1">
              <MapPin className="w-5 h-5 text-[#f97316]" />
              <h2 className="text-lg font-semibold text-white">{t('settings.location') || 'Preferred Location'}</h2>
            </div>
            <p className="text-sm text-[#94a3b8] mb-5">
              {t('settings.locationDesc') || 'Used on Aurora, UV, Sun Times and Sky Visibility pages instead of asking for GPS every time.'}
            </p>

            {settings.preferredLat !== null ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 mb-4">
                <div className="flex items-center gap-2">
                  <LocateFixed className="w-4 h-4 text-[#10b981] shrink-0" />
                  <span className="text-sm text-white font-medium">
                    {settings.preferredLocationName || `${settings.preferredLat}, ${settings.preferredLon}`}
                  </span>
                </div>
                <button
                  onClick={handleClearLocation}
                  className="text-[#94a3b8] hover:text-white transition-colors p-1"
                  aria-label="Clear location"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#64748b] mb-4">{t('settings.noLocation') || 'No preferred location saved. Pages will use your live GPS.'}</p>
            )}

            <button
              onClick={handleUseGPS}
              disabled={locating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              {locating ? (t('settings.detectingLocation') || 'Detecting…') : (t('settings.useGPS') || 'Use My Current GPS Location')}
            </button>

            {locError && (
              <p className="mt-3 text-sm text-red-400">{locError}</p>
            )}
          </section>

          {/* Notifications */}
          <section className="glass-surface rounded-2xl p-6 border border-white/10">
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
                <span className="text-sm font-bold text-[#f97316]">{kpLabels[kpThreshold] ?? `Kp ${kpThreshold}`}</span>
              </div>
              <input
                type="range"
                min={3}
                max={9}
                step={1}
                value={kpThreshold}
                onChange={e => setKpThreshold(Number(e.target.value))}
                className="w-full accent-[#f97316]"
              />
              <div className="flex justify-between text-xs text-[#64748b] mt-1">
                <span>3</span>
                <span>9</span>
              </div>
            </div>
            <p className="text-xs text-[#64748b]">
              {t('settings.kpThresholdNote') || 'Push notifications require enabling them first via the bell icon in the navigation bar.'}
            </p>
          </section>

          {/* Units */}
          <section className="glass-surface rounded-2xl p-6 border border-white/10">
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
          <section className="glass-surface rounded-2xl p-6 border border-white/10">
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

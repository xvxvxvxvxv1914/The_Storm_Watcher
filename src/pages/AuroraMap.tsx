import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Map, Sparkles, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { useKpLive } from '../hooks/useKpLive';
import { getStormStatus } from '../services/noaaApi';
import { calcAuroraVisibility } from '../utils/auroraVisibility';
import { usePaymentGate } from '../hooks/usePaymentGate';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';

const AuroraHeatmap = lazy(() => import('../components/AuroraHeatmap'));

export default function AuroraMap() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const kp = useKpLive();
  const kpVal = kp ?? 0;
  const storm = kp !== null ? getStormStatus(kp) : null;
  const { hasPro } = usePaymentGate();

  const userLat = settings.preferredLat ?? undefined;
  const userLon = settings.preferredLon ?? undefined;
  const userVis = userLat !== undefined && userLon !== undefined
    ? calcAuroraVisibility(userLat, userLon, kpVal)
    : null;

  const KEY_CITIES = [
    { name: 'Tromsø',       lat: 69.7, lon: 18.9,  flag: '🇳🇴' },
    { name: 'Reykjavík',    lat: 64.1, lon: -21.9, flag: '🇮🇸' },
    { name: 'Rovaniemi',    lat: 66.5, lon: 25.7,  flag: '🇫🇮' },
    { name: 'Abisko',       lat: 68.3, lon: 18.8,  flag: '🇸🇪' },
    { name: 'Fairbanks',    lat: 64.8, lon: -147.7, flag: '🇺🇸' },
    { name: 'Yellowknife',  lat: 62.5, lon: -114.4, flag: '🇨🇦' },
  ];

  const legend = [
    { label: t('auroraMap.legend.high') || 'High (>75%)', color: '#e5ff50' },
    { label: t('auroraMap.legend.moderate') || 'Moderate (55–75%)', color: '#64dc50' },
    { label: t('auroraMap.legend.low') || 'Low (25–55%)', color: '#10b981' },
    { label: t('auroraMap.legend.minimal') || 'Minimal (<25%)', color: '#1e4f40' },
  ];

  return (
    <div className="min-h-screen text-white pt-20 pb-24" style={{ background: 'var(--tsw-bg)' }}>
      <PageMeta
        title={t('auroraMap.meta.title') || 'Aurora Visibility Map — The Storm Watcher'}
        description={t('auroraMap.meta.description') || 'Live world map showing aurora visibility zones based on the current Kp index.'}
        path="/aurora-map"
      />
      <BreadcrumbSchema
        crumbs={[
          { name: t('nav.home'), path: '/' },
          { name: t('auroraMap.title') || 'Aurora Visibility Map', path: '/aurora-map' },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20">
            <Map className="w-5 h-5 text-[#10b981]" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {t('auroraMap.title') || 'Aurora Visibility Map'}
          </h1>
        </div>
        <p className="text-[#64748b] text-sm mb-6 ml-14">
          {t('auroraMap.subtitle') || 'Live aurora zones based on current Kp index. Updated every 3 minutes.'}
        </p>

        {/* Status bar: Kp + local visibility */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {kp !== null && storm && (
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3 border flex-1"
              style={{ background: `${storm.bgColor}18`, borderColor: `${storm.color}33` }}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-xl" style={{ color: storm.color }}>
                  Kp {kpVal.toFixed(1)}
                </span>
                <span className="text-sm text-[#94a3b8]">{t(storm.statusKey)}</span>
              </div>
              <div
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ background: storm.color }}
              />
            </div>
          )}
          {userVis !== null && settings.preferredLocationName ? (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-white/10 bg-white/5 flex-1">
              <MapPin className="w-4 h-4 text-[#64748b] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-[#64748b] truncate">{settings.preferredLocationName}</div>
                <div className="font-semibold text-white text-sm">{userVis}% {t('aurora.visibility') || 'Aurora Visibility'}</div>
              </div>
            </div>
          ) : settings.preferredLat === null ? (
            <Link
              to="/settings"
              className="flex items-center gap-3 rounded-xl px-4 py-3 border border-dashed border-white/20 bg-white/3 flex-1 hover:border-white/30 hover:bg-white/5 transition-colors group"
            >
              <MapPin className="w-4 h-4 text-[#475569] flex-shrink-0 group-hover:text-[#64748b] transition-colors" />
              <div>
                <div className="text-xs text-[#475569] group-hover:text-[#64748b] transition-colors">{t('auroraMap.noLocation') || 'No location set'}</div>
                <div className="text-xs text-[#334155] group-hover:text-[#475569] transition-colors">{t('auroraMap.setLocation') || 'Set your location to see local visibility →'}</div>
              </div>
            </Link>
          ) : null}
        </div>

        {/* Map */}
        <Suspense
          fallback={
            <div className="rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center" style={{ height: 380 }}>
              <span className="text-[#64748b] text-sm animate-pulse">{t('auroraMap.loading') || 'Loading map…'}</span>
            </div>
          }
        >
          <AuroraHeatmap kp={kpVal} userLat={userLat} userLon={userLon} />
        </Suspense>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {legend.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>

        {/* Key aurora locations */}
        <div className="mt-6">
          <h2 className="text-xs uppercase tracking-wider text-[#475569] font-semibold mb-3">
            {t('auroraMap.keyLocations') || 'Key Locations'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {KEY_CITIES.map(city => {
              const vis = calcAuroraVisibility(city.lat, city.lon, kpVal);
              const visColor = vis >= 75 ? '#e5ff50' : vis >= 55 ? '#64dc50' : vis >= 25 ? '#10b981' : '#475569';
              return (
                <div key={city.name} className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-white/5 border border-white/8">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none">{city.flag}</span>
                    <span className="text-sm text-[#94a3b8] truncate">{city.name}</span>
                  </div>
                  <span className="font-bold text-sm ml-2 flex-shrink-0" style={{ color: visColor }}>{vis}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info note */}
        <p className="mt-4 text-xs text-[#475569] leading-relaxed">
          {t('auroraMap.note') || 'Visibility calculated using dipole geomagnetic model. Actual aurora depends on cloud cover, light pollution, and local horizon.'}
        </p>

        {/* Pro upgrade CTA — only for free users */}
        {!hasPro && <div className="mt-8 rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-white text-sm">
                {t('auroraMap.proCta.title') || 'Want the full 3D Aurora Globe?'}
              </div>
              <div className="text-xs text-[#64748b] mt-0.5">
                {t('auroraMap.proCta.desc') || 'Pro includes real-time OVATION aurora model on an interactive 3D globe, email alerts and more.'}
              </div>
            </div>
          </div>
          <Link
            to="/pricing"
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#10b981] text-white text-sm font-semibold hover:bg-[#0d9a6f] transition-colors"
          >
            {t('auroraMap.proCta.cta') || 'Upgrade to Pro'}
          </Link>
        </div>}
      </div>
    </div>
  );
}

import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Map, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useKpLive } from '../hooks/useKpLive';
import { getStormStatus } from '../services/noaaApi';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';

const AuroraHeatmap = lazy(() => import('../components/AuroraHeatmap'));

export default function AuroraMap() {
  const { t } = useLanguage();
  const kp = useKpLive();
  const kpVal = kp ?? 0;
  const storm = kp !== null ? getStormStatus(kp) : null;

  const legend = [
    { label: t('auroraMap.legend.high') || 'High (>75%)', color: '#e5ff50' },
    { label: t('auroraMap.legend.moderate') || 'Moderate (55–75%)', color: '#64dc50' },
    { label: t('auroraMap.legend.low') || 'Low (25–55%)', color: '#10b981' },
    { label: t('auroraMap.legend.minimal') || 'Minimal (<25%)', color: '#1e4f40' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white pt-20 pb-24">
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

        {/* Kp status bar */}
        {kp !== null && storm && (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3 mb-5 border"
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

        {/* Map */}
        <Suspense
          fallback={
            <div className="rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center" style={{ height: 380 }}>
              <span className="text-[#64748b] text-sm animate-pulse">{t('auroraMap.loading') || 'Loading map…'}</span>
            </div>
          }
        >
          <AuroraHeatmap kp={kpVal} />
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

        {/* Info note */}
        <p className="mt-4 text-xs text-[#475569] leading-relaxed">
          {t('auroraMap.note') || 'Visibility calculated using dipole geomagnetic model. Actual aurora depends on cloud cover, light pollution, and local horizon.'}
        </p>

        {/* Pro upgrade CTA */}
        <div className="mt-8 rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
        </div>
      </div>
    </div>
  );
}

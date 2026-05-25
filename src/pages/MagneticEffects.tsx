import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { Heart, Brain, Moon, AlertTriangle, Shield, Activity } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';
import { magneticContent } from '../content/magneticEffectsContent';
import { useKpLive } from '../hooks/useKpLive';
import { getStormStatus, getKpGradientStyle } from '../services/noaaApi';

const sectionMeta = [
  { icon: <Activity className="w-6 h-6" />, color: '#f97316' },
  { icon: <Heart className="w-6 h-6" />, color: '#ef4444' },
  { icon: <Brain className="w-6 h-6" />, color: '#a855f7' },
  { icon: <Moon className="w-6 h-6" />, color: '#3b82f6' },
  { icon: <AlertTriangle className="w-6 h-6" />, color: '#eab308' },
  { icon: <Shield className="w-6 h-6" />, color: '#10b981' },
];

export default function MagneticEffects() {
  const { language, t } = useLanguage();
  const lang = magneticContent[language] ? language : 'en';
  const c = magneticContent[lang];
  const kp = useKpLive();
  const storm = kp !== null ? getStormStatus(kp) : null;

  const kpMessage = kp === null ? null
    : kp >= 7 ? (t('effects.kpSevere') || 'Severe geomagnetic storm — effects may be strongly felt.')
    : kp >= 5 ? (t('effects.kpStorm') || 'Geomagnetic storm in progress — many people report symptoms.')
    : kp >= 3 ? (t('effects.kpUnsettled') || 'Unsettled conditions — sensitive individuals may notice effects.')
    : (t('effects.kpQuiet') || 'Quiet conditions — geomagnetic activity is low today.');

  return (
    <>
      <PageMeta
        title="Magnetic Storms & Human Health — The Storm Watcher"
        description="How geomagnetic activity affects the human body — headaches, sleep, mood — and what you can do about it."
        path="/magnetic-effects"
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Magnetic Effects', path: '/magnetic-effects' }]} />

      <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
        <StarField />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero */}
          <div className="mb-6 md:mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Heart className="w-3.5 h-3.5" /> {t('effects.healthScience') || 'Health & Science'}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{c.title}</h1>
            <p className="text-lg text-[#94a3b8] leading-relaxed">{c.subtitle}</p>
          </div>

          {/* Live Kp widget */}
          {kp !== null && storm && (
            <div
              className="rounded-2xl p-4 mb-8 flex items-center gap-4 border"
              style={{ background: storm.bgColor, borderColor: storm.color + '44' }}
            >
              <div className="flex-shrink-0 text-center">
                <div className="text-3xl font-black leading-none" style={getKpGradientStyle(kp)}>
                  {kp.toFixed(1)}
                </div>
                <div className="text-[10px] text-[#64748b] uppercase tracking-widest mt-0.5">Kp</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: storm.color }}>
                  {t('home.liveSpaceWeather') || 'Live space weather'} · {t(storm.statusKey)}
                </div>
                <p className="text-[#94a3b8] text-sm leading-snug">{kpMessage}</p>
              </div>
              <span className="flex-shrink-0 w-2 h-2 rounded-full animate-pulse" style={{ background: storm.color }} />
            </div>
          )}

          {/* Sections */}
          <div className="space-y-10">
            {c.sections.map((section, i) => (
              <div key={i} className="glass-surface rounded-2xl p-4 sm:p-8 border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl" style={{ background: sectionMeta[i].color + '20', color: sectionMeta[i].color }}>
                    {sectionMeta[i].icon}
                  </div>
                  <h2 className="text-xl font-bold text-white">{section.heading}</h2>
                </div>
                <div className="space-y-3">
                  {section.body.split('\n\n').map((para, j) => (
                    <p key={j} className="text-[#94a3b8] leading-relaxed text-sm whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sources */}
          <p className="mt-10 text-xs text-[#475569] leading-relaxed text-center italic">{c.sources}</p>
        </div>
      </div>
    </>
  );
}

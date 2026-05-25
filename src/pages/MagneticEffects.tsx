import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { Heart, Brain, Moon, AlertTriangle, Shield, Activity } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';
import { magneticContent } from '../content/magneticEffectsContent';

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

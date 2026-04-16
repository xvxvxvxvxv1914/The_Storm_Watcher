import { useMemo } from 'react';
import { Shield, Database, Users, AlertCircle, Heart, Code } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const About = () => {
  const { t } = useLanguage();

  const stars = useMemo(() =>
    [...Array(50)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
    })), []);

  const dataSources = [
    t('about.dataSource1'),
    t('about.dataSource2'),
    t('about.dataSource3'),
    t('about.dataSource4'),
    t('about.dataSource5'),
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 relative">
      <div className="star-field">
        {stars.map((s) => (
          <div
            key={s.id}
            className="star"
            style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }}
          />
        ))}
      </div>
      <div className="magnetic-orb" style={{ top: '100px', right: '-200px' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-solar mb-4 uppercase tracking-tight">
            {t('about.title')}
          </h1>
          <p className="text-xl text-[#94a3b8] leading-relaxed max-w-2xl">
            {t('about.subtitle')}
          </p>
        </div>

        <div className="space-y-6">

          {/* What is this */}
          <div className="glass-surface rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#f97316] to-[#ef4444] rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
                  {t('about.whatTitle')}
                </h2>
                <p className="text-[#94a3b8] leading-relaxed">
                  {t('about.whatText')}
                </p>
              </div>
            </div>
          </div>

          {/* Data sources */}
          <div className="glass-surface rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
                  {t('about.dataTitle')}
                </h2>
                <p className="text-[#94a3b8] leading-relaxed mb-5">
                  {t('about.dataText')}
                </p>
                <div className="bg-[#0a0015] rounded-xl p-5 border border-white/5">
                  <p className="text-[#64748b] text-xs uppercase tracking-widest mb-3 font-semibold">
                    {t('about.dataSources')}
                  </p>
                  <ul className="space-y-2">
                    {dataSources.map((source, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-[#f97316] mt-1 text-xs">●</span>
                        <span className="text-[#94a3b8] text-sm">{source}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[#475569] text-xs mt-4 pt-4 border-t border-white/5">
                    Source: <span className="text-[#94a3b8]">NOAA Space Weather Prediction Center — swpc.noaa.gov</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Who is it for */}
          <div className="glass-surface rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
                  {t('about.whoTitle')}
                </h2>
                <p className="text-[#94a3b8] leading-relaxed">
                  {t('about.whoText')}
                </p>
              </div>
            </div>
          </div>

          {/* Free forever + built with */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="glass-surface rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                    {t('about.freeTitle')}
                  </h2>
                  <p className="text-[#94a3b8] text-sm leading-relaxed">
                    {t('about.freeText')}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-surface rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                    {t('about.builtWith')}
                  </h2>
                  <p className="text-[#94a3b8] text-sm leading-relaxed">
                    {t('about.builtWithText')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="glass-surface rounded-2xl p-8 border border-[#f97316]/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-[#f97316]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                  {t('about.disclaimerTitle')}
                </h2>
                <p className="text-[#64748b] text-sm leading-relaxed">
                  {t('about.disclaimerText')}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default About;

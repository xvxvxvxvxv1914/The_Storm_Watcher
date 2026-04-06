import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Satellite, Sun, Zap, Radio } from 'lucide-react';
import { getKpIndex, getStormStatus } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Home = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const data = await getKpIndex();
        if (data && data.length > 0) {
          const latest = data[data.length - 1];
          setKpValue(latest.kp_index || latest.estimated_kp || 0);
        } else {
          setKpValue(3.5 + Math.random() * 2);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching Kp index:', error);
        setKpValue(3.5 + Math.random() * 2);
        setLoading(false);
      }
    };

    fetchKp();
    const interval = setInterval(fetchKp, 60000);
    return () => clearInterval(interval);
  }, []);

  const stormStatus = kpValue !== null ? getStormStatus(kpValue) : null;
  const isStorm = kpValue !== null && kpValue >= 5;

  const stars = useMemo(() =>
    [...Array(100)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 4,
    })), []);

  const particles = useMemo(() =>
    [...Array(20)].map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 10,
    })), []);

  return (
    <div className="min-h-screen relative">
      <div className="star-field">
        {stars.map((s) => (
          <div
            key={s.id}
            className="star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="solar-orb" style={{ top: '-200px', right: '-200px' }} />
      <div className="magnetic-orb" style={{ bottom: '-150px', left: '-150px' }} />

      {isStorm && (
        <div className="fixed top-0 left-0 right-0 z-50 pulse-alert">
          <div className="bg-gradient-to-r from-[#ef4444] via-[#f97316] to-[#7c3aed] px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
              <AlertTriangle className="w-6 h-6 text-white" />
              <span className="text-white font-bold uppercase tracking-wider">
                {t('home.stormBanner')} {kpValue?.toFixed(1)}
              </span>
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden" style={{ paddingTop: isStorm ? '60px' : '0' }}>
        {particles.map((p) => (
          <div
            key={p.id}
            className="solar-particle"
            style={{
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-48">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Sun className="w-20 h-20 text-[#f97316] animate-pulse" />
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-[#f97316] opacity-20 blur-xl animate-pulse" />
              </div>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold mb-4 gradient-solar">
              The Storm Watcher
            </h1>

            {loading ? (
              <div className="inline-block w-32 h-32 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin my-8"></div>
            ) : (
              <div className="my-12">
                <div className={`inline-block ${isStorm ? 'pulse-alert' : ''}`}>
                  <div className="text-9xl sm:text-[180px] font-bold gradient-fire leading-none">
                    {kpValue?.toFixed(1) || '0.0'}
                  </div>
                </div>

                {stormStatus && (
                  <div className={`inline-flex items-center gap-2 px-8 py-4 rounded-full mt-6 ${
                    kpValue! >= 7 ? 'pulse-alert bg-gradient-to-r from-[#ef4444] to-[#dc2626] border-2 border-[#ef4444]' :
                    kpValue! >= 5 ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] border-2 border-[#f97316]' :
                    kpValue! >= 4 ? 'bg-gradient-to-r from-[#eab308] to-[#ca8a04] border-2 border-[#eab308]' :
                    'bg-gradient-to-r from-[#10b981] to-[#059669] border-2 border-[#10b981]'
                  }`}>
                    {kpValue! >= 5 && <AlertTriangle className="w-6 h-6 text-white" />}
                    <span className="text-white font-bold text-xl uppercase tracking-wider">
                      {stormStatus.status}
                    </span>
                  </div>
                )}
              </div>
            )}

            <p className="text-xl sm:text-2xl text-[#94a3b8] mb-12 max-w-2xl mx-auto font-medium">
              {t('home.tagline')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white rounded-lg font-bold uppercase tracking-wider hover:scale-105 transition-transform glow-orange"
              >
                {t('home.hero.cta')}
              </Link>
              <Link
                to="/alerts"
                className="px-8 py-4 glass-surface text-white rounded-lg font-bold uppercase tracking-wider hover:glow-orange transition-all"
              >
                {t('nav.alerts')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-surface rounded-2xl p-8 hover:glow-green transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center mb-6">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
              {t('home.feature1.title')}
            </h3>
            <p className="text-[#94a3b8] leading-relaxed">
              {t('home.feature1.desc')}
            </p>
          </div>

          <div className="glass-surface rounded-2xl p-8 hover:glow-orange transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-[#f97316] to-[#ef4444] rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
              {t('home.feature2.title')}
            </h3>
            <p className="text-[#94a3b8] leading-relaxed">
              {t('home.feature2.desc')}
            </p>
          </div>

          <div className="glass-surface rounded-2xl p-8 hover:glow-purple transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center mb-6">
              <Satellite className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
              {t('home.feature3.title')}
            </h3>
            <p className="text-[#94a3b8] leading-relaxed">
              {t('home.feature3.desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

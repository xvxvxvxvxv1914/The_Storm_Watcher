import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Satellite, Sun, Zap, Radio, X, Siren } from 'lucide-react';
import { getKpIndex, getSolarWind, getXrayFlux, getXrayClass, getStormStatus, getKpGradientStyle } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Home = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number | null>(null);
  const [windSpeed, setWindSpeed] = useState<number | null>(null);
  const [xrayClass, setXrayClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStormAlert, setShowStormAlert] = useState(false);
  const [dismissedKp, setDismissedKp] = useState<number | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [kpData, windData, xrayData] = await Promise.all([
          getKpIndex(),
          getSolarWind(),
          getXrayFlux(),
        ]);
        if (kpData && kpData.length > 0) {
          const latest = kpData[kpData.length - 1];
          setKpValue(latest.kp_index || latest.estimated_kp || 0);
        } else {
          setKpValue(0);
        }
        if (windData && windData.length > 0) {
          setWindSpeed(windData[windData.length - 1].speed || 0);
        }
        if (xrayData && xrayData.length > 0) {
          setXrayClass(getXrayClass(xrayData[xrayData.length - 1].flux || 0));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setKpValue(0);
        setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (kpValue !== null && kpValue >= 7 && dismissedKp !== Math.floor(kpValue)) {
      setShowStormAlert(true);
    }
  }, [kpValue]);

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

      {showStormAlert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowStormAlert(false); setDismissedKp(Math.floor(kpValue!)); }} />
          <div className="relative max-w-md w-full rounded-2xl border-2 border-[#ef4444] shadow-2xl overflow-hidden pulse-alert">
            <div className="bg-gradient-to-br from-[#1a0000] via-[#0a0a1a] to-[#1a0000] p-8">
              <button
                onClick={() => { setShowStormAlert(false); setDismissedKp(Math.floor(kpValue!)); }}
                className="absolute top-4 right-4 text-[#94a3b8] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[#ef4444]/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <AlertTriangle className="w-10 h-10 text-[#ef4444]" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-wider">
                  ⚠️ Силна буря!
                </h2>
                <div className="text-7xl font-bold mb-3" style={getKpGradientStyle(kpValue!)}>
                  Kp {kpValue?.toFixed(1)}
                </div>
                <p className="text-[#94a3b8] mb-6 leading-relaxed">
                  Регистрирана е много силна геомагнитна буря. Може да има смущения в GPS, радио връзки и електрически мрежи. Аврора е видима на ниски географски ширини.
                </p>
                <div className="flex gap-3 w-full">
                  <Link
                    to="/alerts"
                    onClick={() => setShowStormAlert(false)}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white font-bold rounded-lg text-center hover:shadow-lg hover:shadow-[#ef4444]/50 transition-all uppercase tracking-wide text-sm"
                  >
                    Виж известията
                  </Link>
                  <button
                    onClick={() => { setShowStormAlert(false); setDismissedKp(Math.floor(kpValue!)); }}
                    className="flex-1 py-3 px-4 glass-surface text-white font-semibold rounded-lg border border-white/10 hover:border-white/30 transition-all text-sm"
                  >
                    Затвори
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div
                    className="text-9xl sm:text-[180px] font-bold leading-none"
                    style={getKpGradientStyle(kpValue ?? 0)}
                  >
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
                      {t(stormStatus.statusKey)}
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

            {!loading && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <div className="glass-surface rounded-xl px-6 py-3 flex items-center gap-3">
                  <Activity className="w-4 h-4 text-[#f97316]" />
                  <span className="text-[#94a3b8] text-sm uppercase tracking-wider">Kp</span>
                  <span className="text-white font-bold">{kpValue?.toFixed(1)}</span>
                </div>
                {windSpeed !== null && windSpeed > 0 && (
                  <div className="glass-surface rounded-xl px-6 py-3 flex items-center gap-3">
                    <Zap className="w-4 h-4 text-[#7c3aed]" />
                    <span className="text-[#94a3b8] text-sm uppercase tracking-wider">Слънчев вятър</span>
                    <span className="text-white font-bold">{windSpeed.toFixed(0)} km/s</span>
                  </div>
                )}
                {xrayClass && (
                  <div className="glass-surface rounded-xl px-6 py-3 flex items-center gap-3">
                    <Radio className="w-4 h-4 text-[#fbbf24]" />
                    <span className="text-[#94a3b8] text-sm uppercase tracking-wider">X-ray</span>
                    <span className="text-white font-bold">Клас {xrayClass}</span>
                  </div>
                )}
              </div>
            )}
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

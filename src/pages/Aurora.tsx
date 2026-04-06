import { useEffect, useMemo, useState } from 'react';
import { MapPin, Eye, Sparkles } from 'lucide-react';
import { getKpIndex, getKpGradientStyle } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Aurora = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number>(0);
  const [imageKey, setImageKey] = useState(Date.now());

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const data = await getKpIndex();
        if (data && data.length > 0) {
          const latest = data[data.length - 1];
          setKpValue(latest.kp_index || latest.estimated_kp || 0);
        } else {
          setKpValue(0);
        }
      } catch (error) {
        console.error('Error fetching Kp index:', error);
        setKpValue(0);
      }
    };

    fetchKp();
    const interval = setInterval(fetchKp, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setImageKey(Date.now());
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const getVisibilityInfo = (kp: number) => {
    if (kp >= 7) return { latitude: 50, color: 'text-[#ef4444]', intensityKey: 'aurora.intensityVeryHigh', bgGlow: 'glow-red' };
    if (kp >= 6) return { latitude: 55, color: 'text-[#f97316]', intensityKey: 'aurora.intensityHigh', bgGlow: 'glow-orange' };
    if (kp >= 5) return { latitude: 60, color: 'text-[#fbbf24]', intensityKey: 'aurora.intensityModerate', bgGlow: 'glow-orange' };
    if (kp >= 4) return { latitude: 65, color: 'text-[#10b981]', intensityKey: 'aurora.intensityLow', bgGlow: 'glow-green' };
    return { latitude: 70, color: 'text-[#94a3b8]', intensityKey: 'aurora.intensityVeryLow', bgGlow: '' };
  };

  const visibility = getVisibilityInfo(kpValue);

  const stars = useMemo(() =>
    [...Array(50)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
    })), []);

  return (
    <div className="min-h-screen pt-24 pb-16 relative">
      <div className="star-field">
        {stars.map((s) => (
          <div
            key={s.id}
            className="star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="magnetic-orb" style={{ top: '-100px', right: '-200px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-aurora mb-3 uppercase tracking-tight">
            {t('aurora.title')}
          </h1>
          <p className="text-[#94a3b8] text-lg">
            {t('aurora.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className={`glass-surface rounded-2xl p-8 ${visibility.bgGlow} hover:scale-105 transition-transform`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.kpIndex')}
              </h3>
            </div>
            <div className="text-6xl font-bold mb-3" style={getKpGradientStyle(kpValue)}>{kpValue.toFixed(1)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">Current Value</div>
          </div>

          <div className={`glass-surface rounded-2xl p-8 ${visibility.bgGlow} hover:scale-105 transition-transform`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.intensity')}
              </h3>
            </div>
            <div className={`text-4xl font-bold mb-3 ${visibility.color}`}>{t(visibility.intensityKey)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">Aurora Strength</div>
          </div>

          <div className="glass-surface rounded-2xl p-8 hover:glow-purple transition-all hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.visibleFrom')}
              </h3>
            </div>
            <div className="text-6xl font-bold text-white mb-3">{visibility.latitude}°</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">Latitude North</div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">
            Видимост в Европа
          </h3>
          <div className="space-y-3">
            {[
              { city: 'Рейкявик, Исландия', lat: 64, minKp: 0 },
              { city: 'Хелзинки, Финландия', lat: 60, minKp: 3 },
              { city: 'Стокхолм, Швеция', lat: 59, minKp: 4 },
              { city: 'Копенхаген, Дания', lat: 56, minKp: 5 },
              { city: 'Берлин, Германия', lat: 52, minKp: 6 },
              { city: 'Варшава, Полша', lat: 52, minKp: 6 },
              { city: 'Прага, Чехия', lat: 50, minKp: 7 },
              { city: 'Виена, Австрия', lat: 48, minKp: 7 },
              { city: 'София, България', lat: 42, minKp: 8 },
            ].map(({ city, lat, minKp }) => {
              const visible = kpValue >= minKp;
              const chance = Math.min(100, Math.max(0, ((kpValue - minKp + 1) / 3) * 100));
              return (
                <div key={city} className="flex items-center gap-4">
                  <div className="w-48 text-sm text-[#94a3b8] flex-shrink-0">{city}</div>
                  <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${visible ? Math.max(10, chance) : 2}%`,
                        background: visible
                          ? 'linear-gradient(90deg, #10b981, #fbbf24)'
                          : 'rgba(148,163,184,0.2)',
                      }}
                    />
                  </div>
                  <div className={`text-sm font-bold w-20 text-right flex-shrink-0 ${visible ? 'text-[#10b981]' : 'text-[#475569]'}`}>
                    {visible ? `~${Math.round(chance)}%` : 'Не се вижда'}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[#475569] text-xs mt-4">* Приблизителна вероятност при текущото Kp = {kpValue.toFixed(1)} и ясно небе</p>
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">
            {t('aurora.oval')}
          </h3>
          <div className="relative">
            <img
              key={imageKey}
              src={`https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg?t=${imageKey}`}
              alt="Aurora Oval"
              className="w-full rounded-xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden h-96 flex items-center justify-center text-[#94a3b8] bg-[#0a0015] rounded-xl">
              Aurora oval data temporarily unavailable
            </div>
          </div>
          <p className="text-[#94a3b8] text-sm mt-4 leading-relaxed">
            {t('aurora.ovalDesc')}
          </p>
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">
            {t('aurora.forecast')}
          </h3>
          <div className="relative">
            <img
              src={`https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.jpg?t=${imageKey}`}
              alt="Aurora Forecast"
              className="w-full rounded-xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden h-96 flex items-center justify-center text-[#94a3b8] bg-[#0a0015] rounded-xl">
              Aurora forecast data temporarily unavailable
            </div>
          </div>
          <p className="text-[#94a3b8] text-sm mt-4 leading-relaxed">
            {t('aurora.forecastDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-surface rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">
              {t('aurora.bestViewing')}
            </h3>
            <ul className="space-y-3 text-[#94a3b8] leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-[#10b981] mt-1">•</span>
                <span>{t('aurora.tip1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#10b981] mt-1">•</span>
                <span>{t('aurora.tip2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#10b981] mt-1">•</span>
                <span>{t('aurora.tip3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#10b981] mt-1">•</span>
                <span>{t('aurora.tip4')}</span>
              </li>
            </ul>
          </div>

          <div className="glass-surface rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">
              {t('aurora.whatAreAuroras')}
            </h3>
            <p className="text-[#94a3b8] leading-relaxed">
              {t('aurora.auroraDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aurora;

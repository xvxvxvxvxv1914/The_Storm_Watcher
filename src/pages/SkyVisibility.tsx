import { useEffect, useState } from 'react';
import { Cloud, Eye, MapPin, Droplets, Star } from 'lucide-react';
import { getSkyVisibility, SkyData } from '../services/skyApi';
import { getKpIndex } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const verdictConfig = {
  excellent: {
    label: 'Excellent',
    sublabel: 'Perfect night for stargazing & aurora hunting.',
    color: '#10b981',
    bg: 'from-[#10b981] to-[#059669]',
    emoji: '✨',
  },
  good: {
    label: 'Good',
    sublabel: 'Mostly clear skies. Worth going out tonight.',
    color: '#fbbf24',
    bg: 'from-[#fbbf24] to-[#f59e0b]',
    emoji: '🌙',
  },
  fair: {
    label: 'Fair',
    sublabel: 'Partly cloudy. Some windows may open up.',
    color: '#f97316',
    bg: 'from-[#f97316] to-[#ea580c]',
    emoji: '⛅',
  },
  poor: {
    label: 'Poor',
    sublabel: 'Cloudy or rainy. Stay home tonight.',
    color: '#ef4444',
    bg: 'from-[#ef4444] to-[#dc2626]',
    emoji: '☁️',
  },
};

const SkyVisibility = () => {
  const { t } = useLanguage();
  const [sky, setSky] = useState<SkyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    const load = async (lat: number, lon: number) => {
      const kpData = await getKpIndex().catch(() => []);
      const kp = kpData.length ? (kpData[kpData.length - 1].kp_index ?? 0) : 0;
      const data = await getSkyVisibility(lat, lon, kp ?? 0);
      setSky(data);
      setLoading(false);

      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      ).then(r => r.json());
      const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
      const country = geo.address?.country || '';
      setLocationName([city, country].filter(Boolean).join(', '));
    };

    navigator.geolocation?.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(42.7, 23.3).then(() => setLocationName('Sofia, Bulgaria (default)')),
    );
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#7c3aed]/20 border-t-[#7c3aed] rounded-full animate-spin" />
      </div>
    );
  }

  if (!sky) return null;

  const cfg = verdictConfig[sky.verdict];

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-white mb-2 uppercase tracking-tight">
            Sky <span className="gradient-solar">{t('sky.tonight')}</span>
          </h1>
          {locationName && (
            <div className="flex items-center gap-2 text-[#94a3b8]">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{locationName}</span>
            </div>
          )}
        </div>

        {/* Main verdict */}
        <div className="glass-surface rounded-3xl p-10 mb-8 text-center border border-white/10">
          <div className="text-7xl mb-6">{cfg.emoji}</div>

          <div
            className="text-6xl sm:text-8xl font-bold mb-4"
            style={{ backgroundImage: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            {sky.score}
          </div>

          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${cfg.bg} mb-5`}>
            <span className="text-white font-bold text-xl uppercase tracking-wider">{cfg.label}</span>
          </div>

          <p className="text-[#94a3b8] text-lg max-w-md mx-auto">{cfg.sublabel}</p>

          <div className="text-[#64748b] text-sm mt-4">
            {sky.sunset} → {sky.sunrise}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass-surface rounded-2xl p-5 text-center border border-white/10">
            <Cloud className="w-6 h-6 text-[#94a3b8] mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{sky.cloudCoverAvg}%</div>
            <div className="text-[#64748b] text-xs mt-1 uppercase tracking-wider">{t('sky.cloudCover')}</div>
          </div>
          <div className="glass-surface rounded-2xl p-5 text-center border border-white/10">
            <Eye className="w-6 h-6 text-[#94a3b8] mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{sky.visibilityAvg} km</div>
            <div className="text-[#64748b] text-xs mt-1 uppercase tracking-wider">{t('sky.visibility')}</div>
          </div>
          <div className="glass-surface rounded-2xl p-5 text-center border border-white/10">
            <Star className="w-6 h-6 text-[#7c3aed] mx-auto mb-2" />
            <div className="text-xl font-bold text-white">{sky.auroraChance}</div>
            <div className="text-[#64748b] text-xs mt-1 uppercase tracking-wider">{t('sky.auroraChance')}</div>
          </div>
          <div className="glass-surface rounded-2xl p-5 text-center border border-white/10">
            <Droplets className="w-6 h-6 text-[#0ea5e9] mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">Kp {sky.kp.toFixed(1)}</div>
            <div className="text-[#64748b] text-xs mt-1 uppercase tracking-wider">{t('sky.geomagnetic')}</div>
          </div>
        </div>

        {/* Hourly breakdown */}
        {sky.nightHours.length > 0 && (
          <div className="glass-surface rounded-2xl p-8 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">{t('sky.hourlyBreakdown')}</h3>
            <div className="space-y-3">
              {sky.nightHours.map((h) => (
                <div key={h.time} className="flex items-center gap-4">
                  <div className="w-14 text-[#94a3b8] text-sm font-mono">{h.time}</div>
                  <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${100 - h.cloudCover}%`,
                        background: h.cloudCover < 30
                          ? 'linear-gradient(to right, #10b981, #059669)'
                          : h.cloudCover < 60
                          ? 'linear-gradient(to right, #fbbf24, #f59e0b)'
                          : h.cloudCover < 80
                          ? 'linear-gradient(to right, #f97316, #ea580c)'
                          : 'linear-gradient(to right, #ef4444, #dc2626)',
                      }}
                    />
                  </div>
                  <div className="w-14 text-right text-sm text-[#94a3b8]">{h.cloudCover}% ☁</div>
                  <div className="w-16 text-right text-sm text-[#64748b]">{h.visibility}km</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-5 text-xs text-[#64748b]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#10b981] inline-block" />{t('sky.clear')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#fbbf24] inline-block" />{t('sky.partlyCloudy')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f97316] inline-block" />{t('sky.mostlyCloudy')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" />{t('sky.overcast')}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SkyVisibility;

import { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin, Moon, Cloud, Zap, Star } from 'lucide-react';
import { getAuroraCalendar, type NightForecast } from '../services/skyApi';
import { getKpForecast, type KpIndexData } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { Skeleton } from '../components/Skeleton';

interface NightResult extends NightForecast {
  maxKp: number;
  auroraScore: number;
  verdict: 'excellent' | 'good' | 'fair' | 'poor';
}

const scoreColor = (score: number) =>
  score >= 7 ? '#10b981' : score >= 4 ? '#f97316' : score >= 2 ? '#fbbf24' : '#64748b';

const AuroraCalendar = () => {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [nights, setNights] = useState<NightForecast[]>([]);
  const [kpData, setKpData] = useState<KpIndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('');

  const load = useCallback(async (lat: number, lon: number) => {
    try {
      const [n, k] = await Promise.all([getAuroraCalendar(lat, lon), getKpForecast()]);
      setNights(n);
      setKpData(k);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (settings.preferredLat !== null && settings.preferredLon !== null) {
      if (settings.preferredLocationName) setLocationName(settings.preferredLocationName);
      load(settings.preferredLat, settings.preferredLon);
    } else {
      navigator.geolocation?.getCurrentPosition(
        pos => load(pos.coords.latitude, pos.coords.longitude),
        () => { load(42.7, 23.3); setLocationName('Sofia, Bulgaria (default)'); },
      );
    }
  }, [load, settings.preferredLat, settings.preferredLon, settings.preferredLocationName]);

  const nightResults: NightResult[] = nights.map(night => {
    const nightKp = kpData
      .map(k => ({ ts: new Date(k.time_tag).getTime(), kp: k.kp_index || 0 }))
      .filter(k => k.ts >= night.sunsetTs && k.ts <= night.sunriseTs)
      .map(k => k.kp);
    const maxKp = nightKp.length > 0 ? Math.max(...nightKp) : 0;
    const kpFactor = Math.min(1, Math.max(0, (maxKp - 1) / 7));
    const skyFactor = Math.max(0, 1 - night.cloudCoverAvg / 100);
    const auroraScore = parseFloat(((kpFactor * 0.6 + skyFactor * 0.4) * 10).toFixed(1));
    const verdict: NightResult['verdict'] =
      auroraScore >= 7 ? 'excellent' : auroraScore >= 4 ? 'good' : auroraScore >= 2 ? 'fair' : 'poor';
    return { ...night, maxKp, auroraScore, verdict };
  });

  const bestIdx = nightResults.length > 0
    ? nightResults.reduce((bi, n, i, arr) => n.auroraScore > arr[bi].auroraScore ? i : bi, 0)
    : -1;

  const nightLabel = (i: number, date: Date) => {
    if (i === 0) return t('calendar.tonight');
    if (i === 1) return t('calendar.tomorrow');
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16">
      <Helmet>
        <title>Aurora Calendar — The Storm Watcher</title>
        <meta name="description" content="See which of the next 3 nights offers the best aurora viewing conditions based on Kp index forecast and sky clarity." />
        <link rel="canonical" href="https://thestormwatcher.com/calendar" />
        <meta property="og:title" content="Aurora Calendar — The Storm Watcher" />
        <meta property="og:description" content="See which of the next 3 nights offers the best aurora viewing conditions based on Kp index forecast and sky clarity." />
        <meta property="og:url" content="https://thestormwatcher.com/calendar" />
        <meta name="twitter:title" content="Aurora Calendar — The Storm Watcher" />
        <meta name="twitter:description" content="See which of the next 3 nights offers the best aurora viewing conditions based on Kp index forecast and sky clarity." />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 uppercase tracking-tight">
            <span className="gradient-solar">{t('calendar.title')}</span>
          </h1>
          <p className="text-[#94a3b8] text-sm">{t('calendar.subtitle')}</p>
          {locationName && (
            <div className="flex items-center gap-2 text-[#94a3b8] mt-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{locationName}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-surface rounded-2xl p-6 border border-white/10">
                <Skeleton className="h-4 w-20 mb-4 mx-auto" />
                <Skeleton className="h-16 w-20 mx-auto mb-4" />
                <Skeleton className="h-6 w-24 mx-auto mb-6" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {nightResults.map((night, i) => {
                const isBest = i === bestIdx;
                const color = scoreColor(night.auroraScore);
                return (
                  <div
                    key={i}
                    className={`glass-surface rounded-2xl p-6 border relative transition-all ${
                      isBest ? 'border-[#f97316]/50' : 'border-white/10'
                    }`}
                    style={isBest ? { boxShadow: '0 0 24px rgba(249,115,22,0.12)' } : undefined}
                  >
                    {isBest && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-[#f97316] text-white whitespace-nowrap flex items-center gap-1.5">
                        <Star className="w-3 h-3" />
                        {t('calendar.bestNight')}
                      </div>
                    )}

                    <div className="text-center mb-5">
                      <div className="text-xs text-[#64748b] uppercase tracking-wider font-semibold">
                        {nightLabel(i, night.date)}
                      </div>
                      <div className="text-white font-semibold mt-0.5">{night.dateLabel}</div>
                    </div>

                    <div className="text-center mb-5">
                      <div className="text-6xl font-bold tabular-nums leading-none" style={{ color }}>
                        {night.auroraScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-[#64748b] uppercase tracking-wider mt-2">
                        {t('calendar.score')}
                      </div>
                      <div
                        className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {t(`calendar.${night.verdict}`)}
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-[#94a3b8]">
                          <Zap className="w-3.5 h-3.5 text-[#f97316]" />
                          {t('calendar.maxKp')}
                        </span>
                        <span className="font-bold text-white">{night.maxKp.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-[#94a3b8]">
                          <Cloud className="w-3.5 h-3.5" />
                          {t('calendar.clouds')}
                        </span>
                        <span className="font-bold text-white">{night.cloudCoverAvg}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#64748b] pt-1">
                        <span>{t('calendar.sunset')} {night.sunset}</span>
                        <span>{t('calendar.sunrise')} {night.sunrise}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="glass-surface rounded-xl px-5 py-4 border border-white/10 flex items-start gap-3">
              <Moon className="w-4 h-4 text-[#94a3b8] mt-0.5 shrink-0" />
              <p className="text-xs text-[#64748b] leading-relaxed">
                <span className="text-[#94a3b8] font-semibold">{t('calendar.scoreInfo')}</span>
                {' · '}{t('forecast.outlook.source')}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuroraCalendar;

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Zap, MapPin, Moon, Clock } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getSkyVisibility, SkyHour } from '../services/skyApi';
import { getKpForecast } from '../services/noaaApi';
import { calcAuroraVisibility } from '../utils/auroraVisibility';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';

interface ViewingHour extends SkyHour {
  kpForecast: number;
  auroraScore: number;
  overall: number;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

function scoreLabel(score: number, t: (k: string) => string): string {
  if (score >= 70) return t('viewingWindow.excellent');
  if (score >= 45) return t('viewingWindow.good');
  if (score >= 20) return t('viewingWindow.fair');
  return t('viewingWindow.poor');
}

function findBestWindow(
  hours: ViewingHour[],
  windowSize: number,
): { start: string; end: string; avg: number } | null {
  if (hours.length < windowSize) return null;
  let best = -1;
  let bestIdx = 0;
  for (let i = 0; i <= hours.length - windowSize; i++) {
    const avg =
      hours.slice(i, i + windowSize).reduce((s, h) => s + h.overall, 0) / windowSize;
    if (avg > best) {
      best = avg;
      bestIdx = i;
    }
  }
  return {
    start: hours[bestIdx].time,
    end: hours[Math.min(bestIdx + windowSize, hours.length - 1)].time,
    avg: Math.round(best),
  };
}

export default function ViewingWindow() {
  const { settings } = useSettings();
  const { t } = useLanguage();
  const lat = settings.preferredLat;
  const lon = settings.preferredLon;
  const locationName = settings.preferredLocationName;

  const [hours, setHours] = useState<ViewingHour[]>([]);
  const [sunset, setSunset] = useState('');
  const [sunrise, setSunrise] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (lat == null || lon == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [sky, kpForecast] = await Promise.all([
        getSkyVisibility(lat, lon, 0),
        getKpForecast(),
      ]);
      setSunset(sky.sunset);
      setSunrise(sky.sunrise);

      const enriched: ViewingHour[] = sky.nightHours.map((h) => {
        // Match to closest NOAA 3-hourly Kp forecast entry by timestamp
        const hTime = new Date(h.isoTime).getTime();
        const kpEntry = kpForecast.reduce<(typeof kpForecast)[0] | null>((best, entry) => {
          if (!best) return entry;
          const d1 = Math.abs(new Date(entry.time_tag).getTime() - hTime);
          const d2 = Math.abs(new Date(best.time_tag).getTime() - hTime);
          return d1 < d2 ? entry : best;
        }, null);
        const kpVal = kpEntry?.kp_index ?? 0;
        const auroraScore = calcAuroraVisibility(lat, lon, kpVal);
        const cloudScore = Math.max(0, 100 - h.cloudCover);
        const overall = Math.round(cloudScore * 0.5 + auroraScore * 0.5);
        return { ...h, kpForecast: kpVal, auroraScore, overall };
      });

      setHours(enriched);
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    load();
  }, [load]);

  const bestWindow = findBestWindow(hours, 3);
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: t('viewingWindow.title'), path: '/viewing-window' },
  ];

  if (!loading && (lat == null || lon == null)) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white p-6 pt-20">
        <PageMeta
        title={t('viewingWindow.meta.title')}
        description={t('viewingWindow.meta.description')}
        path="/viewing-window"
      />
        <div className="max-w-2xl mx-auto text-center py-20">
          <MapPin className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" />
          <p className="text-[#94a3b8] text-sm mb-4">{t('viewingWindow.noLocation')}</p>
          <Link
            to="/settings"
            className="inline-block px-6 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t('viewingWindow.setLocation')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 pt-16">
      <PageMeta
        title={t('viewingWindow.meta.title')}
        description={t('viewingWindow.meta.description')}
        path="/viewing-window"
      />
      <BreadcrumbSchema crumbs={crumbs} />

      {/* Header */}
      <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
        {locationName && (
          <div className="flex items-center gap-1.5 text-[#94a3b8] text-xs mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>{locationName}</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">{t('viewingWindow.title')}</h1>
        <p className="text-[#94a3b8] text-sm mt-1">{t('viewingWindow.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hours.length === 0 ? (
        <div className="px-4 max-w-2xl mx-auto py-10 text-center text-[#94a3b8] text-sm">
          {t('viewingWindow.noNightData')}
        </div>
      ) : (
        <>
          {/* Sunset / Sunrise + Best Window */}
          <div className="px-4 max-w-2xl mx-auto mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1e293b] rounded-xl p-3 text-center">
                <div className="text-xs text-[#94a3b8] mb-1">{t('viewingWindow.sunset')}</div>
                <div className="text-lg font-bold text-[#f97316]">{sunset}</div>
              </div>
              <div className="bg-[#1e293b] rounded-xl p-3 text-center">
                <div className="text-xs text-[#94a3b8] mb-1">{t('viewingWindow.sunrise')}</div>
                <div className="text-lg font-bold text-[#f59e0b]">{sunrise}</div>
              </div>
            </div>

            {bestWindow && (
              <div
                className="bg-[#1e293b] rounded-xl p-4 border"
                style={{ borderColor: scoreColor(bestWindow.avg) + '50' }}
              >
                <div className="text-xs text-[#94a3b8] mb-2">{t('viewingWindow.bestWindow')}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: scoreColor(bestWindow.avg) }} />
                    <span className="text-xl font-bold text-white">
                      {bestWindow.start} – {bestWindow.end}
                    </span>
                  </div>
                  <div
                    className="text-3xl font-bold tabular-nums"
                    style={{ color: scoreColor(bestWindow.avg) }}
                  >
                    {bestWindow.avg}
                    <span className="text-sm font-normal text-[#64748b] ml-0.5">/ 100</span>
                  </div>
                </div>
                <div className="text-sm mt-1 font-medium" style={{ color: scoreColor(bestWindow.avg) }}>
                  {scoreLabel(bestWindow.avg, t)}
                </div>
              </div>
            )}
          </div>

          {/* Hourly Timeline */}
          <div className="px-4 max-w-2xl mx-auto mb-3">
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex gap-1.5 pb-2" style={{ minWidth: 'max-content' }}>
                {hours.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i === selectedIdx ? null : i)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                    style={{
                      backgroundColor:
                        selectedIdx === i ? scoreColor(h.overall) + '25' : '#1e293b',
                      border: `1px solid ${
                        selectedIdx === i ? scoreColor(h.overall) : 'transparent'
                      }`,
                      minWidth: '54px',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: scoreColor(h.overall) + '20',
                        color: scoreColor(h.overall),
                      }}
                    >
                      {h.overall}
                    </div>
                    <span className="text-[10px] text-[#94a3b8] leading-tight">{h.time}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected hour detail */}
          {selectedIdx !== null && hours[selectedIdx] && (() => {
            const h = hours[selectedIdx];
            return (
              <div className="px-4 max-w-2xl mx-auto mb-4">
                <div className="bg-[#1e293b] rounded-xl p-4 border border-[#334155]">
                  <div className="text-sm font-semibold text-white mb-3">{h.time}</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <Cloud className="w-5 h-5 text-[#3b82f6] mx-auto mb-1" />
                      <div className="text-[10px] text-[#94a3b8] mb-0.5">{t('viewingWindow.cloud')}</div>
                      <div className="text-base font-bold text-white">{h.cloudCover}%</div>
                    </div>
                    <div className="text-center">
                      <Zap className="w-5 h-5 text-[#f97316] mx-auto mb-1" />
                      <div className="text-[10px] text-[#94a3b8] mb-0.5">{t('viewingWindow.kpLabel')}</div>
                      <div className="text-base font-bold text-white">{h.kpForecast.toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <Moon className="w-5 h-5 text-[#10b981] mx-auto mb-1" />
                      <div className="text-[10px] text-[#94a3b8] mb-0.5">{t('viewingWindow.aurora')}</div>
                      <div className="text-base font-bold text-white">{Math.round(h.auroraScore)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Legend */}
          <div className="px-4 max-w-2xl mx-auto">
            <div className="flex gap-4 flex-wrap">
              {(
                [
                  { score: 85, key: 'viewingWindow.excellent' },
                  { score: 55, key: 'viewingWindow.good' },
                  { score: 30, key: 'viewingWindow.fair' },
                  { score: 10, key: 'viewingWindow.poor' },
                ] as const
              ).map(({ score, key }) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: scoreColor(score) }}
                  />
                  {t(key)}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

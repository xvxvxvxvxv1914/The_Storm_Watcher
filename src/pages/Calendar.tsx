import { useEffect, useState, useCallback } from 'react';
import PageMeta from '../components/PageMeta';
import { CalendarDays, Cloud, Sparkles, Download } from 'lucide-react';
import { buildAuroraICS, downloadICS } from '../utils/icalExport';
import { Link } from 'react-router-dom';
import { getKpForecast, getKpGradientStyle } from '../services/noaaApi';
import { getNightsCloudCover, type NightForecast } from '../services/skyApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import LocationPicker from '../components/LocationPicker';
import { Skeleton } from '../components/Skeleton';
import { reverseGeocode } from '../utils/reverseGeocode';

interface ForecastItem {
  kp: number;
  date: Date;
}

interface NightDetail extends NightForecast {
  hourlyKp: { hour: number; kp: number }[];
  dateLabel: string;
}

const NIGHT_START = 20;
const NIGHT_END = 6;

const getKpColor = (kp: number) =>
  kp >= 7 ? '#ef4444' : kp >= 5 ? '#f97316' : kp >= 4 ? '#eab308' : kp >= 2 ? '#10b981' : '#059669';

const getGLevel = (kp: number) => {
  if (kp >= 9) return { label: 'G5', color: '#dc2626' };
  if (kp >= 7) return { label: 'G3', color: '#f97316' };
  if (kp >= 5) return { label: 'G1', color: '#fbbf24' };
  if (kp >= 3) return { label: 'Kp 3+', color: '#10b981' };
  return { label: 'Quiet', color: '#64748b' };
};

export default function Calendar() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [nights, setNights] = useState<NightDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [lat, setLat] = useState<number>(settings.preferredLat ?? 42.7);
  const [lon, setLon] = useState<number>(settings.preferredLon ?? 23.3);
  const [locationName, setLocationName] = useState<string>(settings.preferredLocationName || '');
  const hasLocation = settings.preferredLat !== null && settings.preferredLon !== null;

  const buildNights = useCallback(async (useLat: number | null, useLon: number | null): Promise<void> => {
    setLoading(true);
    try {
      const kpData = await getKpForecast();
      const forecastData: ForecastItem[] = (kpData ?? []).map(item => ({
        kp: item.kp_index || item.estimated_kp || 0,
        date: new Date(item.time_tag),
      }));

      const labels: NightForecast['label'][] = ['tonight', 'tomorrow', 'nightAfter'];
      const today = new Date();
      const kpByNight: { date: Date; maxKp: number; hourly: { hour: number; kp: number }[] }[] = [];

      for (let d = 0; d < 3; d++) {
        const target = new Date(today);
        target.setDate(today.getDate() + d);
        const targetStr = target.toDateString();
        const next = new Date(target);
        next.setDate(target.getDate() + 1);
        const nextStr = next.toDateString();

        const nightItems = forecastData.filter(item => {
          const h = item.date.getHours();
          return (item.date.toDateString() === targetStr && h >= NIGHT_START) ||
                 (item.date.toDateString() === nextStr && h < NIGHT_END);
        });

        const maxKp = nightItems.length > 0 ? Math.max(...nightItems.map(i => i.kp)) : 0;
        const hourly = nightItems.map(i => ({ hour: i.date.getHours(), kp: i.kp }));
        kpByNight.push({ date: target, maxKp, hourly });
      }

      let cloudNights: { date: Date; cloudCoverAvg: number }[] = [];
      if (useLat !== null && useLon !== null) {
        try { cloudNights = await getNightsCloudCover(useLat, useLon); } catch { /* no cloud data */ }
      }

      const combined: NightDetail[] = kpByNight.map((n, i) => {
        const cloud = cloudNights[i];
        const d = n.date;
        return {
          label: labels[i],
          date: n.date,
          maxKp: n.maxKp,
          cloudCoverAvg: cloud ? cloud.cloudCoverAvg : null,
          isBest: false,
          hourlyKp: n.hourly,
          dateLabel: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
        };
      });

      const scored = combined.map(n => ({
        score: (n.maxKp / 9) * 60 + (n.cloudCoverAvg !== null ? (100 - n.cloudCoverAvg) / 100 * 40 : (n.maxKp / 9) * 40),
      }));
      const bestIdx = scored.reduce((bi, s, i) => s.score > scored[bi].score ? i : bi, 0);
      combined[bestIdx].isBest = true;
      setNights(combined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buildNights(hasLocation ? lat : null, hasLocation ? lon : null);
  }, [lat, lon, hasLocation, buildNights]);

  const handleSelect = useCallback((newLat: number, newLon: number, name: string) => {
    setLat(newLat);
    setLon(newLon);
    setLocationName(name);
  }, []);

  const handleRequestGPS = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      setLat(latitude);
      setLon(longitude);
      setLocationName(await reverseGeocode(latitude, longitude));
    });
  }, []);

  const nightLabel = (label: NightForecast['label']) =>
    label === 'tonight' ? t('aurora.calendar.tonight') :
    label === 'tomorrow' ? t('aurora.calendar.tomorrow') :
    t('aurora.calendar.nightAfter');

  return (
    <div className="min-h-screen px-4 py-20 max-w-5xl mx-auto">
      <PageMeta
        title="Aurora Calendar — The Storm Watcher"
        description="3-night aurora viewing outlook with Kp forecast and cloud cover. Find your best night to watch the northern lights."
        path="/calendar"
        ogKp={nights.length > 0 ? Math.max(...nights.map(n => n.maxKp)) : undefined}
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-2xl flex items-center justify-center flex-shrink-0">
          <CalendarDays className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{t('aurora.calendar.title')}</h1>
          <p className="text-[#94a3b8] mt-0.5">{t('aurora.calendar.subtitle')}</p>
        </div>
        {nights.some(n => n.maxKp >= 3) && (
          <button
            onClick={() => {
              const ics = buildAuroraICS(nights, locationName);
              downloadICS(ics, `aurora-calendar-${new Date().toISOString().slice(0, 10)}.ics`);
            }}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
            aria-label={t('aurora.calendar.exportICal') || 'Export to calendar'}
          >
            <Download className="w-3.5 h-3.5" />
            {t('aurora.calendar.exportICal') || 'Add to Calendar'}
          </button>
        )}
      </div>

      {/* Location picker */}
      <div className="mb-3">
        <LocationPicker
          lat={lat}
          lon={lon}
          locationName={locationName}
          onSelect={handleSelect}
          onRequestGPS={handleRequestGPS}
        />
      </div>
      {!hasLocation && (
        <p className="text-[#475569] text-xs mb-6">
          {t('aurora.calendar.noLocationHint') || 'No location saved — cloud cover not available. Set a location above or in'}{' '}
          <Link to="/settings" className="text-[#10b981] hover:underline">{t('nav.settings') || 'Settings'}</Link>.
        </p>
      )}

      {/* Night cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {nights.map(night => {
            const g = getGLevel(night.maxKp);
            const cloud = night.cloudCoverAvg;
            const cloudLabel = cloud === null ? null : cloud < 30 ? t('aurora.calendar.clear') : cloud < 70 ? t('aurora.calendar.partlyCloudy') : t('aurora.calendar.overcast');
            const maxBar = Math.max(...night.hourlyKp.map(h => h.kp), 1);

            return (
              <div
                key={night.label}
                className={`relative rounded-2xl p-6 border transition-all ${
                  night.isBest
                    ? 'border-[#10b981]/50 bg-[#10b981]/5'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {night.isBest && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full bg-[#10b981] text-white whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {t('aurora.calendar.bestNight')}
                  </span>
                )}

                {/* Night label + date */}
                <div className="mb-4">
                  <div className="text-sm font-bold text-white uppercase tracking-wider">
                    {nightLabel(night.label)}
                  </div>
                  <div className="text-xs text-[#64748b] mt-0.5">{night.dateLabel}</div>
                </div>

                {/* Kp + G-level */}
                <div className="flex items-end gap-3 mb-4">
                  <div className="text-5xl font-bold leading-none" style={getKpGradientStyle(night.maxKp)}>
                    {night.maxKp.toFixed(1)}
                  </div>
                  <div>
                    <div className="text-xs text-[#64748b] uppercase tracking-wider mb-1">{t('aurora.calendar.maxKp')}</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${g.color}22`, color: g.color }}>
                      {g.label}
                    </span>
                  </div>
                </div>

                {/* Hourly Kp mini-bars */}
                {night.hourlyKp.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-[#475569] mb-2 uppercase tracking-wider">Hourly Kp</div>
                    <div className="flex items-end gap-0.5 h-10">
                      {night.hourlyKp.map((h, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                          <div
                            className="w-full rounded-sm min-h-[2px] transition-all"
                            style={{
                              height: `${Math.max((h.kp / maxBar) * 36, 2)}px`,
                              background: getKpColor(h.kp),
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-[#334155]">20:00</span>
                      <span className="text-[9px] text-[#334155]">06:00</span>
                    </div>
                  </div>
                )}

                {/* Cloud cover */}
                {cloud !== null ? (
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <Cloud className="w-4 h-4 text-[#64748b] flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#94a3b8]">{cloudLabel}</span>
                        <span className="text-[#64748b]">{cloud}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${cloud}%`,
                            background: cloud < 30 ? '#10b981' : cloud < 70 ? '#fbbf24' : '#64748b',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5 text-xs text-[#475569]">
                    <Cloud className="w-4 h-4 flex-shrink-0" />
                    <span>{t('aurora.calendar.noLocation')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile export */}
      {nights.some(n => n.maxKp >= 3) && (
        <button
          onClick={() => {
            const ics = buildAuroraICS(nights, locationName);
            downloadICS(ics, `aurora-calendar-${new Date().toISOString().slice(0, 10)}.ics`);
          }}
          className="sm:hidden mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white"
        >
          <Download className="w-4 h-4" />
          {t('aurora.calendar.exportICal') || 'Add to Calendar'}
        </button>
      )}

      {/* Tips */}
      <div className="mt-8 glass-surface rounded-2xl p-5 border border-white/10 text-sm text-[#64748b] leading-relaxed">
        <p>
          <span className="text-white font-semibold">Kp ≥ 5</span> — visible at mid-latitudes (50°N+). &nbsp;
          <span className="text-white font-semibold">Kp ≥ 7</span> — visible further south (45°N+). &nbsp;
          Best viewing: 10 PM – 2 AM local time, clear dark skies, away from city lights.
        </p>
      </div>
    </div>
  );
}

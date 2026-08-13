import { useEffect, useState, useCallback } from 'react';
import PageMeta from '../components/PageMeta';
import StarField from '../components/StarField';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { CalendarDays, Cloud, Sparkles, Download, Sun } from 'lucide-react';
import { buildAuroraICS, downloadICS } from '../utils/icalExport';
import { Link } from 'react-router-dom';
import { getKpForecast, getKpGradientStyle, resolveKp } from '../services/noaaApi';
import { getNightsCloudCover, type NightForecast, type NightWindow } from '../services/skyApi';
import { calcAuroraVisibility } from '../utils/auroraVisibility';
import { parseNoaaTime } from '../utils/noaaTime';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import LocationPicker from '../components/LocationPicker';
import { Skeleton } from '../components/Skeleton';
import { reverseGeocode } from '../utils/reverseGeocode';
import { getCurrentPosition } from '../utils/geolocation';

interface ForecastItem {
  kp: number;
  date: Date;
}

interface NightDetail extends NightForecast {
  hourlyKp: { hour: number; kp: number }[];
  dateLabel: string;
  auroraChance: number | null; // % at user's lat/lon for this night's peak Kp
  /** The sun never sets here tonight — there is no night to rate. */
  noNight: boolean;
}

const NIGHT_START = 20;
const NIGHT_END = 6;

const getKpColor = (kp: number) =>
  kp >= 7 ? '#ef4444' : kp >= 5 ? '#f97316' : kp >= 4 ? '#eab308' : kp >= 2 ? '#10b981' : '#059669';

// G-scale is one level per Kp step from 5 up; colours follow the KpGauge bands.
const getGLevel = (kp: number, t: (k: string) => string) => {
  if (kp >= 9) return { label: 'G5', color: '#dc2626' };
  if (kp >= 8) return { label: 'G4', color: '#ef4444' };
  if (kp >= 7) return { label: 'G3', color: '#ef4444' };
  if (kp >= 6) return { label: 'G2', color: '#f97316' };
  if (kp >= 5) return { label: 'G1', color: '#f97316' };
  if (kp >= 4) return { label: 'Kp 4+', color: '#eab308' };
  if (kp >= 3) return { label: 'Kp 3+', color: '#10b981' };
  return { label: t('calendar.activity.quiet'), color: '#64748b' };
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
        kp: resolveKp(item) ?? 0,
        // parseNoaaTime, not new Date: the stamps carry no offset, so the naked
        // constructor read them as local and grouped the "nights" below three
        // hours off for anyone outside UTC. getHours() then correctly reports
        // the visitor's local hour for that UTC instant, which is what a night
        // window wants.
        date: parseNoaaTime(item.time_tag),
      }));

      const labels: NightForecast['label'][] = ['tonight', 'tomorrow', 'nightAfter'];
      const today = new Date();

      // Fetched before the Kp bucketing, not after, because it is what defines a
      // "night". The old code bucketed against a hardcoded 20:00-06:00, which
      // above ~60° is wrong in both directions: broad daylight in summer, and
      // hours too late in winter, when Tromsø is already dark by 14:00.
      let cloudNights: NightWindow[] = [];
      if (useLat !== null && useLon !== null) {
        try { cloudNights = await getNightsCloudCover(useLat, useLon); } catch { /* no sky data */ }
      }

      const kpByNight: { date: Date; maxKp: number; hourly: { hour: number; kp: number }[] }[] = [];

      for (let d = 0; d < 3; d++) {
        const target = new Date(today);
        target.setDate(today.getDate() + d);
        const sky = cloudNights[d];

        let nightItems: ForecastItem[];
        if (sky?.noNight) {
          // The sun does not set. There is no night to report a peak for.
          nightItems = [];
        } else if (sky?.nightStart && sky.nightEnd) {
          nightItems = forecastData.filter(i => i.date >= sky.nightStart! && i.date <= sky.nightEnd!);
        } else {
          // No location, or the sky feed failed — fall back to the fixed window.
          const targetStr = target.toDateString();
          const next = new Date(target);
          next.setDate(target.getDate() + 1);
          const nextStr = next.toDateString();
          nightItems = forecastData.filter(item => {
            const h = item.date.getHours();
            return (item.date.toDateString() === targetStr && h >= NIGHT_START) ||
                   (item.date.toDateString() === nextStr && h < NIGHT_END);
          });
        }

        const maxKp = nightItems.length > 0 ? Math.max(...nightItems.map(i => i.kp)) : 0;
        const hourly = nightItems.map(i => ({ hour: i.date.getHours(), kp: i.kp }));
        kpByNight.push({ date: target, maxKp, hourly });
      }

      const combined: NightDetail[] = kpByNight.map((n, i) => {
        const cloud = cloudNights[i];
        const d = n.date;
        // No darkness, no chance to state — the row is hidden rather than
        // showing a residual percentage next to "midnight sun". On a real night
        // the peak Kp already comes only from dark hours, so the geomagnetic
        // figure is the right one here.
        const auroraChance = cloud?.noNight || useLat === null || useLon === null
          ? null
          : calcAuroraVisibility(useLat, useLon, n.maxKp);
        return {
          label: labels[i],
          date: n.date,
          maxKp: n.maxKp,
          cloudCoverAvg: cloud?.cloudCoverAvg ?? null,
          noNight: cloud?.noNight ?? false,
          isBest: false,
          hourlyKp: n.hourly,
          dateLabel: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
          auroraChance,
        };
      });

      // If we have location-aware aurora data, weight it 60% aurora + 40% sky;
      // otherwise fall back to global Kp proxy.
      const scored = combined.map(n => {
        // A night the sun never leaves cannot be the best one, whatever the Kp.
        if (n.noNight) return { score: -1 };
        const aurora = n.auroraChance ?? (n.maxKp / 9) * 100;
        const sky = n.cloudCoverAvg !== null ? (100 - n.cloudCoverAvg) : aurora * 0.7;
        return { score: aurora * 0.6 + sky * 0.4 };
      });
      const bestIdx = scored.reduce((bi, s, i) => s.score > scored[bi].score ? i : bi, 0);
      // When every night scores below zero they are all sunlit, and the reduce
      // still returns index 0 — crowning a "best night" that has no night in it.
      if (scored[bestIdx].score >= 0) combined[bestIdx].isBest = true;
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
    getCurrentPosition().then(async pos => {
      const { latitude, longitude } = pos.coords;
      setLat(latitude);
      setLon(longitude);
      setLocationName(await reverseGeocode(latitude, longitude));
    }).catch(() => {});
  }, []);

  const nightLabel = (label: NightForecast['label']) =>
    label === 'tonight' ? t('aurora.calendar.tonight') :
    label === 'tomorrow' ? t('aurora.calendar.tomorrow') :
    t('aurora.calendar.nightAfter');

  return (
    <div className="min-h-screen px-4 pt-20 pb-24 max-w-5xl mx-auto relative">
      <StarField />
      <PageMeta
        title="Aurora Calendar — The Storm Watcher"
        description="3-night aurora viewing outlook with Kp forecast and cloud cover. Find your best night to watch the northern lights."
        path="/calendar"
        ogKp={nights.length > 0 ? Math.max(...nights.map(n => n.maxKp)) : undefined}
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Aurora Calendar', path: '/calendar' }]} />

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
            const g = getGLevel(night.maxKp, t);
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
                    <div className="text-xs text-[#475569] mb-2 uppercase tracking-wider">{t('aurora.calendar.hourlyKp') || 'Hourly Kp'}</div>
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

                {/* Cloud cover — or the reason there is none. A night the sun
                    never leaves used to render as "Overcast 100%", which was a
                    claim about the sky rather than the truth: there is no night. */}
                {night.noNight ? (
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5 text-xs text-[#eab308]">
                    <Sun className="w-4 h-4 flex-shrink-0" />
                    <span>{t('aurora.calendar.noNight') || 'Midnight sun — no darkness tonight'}</span>
                  </div>
                ) : cloud !== null ? (
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

                {/* Aurora chance at the user's location */}
                {night.auroraChance !== null && (
                  <div className="flex items-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-[#10b981] flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#94a3b8]">{t('sky.auroraChance')}</span>
                        <span style={{ color: night.auroraChance >= 50 ? '#10b981' : night.auroraChance >= 20 ? '#eab308' : '#f97316' }}>
                          {night.auroraChance}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${night.auroraChance}%`,
                            background: night.auroraChance >= 50 ? '#10b981' : night.auroraChance >= 20 ? '#eab308' : '#f97316',
                          }}
                        />
                      </div>
                    </div>
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
          {t('aurora.calendar.tipsKp5') || (
            <><span className="text-white font-semibold">Kp ≥ 5</span> — visible at mid-latitudes (50°N+).</>
          )}
          {' '}
          {t('aurora.calendar.tipsKp7') || (
            <><span className="text-white font-semibold">Kp ≥ 7</span> — visible further south (45°N+).</>
          )}
          {' '}
          {t('aurora.calendar.tipsBestViewing') || 'Best viewing: 10 PM – 2 AM local time, clear dark skies, away from city lights.'}
        </p>
      </div>
    </div>
  );
}

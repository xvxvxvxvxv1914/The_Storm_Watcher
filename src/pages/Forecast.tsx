import { useEffect, useMemo, useState, useCallback } from 'react';
import { useVisibilityInterval } from '../hooks/useVisibilityInterval';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import TimeSeriesChart, { type TsPoint } from '../components/charts/TimeSeriesChart';
import {
  Calendar, TrendingUp, AlertCircle, Sun, Sparkles, Cloud, Radio, Zap, Activity,
  ExternalLink, ChevronDown, Star, Lock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePaymentGate } from '../hooks/usePaymentGate';
import {
  getKpForecast, getKpHistory3Day, get27DayOutlook, getStormStatus, getKpGradientStyle,
  getSpaceWeatherOutlook, type SpaceWeatherOutlook, type DayOutlook,
} from '../services/noaaApi';
import { getNightsCloudCover, type NightForecast } from '../services/skyApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import StarField from '../components/StarField';
import { Skeleton, SkeletonChart } from '../components/Skeleton';
import ErrorCard from '../components/ErrorCard';
import { useChartHeight } from '../hooks/useChartHeight';

interface ForecastItem {
  time: string;
  fullTime: string;
  kp: number;
  date: Date;
}

interface DayForecast {
  date: Date;
  maxKp: number;
  hourly: ForecastItem[] | null;
  source: 'detailed' | 'outlook';
  apIndex?: number;
}

const Forecast = () => {
  const { t, language } = useLanguage();
  const { settings } = useSettings();
  const { hasPro } = usePaymentGate();
  const chartH = useChartHeight(190, 300);
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
  const [outlook27, setOutlook27] = useState<DayOutlook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [, setLastUpdated] = useState<Date>(new Date());
  const [showYesterday, setShowYesterday] = useState(false);
  const [historyRaw, setHistoryRaw] = useState<{ time_tag: string; Kp: number }[]>([]);
  const [nights, setNights] = useState<NightForecast[]>([]);
  const [outlook, setOutlook] = useState<SpaceWeatherOutlook | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showLongRange, setShowLongRange] = useState(false);

  const fetchForecast = useCallback(async () => {
    setError(false);
    try {
      const kpData = await getKpForecast();
      const formattedData = (kpData ?? []).map((item) => {
        const date = new Date(item.time_tag);
        return {
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullTime: date.toLocaleString(),
          kp: item.kp_index ?? item.estimated_kp ?? 0,
          date: date,
        };
      });
      if (formattedData.length === 0) throw new Error('empty');
      setForecastData(formattedData);
      setLastUpdated(new Date());
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForecast(); }, [fetchForecast]);
  useVisibilityInterval(fetchForecast, 300000);
  const { pulling, pullY } = usePullToRefresh(fetchForecast);

  useEffect(() => {
    getSpaceWeatherOutlook().then(data => { if (data) setOutlook(data); }).catch(() => {});
    get27DayOutlook().then(data => { if (data && data.length > 0) setOutlook27(data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showYesterday || historyRaw.length > 0) return;
    getKpHistory3Day().then(data => { if (data) setHistoryRaw(data); }).catch(() => {});
  }, [showYesterday, historyRaw.length]);

  // Build unified day-by-day view: detailed for first 3, outlook for the rest
  const sevenDays: DayForecast[] = useMemo(() => {
    if (forecastData.length === 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: DayForecast[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + i);
      const ds = dayDate.toDateString();
      const hourly = forecastData.filter(f => {
        const d = new Date(f.date);
        d.setHours(0, 0, 0, 0);
        return d.toDateString() === ds;
      });
      if (hourly.length >= 4) {
        result.push({
          date: dayDate,
          maxKp: Math.max(...hourly.map(h => h.kp)),
          hourly,
          source: 'detailed',
        });
      } else {
        const ol = outlook27.find(o => {
          const od = new Date(o.date);
          od.setHours(0, 0, 0, 0);
          return od.toDateString() === ds;
        });
        if (ol) {
          result.push({
            date: dayDate,
            maxKp: ol.largestKp,
            hourly: null,
            source: 'outlook',
            apIndex: ol.apIndex,
          });
        }
      }
    }
    return result;
  }, [forecastData, outlook27]);

  const longRangeDays: DayOutlook[] = useMemo(() => {
    if (outlook27.length === 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return outlook27.filter(o => {
      const d = new Date(o.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= today.getTime();
    });
  }, [outlook27]);

  // Aurora Calendar — 3 nights
  useEffect(() => {
    if (forecastData.length === 0) return;
    const buildNights = async () => {
      const NIGHT_START = 20, NIGHT_END = 6;
      const labels: NightForecast['label'][] = ['tonight', 'tomorrow', 'nightAfter'];
      const kpByDateNight: { date: Date; maxKp: number }[] = [];
      const today = new Date();
      for (let d = 0; d < 3; d++) {
        const target = new Date(today);
        target.setDate(today.getDate() + d);
        const targetDate = target.toDateString();
        const nextDate = new Date(target);
        nextDate.setDate(target.getDate() + 1);
        const nextDateStr = nextDate.toDateString();
        const nightItems = forecastData.filter(item => {
          const h = item.date.getHours();
          return (item.date.toDateString() === targetDate && h >= NIGHT_START) ||
                 (item.date.toDateString() === nextDateStr && h < NIGHT_END);
        });
        const maxKp = nightItems.length > 0 ? Math.max(...nightItems.map(i => i.kp)) : 0;
        kpByDateNight.push({ date: target, maxKp });
      }
      let cloudNights: { date: Date; cloudCoverAvg: number }[] = [];
      const { preferredLat: lat, preferredLon: lon } = settings;
      if (lat !== null && lon !== null) {
        try { cloudNights = await getNightsCloudCover(lat, lon); } catch { /* ignore */ }
      }
      const combined: NightForecast[] = kpByDateNight.map((n, i) => {
        const cloud = cloudNights[i];
        return {
          label: labels[i], date: n.date, maxKp: n.maxKp,
          cloudCoverAvg: cloud ? cloud.cloudCoverAvg : null, isBest: false,
        };
      });
      const scored = combined.map(n => ({
        ...n,
        score: (n.maxKp / 9) * 60 + (n.cloudCoverAvg !== null ? (100 - n.cloudCoverAvg) / 100 * 40 : (n.maxKp / 9) * 40),
      }));
      const bestIdx = scored.reduce((bi, s, i) => s.score > scored[bi].score ? i : bi, 0);
      combined[bestIdx].isBest = true;
      setNights(combined);
    };
    buildNights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastData, settings.preferredLat, settings.preferredLon]);

  const yesterdayForecastChart = useMemo((): TsPoint[] => {
    if (!showYesterday || historyRaw.length === 0) return [];
    const nowSec = Date.now() / 1000;
    const windowStart = nowSec - 48 * 3600;
    const windowEnd = nowSec - 24 * 3600;
    return historyRaw
      .map(item => ({
        time: Math.floor(new Date(item.time_tag.replace(' ', 'T') + 'Z').getTime() / 1000) as TsPoint['time'],
        value: item.Kp ?? 0,
      }))
      .filter(p => p.time >= windowStart && p.time <= windowEnd)
      .map(p => ({ time: (p.time + 86400) as TsPoint['time'], value: p.value }))
      .sort((a, b) => a.time - b.time);
  }, [showYesterday, historyRaw]);

  const forecastChartData: TsPoint[] = [...forecastData]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(item => ({
      time: Math.floor(item.date.getTime() / 1000) as TsPoint['time'],
      value: parseFloat(item.kp.toFixed(2)),
    }));

  // Hero stats from 7-day view
  const peakKp7 = sevenDays.length > 0 ? Math.max(...sevenDays.map(d => d.maxKp)) : 0;
  const bestDay = sevenDays.length > 0
    ? sevenDays.reduce((best, d) => d.maxKp > best.maxKp ? d : best, sevenDays[0])
    : null;
  const stormDaysCount = sevenDays.filter(d => d.maxKp >= 5).length;

  if (!loading && error) {
    return (
      <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
        <StarField />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ErrorCard onRetry={fetchForecast} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
        <StarField />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Skeleton className="h-12 w-80 mb-3" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-6 mb-4 sm:mb-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-surface rounded-2xl p-3 sm:p-6 border border-white/5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <SkeletonChart className="mb-6" />
        </div>
      </div>
    );
  }

  const formatWeekday = (d: Date) => d.toLocaleDateString(language, { weekday: 'short' });
  const formatMonthDay = (d: Date) => d.toLocaleDateString(language, { month: 'short', day: 'numeric' });
  const isToday = (d: Date) => {
    const t = new Date();
    return d.toDateString() === t.toDateString();
  };
  const isTomorrow = (d: Date) => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return d.toDateString() === t.toDateString();
  };

  const kpBarColor = (kp: number): string => {
    if (kp >= 7) return '#ef4444';
    if (kp >= 5) return '#f97316';
    if (kp >= 4) return '#eab308';
    if (kp >= 2) return '#10b981';
    return '#059669';
  };

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
      {pulling && (
        <div
          className="fixed top-16 left-1/2 z-[100] flex items-center justify-center w-9 h-9 rounded-full bg-[#10b981]/20 border border-[#10b981]/40"
          style={{ transform: `translateX(-50%) translateY(${pullY}px)` }}
        >
          <div className="w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <PageMeta
        title="Kp Index Forecast — The Storm Watcher"
        description="7-day Kp forecast + 27-day long-range outlook from NOAA. Plan your aurora viewing."
        path="/forecast"
        ogKp={peakKp7}
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Forecast', path: '/forecast' }]} />
      <StarField />
      <div className="magnetic-orb" style={{ top: '200px', left: '-200px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 md:mb-10">
          <h1 className="text-3xl sm:text-5xl font-bold gradient-solar mb-2 sm:mb-3 tracking-tight">
            {t('forecast.title')}
          </h1>
          <p className="text-[#94a3b8] text-base sm:text-lg">{t('forecast.subtitle')}</p>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className={`glass-surface rounded-2xl p-3 sm:p-6 ${peakKp7 >= 5 ? 'glow-red' : 'glow-green'}`}>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-[#ef4444] to-[#dc2626] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-[10px] sm:text-xs font-bold tracking-wide">{t('forecast.peakKpNext7')}</h3>
            </div>
            <div className="text-2xl sm:text-5xl font-bold mb-0.5 sm:mb-1" style={getKpGradientStyle(peakKp7)}>{peakKp7.toFixed(1)}</div>
            <div className="text-[#64748b] text-[10px] sm:text-xs">{t(getStormStatus(peakKp7).statusKey)}</div>
          </div>

          <div className="glass-surface rounded-2xl p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-lg flex items-center justify-center">
                <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-[10px] sm:text-xs font-bold tracking-wide">{t('forecast.bestDayLabel')}</h3>
            </div>
            <div className="text-base sm:text-3xl font-bold text-white mb-0.5 sm:mb-1 leading-tight">
              {bestDay ? formatWeekday(bestDay.date) : '—'}
            </div>
            <div className="text-[#64748b] text-[10px] sm:text-xs">
              {bestDay ? `${formatMonthDay(bestDay.date)} · Kp ${bestDay.maxKp.toFixed(1)}` : ''}
            </div>
          </div>

          <div className={`glass-surface rounded-2xl p-3 sm:p-6 ${stormDaysCount > 0 ? 'glow-orange' : ''}`}>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-lg flex items-center justify-center">
                <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-[10px] sm:text-xs font-bold tracking-wide">{t('forecast.stormDaysCount')}</h3>
            </div>
            <div className="text-2xl sm:text-5xl font-bold text-white mb-0.5 sm:mb-1">{stormDaysCount}</div>
            <div className="text-[#64748b] text-[10px] sm:text-xs">{t('forecast.sevenDayTitle').toLowerCase()}</div>
          </div>
        </div>

        {/* 3-day Kp Chart */}
        <div className="glass-surface rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <Sun className="w-5 h-5 text-[#f97316]" />
              {t('forecast.kpForecast')}
            </h3>
            <button
              onClick={() => setShowYesterday(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showYesterday
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'glass-surface text-[#94a3b8] hover:text-white'
              }`}
            >
              {t('dashboard.compareYesterday')}
            </button>
          </div>
          {forecastChartData.length > 0 ? (
            <TimeSeriesChart
              data={forecastChartData}
              color="#f97316"
              type="area"
              height={chartH}
              yMin={0}
              yMax={9}
              refLines={[
                { value: 5, color: '#f59e0b', label: 'G1' },
                { value: 7, color: '#ef4444', label: 'G3' },
              ]}
              compareData={yesterdayForecastChart.length > 0 ? yesterdayForecastChart : undefined}
              compareLabel={t('dashboard.yesterday')}
              ariaLabel="Kp forecast — next 3 days"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-[#94a3b8]">{t('dashboard.noData')}</div>
          )}
          <div className="mt-3 flex justify-end">
            <Link to="/aurora-map" className="text-xs text-[#10b981] hover:text-[#34d399] transition-colors font-medium">
              {t('forecast.viewAuroraMap') || 'See aurora visibility map →'}
            </Link>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="glass-surface rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="mb-4 sm:mb-5">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#10b981]" />
              {t('forecast.sevenDayTitle')}
            </h3>
            <p className="text-[#64748b] text-xs sm:text-sm mt-1">{t('forecast.sevenDaySubtitle')}</p>
          </div>

          <div className="space-y-2">
            {sevenDays.map((day, dayIndex) => {
              if (!hasPro && dayIndex >= 3) return null;
              const key = day.date.toDateString();
              const expanded = expandedDay === key;
              const status = getStormStatus(day.maxKp);
              const isPeak = bestDay && day.date.toDateString() === bestDay.date.toDateString() && day.maxKp >= 4;
              const today = isToday(day.date);
              const tomorrow = isTomorrow(day.date);
              const dayLabel = today ? t('forecast.todayLabel') : tomorrow ? t('forecast.tomorrowLabel') : formatWeekday(day.date);
              const bgColor = kpBarColor(day.maxKp);

              return (
                <div
                  key={key}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isPeak
                      ? 'border-[#f97316]/40 bg-[#f97316]/5'
                      : day.maxKp >= 5
                        ? 'border-orange-500/20 bg-orange-500/5'
                        : 'border-white/8 bg-white/3'
                  }`}
                >
                  {/* Day row */}
                  <button
                    onClick={() => day.hourly && setExpandedDay(expanded ? null : key)}
                    disabled={!day.hourly}
                    className={`w-full flex items-center gap-3 p-3 sm:p-4 ${day.hourly ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'} transition-colors`}
                  >
                    {/* Day label */}
                    <div className="w-20 sm:w-24 shrink-0 text-left">
                      <div className={`text-sm sm:text-base font-bold ${today ? 'text-[#10b981]' : 'text-white'}`}>{dayLabel}</div>
                      <div className="text-[10px] sm:text-xs text-[#64748b]">{formatMonthDay(day.date)}</div>
                    </div>

                    {/* Kp visualization bar */}
                    <div className="flex-1 min-w-0">
                      <div className="relative h-6 sm:h-7 bg-white/5 rounded-md overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 transition-all duration-500"
                          style={{ width: `${Math.min((day.maxKp / 9) * 100, 100)}%`, background: `linear-gradient(90deg, ${bgColor}aa, ${bgColor})` }}
                        />
                        {/* G1/G3 markers */}
                        <div className="absolute inset-y-0 border-l border-yellow-500/40" style={{ left: `${(5/9)*100}%` }} />
                        <div className="absolute inset-y-0 border-l border-red-500/40" style={{ left: `${(7/9)*100}%` }} />
                      </div>
                    </div>

                    {/* Kp number */}
                    <div className="w-12 sm:w-14 shrink-0 text-right">
                      <div className="text-lg sm:text-2xl font-bold" style={getKpGradientStyle(day.maxKp)}>{day.maxKp.toFixed(1)}</div>
                    </div>

                    {/* Status badge */}
                    <div className="hidden sm:flex w-28 shrink-0 justify-end">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${status.bgColor} ${status.color}`}>
                        {t(status.statusKey)}
                      </span>
                    </div>

                    {/* Best/Expand */}
                    <div className="w-7 sm:w-8 shrink-0 flex justify-end">
                      {isPeak ? (
                        <Star className="w-4 h-4 text-[#f97316] fill-[#f97316]" />
                      ) : day.hourly ? (
                        <ChevronDown className={`w-4 h-4 text-[#64748b] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      ) : (
                        <span className="text-[9px] text-[#475569] font-medium">{t('forecast.outlookSource')}</span>
                      )}
                    </div>
                  </button>

                  {/* Expanded 3-hour breakdown */}
                  {expanded && day.hourly && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2 pt-3 border-t border-white/5">
                        {day.hourly.map((item, idx) => (
                          <div key={idx} className="bg-white/4 rounded-md p-2 text-center">
                            <div className="text-[10px] text-[#94a3b8] mb-1">
                              {item.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </div>
                            <div className="text-sm sm:text-base font-bold" style={getKpGradientStyle(item.kp)}>
                              {item.kp.toFixed(1)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!hasPro && (
              <div className="rounded-xl border border-[#f97316]/25 bg-[#f97316]/5 p-6 flex flex-col items-center text-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#f9731620', border: '1px solid #f9731630' }}>
                  <Lock className="w-5 h-5" style={{ color: '#f97316' }} />
                </div>
                <div>
                  <div className="text-white font-bold text-sm mb-1">{t('forecast.proGateTitle') || '4 more days — Pro feature'}</div>
                  <div className="text-[#64748b] text-xs">{t('forecast.proGateDesc') || 'Upgrade to Pro for the full 7-day Kp forecast'}</div>
                </div>
                <Link
                  to="/pricing"
                  className="inline-block px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 hover:shadow-lg"
                  style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
                >
                  {t('pricing.tryProFree') || 'Try Pro free for 14 days'}
                </Link>
                <p className="text-[#475569] text-xs">{t('home.noCC') || '— no credit card required'}</p>
              </div>
            )}
          </div>
        </div>

        {/* 27-Day Long-Range */}
        {longRangeDays.length > 0 && (
          <div className="glass-surface rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6">
            <button
              onClick={() => setShowLongRange(v => !v)}
              className="w-full flex items-center justify-between gap-3 group"
            >
              <div className="text-left">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-[#a855f7]" />
                  {t('forecast.longRangeTitle')}
                </h3>
                <p className="text-[#64748b] text-xs sm:text-sm mt-1">{t('forecast.longRangeSubtitle')}</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-[#94a3b8] transition-transform shrink-0 ${showLongRange ? 'rotate-180' : ''}`} />
            </button>

            {showLongRange && (
              <>
                {/* Summary stats: avg Ap, avg F10.7, peak Kp */}
                <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-lg bg-white/4 border border-white/8 px-3 py-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-[#64748b] font-semibold">{t('forecast.avgAp') || 'Avg Ap'}</div>
                    <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                      {Math.round(longRangeDays.reduce((s, d) => s + d.apIndex, 0) / longRangeDays.length)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/4 border border-white/8 px-3 py-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-[#64748b] font-semibold">{t('forecast.avgFlux') || 'Avg F10.7'}</div>
                    <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                      {Math.round(longRangeDays.reduce((s, d) => s + d.radioFlux, 0) / longRangeDays.length)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/4 border border-white/8 px-3 py-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-[#64748b] font-semibold">{t('forecast.peakKp27') || 'Peak Kp · 27d'}</div>
                    <div className="text-base sm:text-lg font-bold mt-0.5" style={getKpGradientStyle(Math.max(...longRangeDays.map(d => d.largestKp)))}>
                      {Math.max(...longRangeDays.map(d => d.largestKp)).toFixed(0)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  {longRangeDays.map((d) => {
                    const today = isToday(d.date);
                    return (
                      <div key={d.date.toISOString()} className="flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-md hover:bg-white/3 transition-colors">
                        <div className="w-14 sm:w-20 shrink-0">
                          <div className={`text-xs sm:text-sm font-semibold ${today ? 'text-[#10b981]' : 'text-white'}`}>
                            {formatWeekday(d.date)}
                          </div>
                          <div className="text-[10px] text-[#64748b]">{formatMonthDay(d.date)}</div>
                        </div>
                        <div className="flex-1 h-4 sm:h-5 bg-white/5 rounded overflow-hidden relative">
                          <div
                            className="absolute inset-y-0 left-0 transition-all"
                            style={{ width: `${Math.min((d.largestKp / 9) * 100, 100)}%`, background: kpBarColor(d.largestKp) }}
                          />
                        </div>
                        <div className="w-7 sm:w-12 text-right shrink-0">
                          <span className="text-xs sm:text-sm font-bold" style={getKpGradientStyle(d.largestKp)}>
                            {d.largestKp.toFixed(0)}
                          </span>
                        </div>
                        <div className="w-16 sm:w-24 text-right shrink-0">
                          <div className="text-[9px] sm:text-[10px] text-[#64748b] leading-tight">
                            <span className="inline-block">Ap {d.apIndex}</span>
                            <span className="hidden sm:inline"> · </span>
                            <span className="block sm:inline">F {d.radioFlux}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Aurora Calendar */}
        {nights.length > 0 && (
          <div className="glass-surface rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#10b981]" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">{t('aurora.calendar.title')}</h3>
                  <p className="text-[#64748b] text-xs sm:text-sm">{t('aurora.calendar.subtitle')}</p>
                </div>
              </div>
              <Link to="/calendar" className="flex items-center gap-1 text-xs text-[#10b981] hover:text-white transition-colors whitespace-nowrap">
                <ExternalLink className="w-3.5 h-3.5" />
                {t('aurora.calendar.fullView') || 'Full view'}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {nights.map(night => {
                const cloud = night.cloudCoverAvg;
                const cloudLabel = cloud === null ? null : cloud < 30 ? t('aurora.calendar.clear') : cloud < 70 ? t('aurora.calendar.partlyCloudy') : t('aurora.calendar.overcast');
                const nightLabel =
                  night.label === 'tonight' ? t('aurora.calendar.tonight') :
                  night.label === 'tomorrow' ? t('aurora.calendar.tomorrow') :
                  t('aurora.calendar.nightAfter');
                return (
                  <div key={night.label} className={`relative rounded-xl p-4 border transition-all ${
                    night.isBest ? 'border-[#10b981]/50 bg-[#10b981]/5' : 'border-white/10 bg-white/4'
                  }`}>
                    {night.isBest && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#10b981] text-white whitespace-nowrap">
                        ★ {t('aurora.calendar.bestNight')}
                      </span>
                    )}
                    <div className="text-xs font-semibold text-[#94a3b8] mb-3">{nightLabel}</div>
                    <div className="mb-2">
                      <div className="text-[10px] text-[#64748b] mb-0.5">{t('aurora.calendar.maxKp')}</div>
                      <div className="text-3xl font-bold" style={getKpGradientStyle(night.maxKp)}>{night.maxKp.toFixed(1)}</div>
                    </div>
                    {cloud !== null ? (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                        <Cloud className="w-4 h-4 text-[#64748b]" />
                        <span className="text-xs text-[#94a3b8]">{cloud}% — {cloudLabel}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#475569] mt-3 pt-3 border-t border-white/5">
                        {t('aurora.calendar.noLocationShort') || 'No cloud data —'}{' '}
                        <Link to="/settings" className="text-[#10b981] hover:underline">{t('nav.settings') || 'set location'}</Link>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NOAA Space Weather Outlook */}
        {outlook && (
          <div className="glass-surface rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-[#f97316]" />
                {t('forecast.outlook.title')}
              </h3>
              <span className="text-xs text-[#475569]">{t('forecast.outlook.issued')}: {outlook.issuedAt}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/3 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#f97316]" />
                  <span className="text-sm font-bold text-white">{t('forecast.outlook.geomag')}</span>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">{outlook.geomag.rationale || t('forecast.outlook.noData')}</p>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="w-4 h-4 text-[#fbbf24]" />
                  <span className="text-sm font-bold text-white">{t('forecast.outlook.solarRad')}</span>
                </div>
                {outlook.days.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {outlook.days.map((day, i) => (
                      <div key={day} className="flex-1 text-center">
                        <div className="text-[10px] text-[#64748b] mb-1 truncate">{day}</div>
                        <div className={`text-base font-bold ${outlook.solarRad.s1Pct[i] >= 30 ? 'text-[#fbbf24]' : 'text-[#94a3b8]'}`}>
                          {outlook.solarRad.s1Pct[i]}%
                        </div>
                        <div className="text-[9px] text-[#475569]">S1+</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#94a3b8] leading-relaxed">{outlook.solarRad.rationale || t('forecast.outlook.noData')}</p>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Radio className="w-4 h-4 text-[#a855f7]" />
                  <span className="text-sm font-bold text-white">{t('forecast.outlook.radio')}</span>
                </div>
                {outlook.days.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {outlook.days.map((day, i) => (
                      <div key={day} className="flex-1 text-center">
                        <div className="text-[10px] text-[#64748b] mb-1 truncate">{day}</div>
                        <div className={`text-base font-bold ${outlook.radioBlackout.r1r2Pct[i] >= 30 ? 'text-[#a855f7]' : 'text-[#94a3b8]'}`}>
                          {outlook.radioBlackout.r1r2Pct[i]}%
                        </div>
                        <div className="text-[9px] text-[#475569]">R1-R2</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#94a3b8] leading-relaxed">{outlook.radioBlackout.rationale || t('forecast.outlook.noData')}</p>
              </div>
            </div>
          </div>
        )}

        {/* About */}
        <div className="glass-surface rounded-2xl p-3 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3">{t('forecast.aboutTitle')}</h3>
          <div className="text-[#94a3b8] space-y-2 leading-relaxed text-sm">
            <p>{t('forecast.aboutText1')}</p>
            <p>{t('forecast.aboutText2')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forecast;

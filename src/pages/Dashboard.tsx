import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logError } from '../utils/logger';
import { getCurrentPosition } from '../utils/geolocation';
import { useVisibilityInterval } from '../hooks/useVisibilityInterval';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import TimeSeriesChart, { type TsPoint } from '../components/charts/TimeSeriesChart';
import SvgBarChart from '../components/charts/SvgBarChart';
import { Activity, Wind, Compass, Sun, Radio, MapPin, Download } from 'lucide-react';
import { getKpIndex, getSolarWind, getMagField, getXrayFlux, getKpHistory3Day, getKpForecast, getStormStatus, getXrayClass, getKpGradientStyle } from '../services/noaaApi';
import PlanGuard from '../components/PlanGuard';
import { fetchNigggData, toDeltaSeries, getNigggStormStatus, type NigggDataPoint } from '../services/nigggApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import StarField from '../components/StarField';
import { SkeletonCard, SkeletonChart, Skeleton } from '../components/Skeleton';
import ErrorCard from '../components/ErrorCard';
import { useChartHeight } from '../hooks/useChartHeight';
import ProTrialNudge from '../components/ProTrialNudge';

function useCountUp(target: number, duration = 700): number {
  const prevRef = useRef(target);
  const [display, setDisplay] = useState(target);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - p) * (1 - p);
      setDisplay(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

const InfoTooltip = React.memo(({ text }: { text: string }) => (
  <div className="absolute top-3 right-3 group z-20">
    <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-help text-[#94a3b8] hover:text-white hover:bg-white/20 transition-colors" style={{ fontSize: '11px', fontWeight: 700 }}>
      i
    </div>
    <div className="absolute right-0 bottom-full mb-2 w-56 rounded-xl p-3 text-xs text-[#cbd5e1] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 border border-white/10" style={{ background: 'rgba(10,10,26,0.97)', backdropFilter: 'blur(12px)' }}>
      {text}
    </div>
  </div>
));

const UpdateCountdown = React.memo(function UpdateCountdown() {
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(now.getHours() + 1, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(() => { if (document.visibilityState !== 'hidden') tick(); }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-[#f97316] font-mono font-bold tracking-wider">{countdown}</span>;
});

const NIGGG_COUNTRIES = new Set(['BG', 'RO', 'RS', 'MK', 'GR', 'TR', 'AL', 'ME', 'HR', 'HU', 'MD']);

// Bounding box covering NIGGG_COUNTRIES region (roughly SE Europe + Turkey)
const isInNigggBbox = (lat: number, lon: number) =>
  lat >= 35 && lat <= 48 && lon >= 14 && lon <= 42;

const Dashboard = () => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [kpValue, setKpValue] = useState<number>(0);
  const [solarWindSpeed, setSolarWindSpeed] = useState<number>(0);
  const [bz, setBz] = useState<number>(0);
  const [xrayFlux, setXrayFlux] = useState<number>(0);
  const [kpChartData, setKpChartData] = useState<TsPoint[]>([]);
  const [windChartData, setWindChartData] = useState<TsPoint[]>([]);
  const [nigggData, setNigggData] = useState<NigggDataPoint[]>([]);
  const [inNigggRegion, setInNigggRegion] = useState(false);
  const [kpHistoryRaw, setKpHistoryRaw] = useState<{ time_tag: string; Kp: number }[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '48h' | '72h'>('24h');
  const [showYesterday, setShowYesterday] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') !== 'success') return;

    setShowPaymentSuccess(true);
    navigate('/dashboard', { replace: true });
    const dismissTimer = setTimeout(() => setShowPaymentSuccess(false), 7000);

    // Poll profile until plan != 'free' (webhook may arrive a few seconds after redirect).
    // Max 10 attempts × 1 s = 10 s, then give up silently.
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from('profiles')
        .select('plan, subscription_status')
        .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .maybeSingle();
      if ((data?.plan && data.plan !== 'free') || attempts >= 10) {
        clearInterval(poll);
        if (data?.plan && data.plan !== 'free') {
          // Trigger full profile reload via AuthContext
          window.dispatchEvent(new Event('tsw:profile-refresh'));
        }
      }
    }, 1000);

    return () => { clearTimeout(dismissTimer); clearInterval(poll); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    // Fast path: use saved preferred location from settings
    if (settings.preferredLat !== null && settings.preferredLon !== null) {
      setInNigggRegion(isInNigggBbox(settings.preferredLat, settings.preferredLon));
      return;
    }
    // Cached IP lookup
    const cached = sessionStorage.getItem('user_country_code');
    if (cached) { setInNigggRegion(NIGGG_COUNTRIES.has(cached)); return; }
    fetch('https://ipapi.co/country/')
      .then(r => r.text())
      .then(code => {
        const c = code.trim().toUpperCase();
        sessionStorage.setItem('user_country_code', c);
        setInNigggRegion(NIGGG_COUNTRIES.has(c));
      })
      .catch(() => {
        // ipapi.co failed — fall back to GPS if available
        getCurrentPosition()
          .then(({ coords }) => setInNigggRegion(isInNigggBbox(coords.latitude, coords.longitude)))
          .catch(() => {});
      });
  }, [settings.preferredLat, settings.preferredLon]);

  const chartH    = useChartHeight(190, 300);
  const chartHSm  = useChartHeight(170, 280);
  const barH      = useChartHeight(150, 220);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [kpRes, windRes, magRes, xrayRes, kp3dayRes, nigggRes] = await Promise.allSettled([
        getKpIndex(),
        getSolarWind(),
        getMagField(),
        getXrayFlux(),
        getKpHistory3Day(),
        inNigggRegion ? fetchNigggData() : Promise.resolve(null),
      ]);

      const kpData    = kpRes.status    === 'fulfilled' ? kpRes.value    : null;
      const windData  = windRes.status  === 'fulfilled' ? windRes.value  : null;
      const magData   = magRes.status   === 'fulfilled' ? magRes.value   : null;
      const xrayData  = xrayRes.status  === 'fulfilled' ? xrayRes.value  : null;
      const kp3dayData = kp3dayRes.status === 'fulfilled' ? kp3dayRes.value : null;
      const nigggResult = nigggRes.status === 'fulfilled' ? nigggRes.value : null;

      if (kpData && kpData.length > 0) {
        const latest = kpData[kpData.length - 1];
        setKpValue(latest.kp_index || latest.estimated_kp || 0);
      } else {
        setKpValue(0);
      }

      if (kp3dayData && kp3dayData.length > 0) {
        setKpHistoryRaw(kp3dayData);
        const kpPts: TsPoint[] = kp3dayData.map(item => ({
          time: Math.floor(new Date(item.time_tag.replace(' ', 'T') + 'Z').getTime() / 1000) as TsPoint['time'],
          value: item.Kp ?? 0,
        }));
        setKpChartData(kpPts);
      }

      if (windData && windData.length > 0) {
        // findLast — data is ascending, we want the newest active sample.
        const active = windData.findLast(d => d.active) || windData[windData.length - 1];
        setSolarWindSpeed(active.proton_speed || 0);

        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const filtered = windData.filter(d => d.proton_speed > 0 && new Date(d.time_tag) >= since24h);
        const sampled = filtered.filter((_, i) => i % 30 === 0);
        const windPts: TsPoint[] = sampled.map(item => ({
          time: Math.floor(new Date(item.time_tag.replace(' ', 'T') + 'Z').getTime() / 1000) as TsPoint['time'],
          value: Math.round(item.proton_speed),
        }));
        setWindChartData(windPts);
      } else {
        setSolarWindSpeed(0);
        setWindChartData([]);
      }

      if (magData && magData.length > 0) {
        const active = magData.findLast(d => d.active) || magData[magData.length - 1];
        setBz(active.bz_gsm || 0);
      } else {
        setBz(0);
      }

      if (xrayData && xrayData.length > 0) {
        const latest = xrayData[xrayData.length - 1];
        setXrayFlux(latest.flux || 0);
      } else {
        setXrayFlux(0);
      }

      if (nigggResult && nigggResult.hComponent.length > 0) {
        setNigggData(toDeltaSeries(nigggResult.hComponent));
      } else {
        setNigggData([]);
      }

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      logError('Error fetching dashboard data:', error);
      setError(true);
      setLoading(false);
    }
  }, [inNigggRegion]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useVisibilityInterval(fetchData, 60000);
  const { pulling, pullY } = usePullToRefresh(fetchData);

  const stormStatus = getStormStatus(kpValue);
  const xrayClass = getXrayClass(xrayFlux);

  const kpDisplay = useCountUp(kpValue);
  const windDisplay = useCountUp(solarWindSpeed);
  const bzDisplay = useCountUp(bz);

  const nigggStatus = useMemo(() => {
    if (nigggData.length === 0) return null;
    const nowSec = Date.now() / 1000;
    const last24h = nigggData.filter(p => p.time >= nowSec - 86400);
    const pts = last24h.length > 10 ? last24h : nigggData;
    const minDelta = Math.min(...pts.map(p => p.value));
    // When Kp < 3 global conditions are quiet — daily Sq variation of the
    // local magnetometer (~±50 nT) should not be flagged as DISTURBED.
    const effectiveDelta = kpValue < 3 ? Math.max(minDelta, -29) : minDelta;
    return { ...getNigggStormStatus(effectiveDelta), minDelta };
  }, [nigggData, kpValue]);

  const filteredKpChart = useMemo(() => {
    const hoursBack = timeRange === '24h' ? 24 : timeRange === '48h' ? 48 : 72;
    const cutoff = (Date.now() / 1000 - hoursBack * 3600) as TsPoint['time'];
    return kpChartData.filter(p => p.time >= cutoff);
  }, [kpChartData, timeRange]);

  const yesterdayKpChart = useMemo(() => {
    if (!showYesterday || kpChartData.length === 0) return [];
    const hoursBack = timeRange === '24h' ? 24 : timeRange === '48h' ? 48 : 72;
    const nowSec = Date.now() / 1000;
    const windowStart = nowSec - (hoursBack + 24) * 3600;
    const windowEnd = nowSec - 86400;
    return kpChartData
      .filter(p => p.time >= windowStart && p.time <= windowEnd)
      .map(p => ({ time: (p.time + 86400) as TsPoint['time'], value: p.value }))
      .sort((a, b) => a.time - b.time);
  }, [kpChartData, showYesterday, timeRange]);

  const dailyKp = useMemo(() => {
    const byDay: Record<string, number[]> = {};
    kpHistoryRaw.forEach(({ time_tag, Kp }) => {
      const day = time_tag.split('T')[0];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(Kp);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, vals]) => ({
        day: new Date(day + 'T12:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        avg: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)),
        max: parseFloat(Math.max(...vals).toFixed(1)),
      }));
  }, [kpHistoryRaw]);

  // Aggregate consecutive Kp ≥ 5 periods into storm events
  const stormEvents = useMemo(() => {
    if (kpHistoryRaw.length === 0) return [];
    const sorted = [...kpHistoryRaw].sort((a, b) => a.time_tag.localeCompare(b.time_tag));
    const events: { start: Date; end: Date; peakKp: number }[] = [];
    let curr: { start: Date; end: Date; peakKp: number } | null = null;
    for (const { time_tag, Kp } of sorted) {
      const t = new Date(time_tag.replace(' ', 'T') + 'Z');
      if (Kp >= 5) {
        if (!curr) {
          curr = { start: t, end: t, peakKp: Kp };
        } else {
          curr.end = t;
          curr.peakKp = Math.max(curr.peakKp, Kp);
        }
      } else if (curr) {
        events.push(curr);
        curr = null;
      }
    }
    if (curr) events.push(curr);
    return events.reverse().slice(0, 4);
  }, [kpHistoryRaw]);

  if (!loading && error && kpChartData.length === 0) {
    return (
      <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
        <StarField />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ErrorCard onRetry={fetchData} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
        <StarField />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-3 md:mb-12">
            <Skeleton className="h-12 w-72 mb-3" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-4 md:mb-12">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
      {pulling && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center w-9 h-9 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 transition-transform"
          style={{ transform: `translateX(-50%) translateY(${pullY}px)` }}
        >
          <div className="w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <PageMeta
        title="Dashboard — The Storm Watcher"
        description="Live space weather dashboard: Kp index, solar wind, magnetic field and X-ray flux charts updated every minute."
        path="/dashboard"
        ogKp={kpValue}
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Dashboard', path: '/dashboard' }]} />
      <StarField />

      {/* Payment / Trial success toast */}
      {showPaymentSuccess && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div
            className="glass-surface rounded-2xl p-5 border text-center shadow-2xl animate-fade-in"
            style={{ borderColor: '#f9731644', boxShadow: '0 0 40px #f9731622' }}
          >
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-white font-bold text-lg mb-1">
              {profile?.subscription_status === 'trialing'
                ? (t('payment.trialStarted') || 'Your 14-day Pro trial has started!')
                : (t('payment.subscriptionActive') || 'You\'re now on Pro!')}
            </div>
            <div className="text-[#94a3b8] text-sm mb-4">
              {profile?.subscription_status === 'trialing'
                ? (t('payment.trialDesc') || 'Enjoy full Pro access — no charge for 14 days.')
                : (t('payment.subscriptionDesc') || 'Full Pro access is now unlocked. Enjoy!')}
            </div>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/aurora"
                onClick={() => setShowPaymentSuccess(false)}
                className="text-xs font-bold px-4 py-2 rounded-full text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
              >
                {t('payment.exploreAurora') || 'Explore Aurora →'}
              </Link>
              <button
                onClick={() => setShowPaymentSuccess(false)}
                className="text-xs text-[#475569] hover:text-white transition-colors"
              >
                {t('payment.dismiss') || 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="solar-orb" style={{ top: '100px', right: '-300px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProTrialNudge />
        <div className="mb-3 md:mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold gradient-solar mb-2 sm:mb-3 uppercase tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-[#94a3b8] text-lg flex items-center gap-3">
            {t('dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            <span className="inline-flex items-center gap-1.5 text-xs text-[#10b981] font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              {t('dashboard.live')}
            </span>
          </p>
          <p className="text-[#64748b] text-sm mt-1">
            {t('dashboard.nextUpdate')}{' '}
            <UpdateCountdown />
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-4 md:mb-12">
          <div data-tour="kp-card" className={`relative glass-surface rounded-2xl p-3 sm:p-6 ${
            kpValue >= 5 ? 'glow-red' : kpValue >= 4 ? 'glow-orange' : 'glow-green'
          } hover:scale-105 transition-transform`}>
            <InfoTooltip text={t('dashboard.tooltip.kp')} />
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                kpValue >= 5 ? 'bg-gradient-to-br from-[#ef4444] to-[#dc2626]' :
                kpValue >= 4 ? 'bg-gradient-to-br from-[#f97316] to-[#ea580c]' :
                kpValue >= 2 ? 'bg-gradient-to-br from-[#eab308] to-[#10b981]' :
                'bg-gradient-to-br from-[#10b981] to-[#059669]'
              }`}>
                <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-[0.7rem] sm:text-sm uppercase tracking-wider font-bold">
                {t('dashboard.kpIndex')}
              </h3>
            </div>
            <div className="text-[1.4rem] sm:text-6xl font-bold mb-2 sm:mb-3" style={getKpGradientStyle(kpValue)}>{kpDisplay.toFixed(1)}</div>
            <div className={`inline-block px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-[0.6rem] sm:text-xs font-bold uppercase tracking-wider ${
              kpValue >= 7 ? 'bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white' :
              kpValue >= 5 ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white' :
              kpValue >= 4 ? 'bg-gradient-to-r from-[#eab308] to-[#ca8a04] text-white' :
              'bg-gradient-to-r from-[#10b981] to-[#059669] text-white'
            }`}>
              {t(stormStatus.statusKey)}
            </div>
          </div>

          <div data-tour="wind-card" className="relative glass-surface rounded-2xl p-3 sm:p-6 hover:glow-purple transition-all hover:scale-105">
            <InfoTooltip text={t('dashboard.tooltip.wind')} />
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center">
                <Wind className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-[0.7rem] sm:text-sm uppercase tracking-wider font-bold">
                {t('dashboard.solarWind')}
              </h3>
            </div>
            <div className="text-[1.4rem] sm:text-6xl font-bold text-white mb-2 sm:mb-3">{windDisplay.toFixed(0)}</div>
            <div className="text-[#94a3b8] text-[0.7rem] sm:text-sm uppercase tracking-wider">{t('dashboard.kms')}</div>
          </div>

          <div className="relative glass-surface rounded-2xl p-3 sm:p-6 hover:glow-orange transition-all hover:scale-105">
            <InfoTooltip text={t('dashboard.tooltip.bz')} />
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center">
                <Compass className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-[0.7rem] sm:text-sm uppercase tracking-wider font-bold">
                {t('dashboard.bz')}
              </h3>
            </div>
            <div className={`text-[1.4rem] sm:text-6xl font-bold mb-2 sm:mb-3 ${bz < 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {bzDisplay.toFixed(1)}
            </div>
            <div className="text-[#94a3b8] text-[0.7rem] sm:text-sm uppercase tracking-wider">{t('dashboard.nt')}</div>
          </div>

          <div className="relative glass-surface rounded-2xl p-3 sm:p-6 hover:glow-orange transition-all hover:scale-105">
            <InfoTooltip text={t('dashboard.tooltip.xray')} />
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-xl flex items-center justify-center">
                <Sun className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-[0.7rem] sm:text-sm uppercase tracking-wider font-bold">
                {t('dashboard.xray')}
              </h3>
            </div>
            <div className="text-[1.4rem] sm:text-6xl font-bold gradient-solar mb-2 sm:mb-3">{xrayClass}</div>
            <div className="text-[#94a3b8] text-[0.7rem] sm:text-sm uppercase tracking-wider">{t('dashboard.classTxt')}</div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-4 sm:p-8 mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg sm:text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-3">
              <Radio className="w-6 h-6 text-[#f97316]" />
              {t('dashboard.history')}
            </h3>
            <div className="flex gap-2 flex-wrap">
              {(['24h', '48h', '72h'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                    timeRange === range
                      ? 'bg-[#f97316] text-white'
                      : 'glass-surface text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {range === '24h' && t('dashboard.hr24')}
                  {range === '48h' && t('dashboard.hr48')}
                  {range === '72h' && t('dashboard.hr72')}
                </button>
              ))}
              <button
                onClick={() => setShowYesterday(v => !v)}
                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                  showYesterday
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'glass-surface text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                {t('dashboard.compareYesterday')}
              </button>
            </div>
          </div>
          {filteredKpChart.length > 0 ? (
            <TimeSeriesChart
              data={filteredKpChart}
              color="#f97316"
              type="line"
              height={chartH}
              yMin={0}
              yMax={9}
              compareData={yesterdayKpChart.length > 0 ? yesterdayKpChart : undefined}
              compareLabel={t('dashboard.yesterday')}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#94a3b8]">
              {t('dashboard.noData')}
            </div>
          )}
        </div>

        <div className="glass-surface rounded-2xl p-4 sm:p-8 mb-4 sm:mb-8">
          <h3 className="text-lg sm:text-2xl font-bold text-white mb-3 sm:mb-6 uppercase tracking-wide flex items-center gap-3">
            <Wind className="w-6 h-6 text-[#7c3aed]" />
            {t('dashboard.windHistory')}
          </h3>
          {windChartData.length > 0 ? (
            <TimeSeriesChart
              data={windChartData}
              color="#7c3aed"
              type="area"
              height={chartH}
              refLines={[
                { value: 400, color: '#f97316', label: '400 km/s' },
                { value: 600, color: '#ef4444', label: '600 km/s' },
              ]}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#94a3b8]">
              {t('dashboard.noData')}
            </div>
          )}
        </div>

        {inNigggRegion && <div className="glass-surface rounded-2xl p-4 sm:p-8 mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg sm:text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-3">
              <MapPin className="w-6 h-6 text-[#10b981]" />
              {t('dashboard.localMagnetometer')}
            </h3>
            <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] px-3 py-1 bg-white/5 rounded-full border border-white/10">
              {t('niggg.source')}: NIGGG
            </span>
          </div>
          {nigggStatus ? (
            <>
              <div className={`px-5 py-4 rounded-xl border mb-5 ${nigggStatus.bg}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl font-black tracking-widest" style={{ color: nigggStatus.color }}>{nigggStatus.label}</span>
                  <span className="text-xs text-[#64748b] font-mono">{t('niggg.minDelta')}: {nigggStatus.minDelta.toFixed(1)} nT</span>
                </div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: nigggStatus.color }}>{t(nigggStatus.descKey)}</p>
                <p className="text-xs text-[#94a3b8] leading-relaxed mb-1">{t(nigggStatus.detailKey)}</p>
                <p className="text-xs text-[#64748b] leading-relaxed">👤 {t(nigggStatus.humanEffectKey)}</p>
              </div>
              <TimeSeriesChart
                data={nigggData as TsPoint[]}
                color={nigggStatus.color}
                type="baseline"
                height={chartHSm}
                refLines={[
                  { value: 0, color: '#ffffff25', label: '0' },
                  { value: -30, color: '#f9731660', label: '-30 nT' },
                  { value: -100, color: '#ef444460', label: '-100 nT' },
                ]}
              />
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#94a3b8]">
              {t('dashboard.noData')}
            </div>
          )}
        </div>}

        {/* Storm Watch — recent storm events (Kp ≥ 5) */}
        {stormEvents.length > 0 && (
          <div className="glass-surface rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2.5">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                {t('dashboard.stormWatch') || 'Storm Watch'}
              </h3>
              <Link to="/alerts" className="text-[10px] uppercase tracking-wider text-[#f97316] hover:text-[#fbbf24] transition-colors font-bold">
                {t('dashboard.viewAlerts') || 'View alerts →'}
              </Link>
            </div>
            <div className="space-y-2">
              {stormEvents.map((ev, i) => {
                const durationH = Math.round((ev.end.getTime() - ev.start.getTime()) / 3_600_000);
                const g = ev.peakKp >= 9 ? 'G5' : ev.peakKp >= 8 ? 'G4' : ev.peakKp >= 7 ? 'G3' : ev.peakKp >= 6 ? 'G2' : 'G1';
                const color = ev.peakKp >= 7 ? '#ef4444' : ev.peakKp >= 6 ? '#f97316' : '#eab308';
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-white"
                      style={{ background: `${color}22`, border: `1.5px solid ${color}66`, color }}>
                      {g}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">
                        {ev.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-[#64748b]">
                        {t('dashboard.peakKp') || 'Peak Kp'} <span className="text-white font-semibold">{ev.peakKp.toFixed(1)}</span>
                        {durationH > 0 && ` · ${durationH}h`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black" style={{ color }}>{ev.peakKp.toFixed(0)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {dailyKp.length > 0 && (
          <div className="glass-surface rounded-2xl p-4 sm:p-8 mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-6">
              <h3 className="text-lg sm:text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-3">
                <Activity className="w-6 h-6 text-[#f97316]" />
                {t('dashboard.kp7day') || 'Kp — Last 7 Days'}
              </h3>
              <p className="text-xs text-[#64748b] max-w-xs leading-relaxed">
                {t('dashboard.kp7dayNote') || 'Daily maximum Kp. Solar activity repeats every ~27 days — the Sun\'s rotation period.'}
              </p>
            </div>
            <SvgBarChart
              height={barH}
              maxValue={9}
              formatValue={v => `Kp ${v}`}
              bars={dailyKp.map(d => ({
                label: d.day,
                value: d.max,
                color: d.max >= 7 ? '#ef4444' : d.max >= 5 ? '#f97316' : d.max >= 4 ? '#eab308' : '#10b981',
              }))}
            />
          </div>
        )}

        {/* CSV Export — Premium */}
        <PlanGuard requiredPlan="premium">
          <ExportDataCard t={t} />
        </PlanGuard>
      </div>
    </div>
  );
};

function ExportDataCard({ t }: { t: (k: string) => string }) {
  const [exporting, setExporting] = React.useState(false);

  async function handleExport(type: 'kp' | 'wind' | 'forecast') {
    setExporting(true);
    try {
      let csv = '';
      let filename = '';

      if (type === 'kp') {
        const rows = await getKpHistory3Day();
        csv = 'timestamp,kp_index\n' + rows.map(r => `${r.time_tag},${r.Kp}`).join('\n');
        filename = `kp-history-${today()}.csv`;
      } else if (type === 'wind') {
        const rows = await getSolarWind();
        csv = 'timestamp,proton_speed_km_s,proton_density_cm3\n' +
          rows.map(r => `${r.time_tag},${r.proton_speed},${r.proton_density}`).join('\n');
        filename = `solar-wind-${today()}.csv`;
      } else {
        const rows = await getKpForecast();
        csv = 'timestamp,kp_index\n' + rows.map(r => `${r.time_tag},${r.kp_index ?? r.estimated_kp ?? 0}`).join('\n');
        filename = `kp-forecast-${today()}.csv`;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="glass-surface rounded-2xl p-4 sm:p-6 mb-4 sm:mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#7c3aed22' }}>
          <Download className="w-5 h-5" style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">{t('dashboard.exportTitle') || 'Export Data'}</h3>
          <p className="text-[#64748b] text-xs">{t('dashboard.exportDesc') || 'Download raw space weather data as CSV'}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['kp', 'wind', 'forecast'] as const).map(type => (
          <button
            key={type}
            onClick={() => handleExport(type)}
            disabled={exporting}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #7c3aed, #6d28d9)' }}
          >
            {exporting ? '…' : {
              kp: t('dashboard.exportKp') || 'Kp History (3 days)',
              wind: t('dashboard.exportWind') || 'Solar Wind (3 days)',
              forecast: t('dashboard.exportForecast') || 'Kp Forecast (7 days)',
            }[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default Dashboard;

import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import TimeSeriesChart, { type TsPoint } from '../components/charts/TimeSeriesChart';
import SvgBarChart from '../components/charts/SvgBarChart';
import { Activity, Wind, Compass, Sun, Radio } from 'lucide-react';
import { getKpIndex, getSolarWind, getMagField, getXrayFlux, getKpHistory3Day, getStormStatus, getXrayClass, getKpGradientStyle } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';
import { SkeletonCard, SkeletonChart, Skeleton } from '../components/Skeleton';

const InfoTooltip = React.memo(({ text }: { text: string }) => (
  <div className="absolute top-3 right-3 group z-20">
    <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-help text-[#94a3b8] hover:text-white hover:bg-white/20 transition-colors" style={{ fontSize: '11px', fontWeight: 700 }}>
      i
    </div>
    <div className="absolute right-0 top-7 w-56 rounded-xl p-3 text-xs text-[#cbd5e1] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 border border-white/10" style={{ background: 'rgba(10,10,26,0.97)', backdropFilter: 'blur(12px)' }}>
      {text}
    </div>
  </div>
));

const Dashboard = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number>(0);
  const [solarWindSpeed, setSolarWindSpeed] = useState<number>(0);
  const [bz, setBz] = useState<number>(0);
  const [xrayFlux, setXrayFlux] = useState<number>(0);
  const [kpChartData, setKpChartData] = useState<TsPoint[]>([]);
  const [windChartData, setWindChartData] = useState<TsPoint[]>([]);
  const [kpHistoryRaw, setKpHistoryRaw] = useState<{ time_tag: string; Kp: number }[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '48h' | '72h'>('24h');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');

  const fetchData = async () => {
    try {
      const [kpData, windData, magData, xrayData, kp3dayData] = await Promise.all([
        getKpIndex(),
        getSolarWind(),
        getMagField(),
        getXrayFlux(),
        getKpHistory3Day(),
      ]);

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
        const active = windData.find(d => d.active) || windData[windData.length - 1];
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
        const active = magData.find(d => d.active) || magData[magData.length - 1];
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

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setKpValue(0);
      setSolarWindSpeed(0);
      setBz(0);
      setXrayFlux(0);
      setKpChartData([]);
      setWindChartData([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, []);

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
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const stormStatus = getStormStatus(kpValue);
  const xrayClass = getXrayClass(xrayFlux);

  const filteredKpChart = useMemo(() => {
    const hoursBack = timeRange === '24h' ? 24 : timeRange === '48h' ? 48 : 72;
    const cutoff = (Date.now() / 1000 - hoursBack * 3600) as TsPoint['time'];
    return kpChartData.filter(p => p.time >= cutoff);
  }, [kpChartData, timeRange]);

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

  if (loading) {
    return (
      <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
        <StarField />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Skeleton className="h-12 w-72 mb-3" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
      <Helmet>
        <title>Dashboard — The Storm Watcher</title>
        <meta name="description" content="Live space weather dashboard: Kp index, solar wind, magnetic field and X-ray flux charts updated every minute." />
      </Helmet>
      <StarField />

      <div className="solar-orb" style={{ top: '100px', right: '-300px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-solar mb-3 uppercase tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-[#94a3b8] text-lg">
            {t('dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </p>
          {countdown && (
            <p className="text-[#64748b] text-sm mt-1">
              {t('dashboard.nextUpdate')}{' '}
              <span className="text-[#f97316] font-mono font-bold tracking-wider">{countdown}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div data-tour="kp-card" className={`relative glass-surface rounded-2xl p-6 ${
            kpValue >= 5 ? 'glow-red' : kpValue >= 4 ? 'glow-orange' : 'glow-green'
          } hover:scale-105 transition-transform`}>
            <InfoTooltip text={t('dashboard.tooltip.kp')} />
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                kpValue >= 5 ? 'bg-gradient-to-br from-[#ef4444] to-[#dc2626]' :
                kpValue >= 4 ? 'bg-gradient-to-br from-[#f97316] to-[#ea580c]' :
                kpValue >= 2 ? 'bg-gradient-to-br from-[#eab308] to-[#10b981]' :
                'bg-gradient-to-br from-[#10b981] to-[#059669]'
              }`}>
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('dashboard.kpIndex')}
              </h3>
            </div>
            <div className="text-6xl font-bold mb-3" style={getKpGradientStyle(kpValue)}>{kpValue.toFixed(1)}</div>
            <div className={`inline-block px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${
              kpValue >= 7 ? 'bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white' :
              kpValue >= 5 ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white' :
              kpValue >= 4 ? 'bg-gradient-to-r from-[#eab308] to-[#ca8a04] text-white' :
              'bg-gradient-to-r from-[#10b981] to-[#059669] text-white'
            }`}>
              {t(stormStatus.statusKey)}
            </div>
          </div>

          <div data-tour="wind-card" className="relative glass-surface rounded-2xl p-6 hover:glow-purple transition-all hover:scale-105">
            <InfoTooltip text={t('dashboard.tooltip.wind')} />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center">
                <Wind className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('dashboard.solarWind')}
              </h3>
            </div>
            <div className="text-6xl font-bold text-white mb-3">{solarWindSpeed.toFixed(0)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('dashboard.kms')}</div>
          </div>

          <div className="relative glass-surface rounded-2xl p-6 hover:glow-orange transition-all hover:scale-105">
            <InfoTooltip text={t('dashboard.tooltip.bz')} />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('dashboard.bz')}
              </h3>
            </div>
            <div className={`text-6xl font-bold mb-3 ${bz < 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {bz.toFixed(1)}
            </div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('dashboard.nt')}</div>
          </div>

          <div className="relative glass-surface rounded-2xl p-6 hover:glow-orange transition-all hover:scale-105">
            <InfoTooltip text={t('dashboard.tooltip.xray')} />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-xl flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('dashboard.xray')}
              </h3>
            </div>
            <div className="text-6xl font-bold gradient-solar mb-3">{xrayClass}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('dashboard.classTxt')}</div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-3">
              <Radio className="w-6 h-6 text-[#f97316]" />
              {t('dashboard.history')}
            </h3>
            <div className="flex gap-2">
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
            </div>
          </div>
          {filteredKpChart.length > 0 ? (
            <TimeSeriesChart
              data={filteredKpChart}
              color="#f97316"
              type="line"
              height={300}
              yMin={0}
              yMax={9}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#94a3b8]">
              {t('dashboard.noData')}
            </div>
          )}
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide flex items-center gap-3">
            <Wind className="w-6 h-6 text-[#7c3aed]" />
            {t('dashboard.windHistory')}
          </h3>
          {windChartData.length > 0 ? (
            <TimeSeriesChart
              data={windChartData}
              color="#7c3aed"
              type="area"
              height={300}
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

        {dailyKp.length > 0 && (
          <div className="glass-surface rounded-2xl p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-6">
              <h3 className="text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-3">
                <Activity className="w-6 h-6 text-[#f97316]" />
                {t('dashboard.kp7day') || 'Kp — Last 7 Days'}
              </h3>
              <p className="text-xs text-[#64748b] max-w-xs leading-relaxed">
                {t('dashboard.kp7dayNote') || 'Daily maximum Kp. Solar activity repeats every ~27 days — the Sun\'s rotation period.'}
              </p>
            </div>
            <SvgBarChart
              height={220}
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
      </div>
    </div>
  );
};

export default Dashboard;

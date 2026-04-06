import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Wind, Compass, Zap, Sun, Radio } from 'lucide-react';
import { getKpIndex, getSolarWind, getMagField, getXrayFlux, getKpHistory3Day, getStormStatus, getXrayClass, getKpGradientStyle } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number>(0);
  const [solarWindSpeed, setSolarWindSpeed] = useState<number>(0);
  const [bz, setBz] = useState<number>(0);
  const [xrayFlux, setXrayFlux] = useState<number>(0);
  const [windHistory, setWindHistory] = useState<{ time: string; speed: number }[]>([]);
  const [kpHistory3Day, setKpHistory3Day] = useState<{ time: string; kp: number }[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '48h' | '72h'>('24h');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

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
        const history = kp3dayData.map((item) => ({
          time: new Date(item.time_tag).toLocaleString('bg', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          kp: item.Kp || 0,
        }));
        setKpHistory3Day(history);
      }

      if (windData && windData.length > 0) {
        const active = windData.find(d => d.active) || windData[windData.length - 1];
        setSolarWindSpeed(active.proton_speed || 0);

        const last24Hours = windData.filter(d => d.proton_speed).slice(-1440).map((item) => ({
          time: new Date(item.time_tag).toLocaleTimeString('bg', { hour: '2-digit', minute: '2-digit' }),
          speed: item.proton_speed || 0,
        }));
        setWindHistory(last24Hours);
      } else {
        setSolarWindSpeed(0);
        setWindHistory([]);
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
      setKpHistory([]);
      setWindHistory([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const stormStatus = getStormStatus(kpValue);
  const xrayClass = getXrayClass(xrayFlux);

  const stars = useMemo(() =>
    [...Array(50)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
    })), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin"></div>
      </div>
    );
  }

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

      <div className="solar-orb" style={{ top: '100px', right: '-300px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-solar mb-3 uppercase tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-[#94a3b8] text-lg">
            {t('dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className={`glass-surface rounded-2xl p-6 ${
            kpValue >= 5 ? 'glow-red' : kpValue >= 4 ? 'glow-orange' : 'glow-green'
          } hover:scale-105 transition-transform`}>
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

          <div className="glass-surface rounded-2xl p-6 hover:glow-purple transition-all hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center">
                <Wind className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('dashboard.solarWind')}
              </h3>
            </div>
            <div className="text-6xl font-bold text-white mb-3">{solarWindSpeed.toFixed(0)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">km/s</div>
          </div>

          <div className="glass-surface rounded-2xl p-6 hover:glow-orange transition-all hover:scale-105">
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
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">nT</div>
          </div>

          <div className="glass-surface rounded-2xl p-6 hover:glow-orange transition-all hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-xl flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('dashboard.xray')}
              </h3>
            </div>
            <div className="text-6xl font-bold gradient-solar mb-3">{xrayClass}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">Class</div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-3">
              <Radio className="w-6 h-6 text-[#f97316]" />
              Kp Индекс — История
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
                  {range}
                </button>
              ))}
            </div>
          </div>
          {kpHistory3Day.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeRange === '24h' ? kpHistory3Day.slice(-8) : timeRange === '48h' ? kpHistory3Day.slice(-16) : kpHistory3Day.slice(-24)}>
                <defs>
                  <linearGradient id="kpGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke="#6b7280" domain={[0, 9]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(10,0,21,0.95)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', padding: '12px' }}
                  labelStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="kp" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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
          {windHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={windHistory}>
                <defs>
                  <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(10,0,21,0.95)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px', padding: '12px' }}
                  labelStyle={{ color: '#7c3aed', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="speed" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#94a3b8]">
              {t('dashboard.noData')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

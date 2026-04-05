import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Wind, Compass, Zap } from 'lucide-react';
import { getKpIndex, getSolarWind, getXrayFlux, getStormStatus, getXrayClass } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number>(0);
  const [solarWindSpeed, setSolarWindSpeed] = useState<number>(0);
  const [bz, setBz] = useState<number>(0);
  const [xrayFlux, setXrayFlux] = useState<number>(0);
  const [kpHistory, setKpHistory] = useState<any[]>([]);
  const [windHistory, setWindHistory] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [kpData, windData, xrayData] = await Promise.all([
        getKpIndex(),
        getSolarWind(),
        getXrayFlux(),
      ]);

      if (kpData && kpData.length > 0) {
        const latest = kpData[kpData.length - 1];
        setKpValue(latest.kp_index || latest.estimated_kp || 0);

        const last24Hours = kpData.slice(-24).map((item, index) => ({
          time: index,
          kp: item.kp_index || item.estimated_kp || 0,
        }));
        setKpHistory(last24Hours);
      }

      if (windData && windData.length > 0) {
        const latest = windData[windData.length - 1];
        setSolarWindSpeed(latest.speed || 0);
        setBz(latest.bz || 0);

        const last24Hours = windData.slice(-24).map((item, index) => ({
          time: index,
          speed: item.speed || 0,
        }));
        setWindHistory(last24Hours);
      }

      if (xrayData && xrayData.length > 0) {
        const latest = xrayData[xrayData.length - 1];
        setXrayFlux(latest.flux || 0);
      }

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
          <p className="text-gray-400">
            {t('dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00ff88]/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#00ff88]" />
              </div>
              <h3 className="text-gray-400 text-sm">{t('dashboard.kpIndex')}</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-2">{kpValue.toFixed(1)}</div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${stormStatus.bgColor} ${stormStatus.color}`}>
              {stormStatus.status}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#3b82f6]/20 rounded-lg flex items-center justify-center">
                <Wind className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 className="text-gray-400 text-sm">{t('dashboard.solarWindSpeed')}</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-2">{Math.round(solarWindSpeed)}</div>
            <div className="text-gray-400 text-sm">km/s</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#8b5cf6]/20 rounded-lg flex items-center justify-center">
                <Compass className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <h3 className="text-gray-400 text-sm">{t('dashboard.bzComponent')}</h3>
            </div>
            <div className={`text-5xl font-bold mb-2 ${bz < 0 ? 'text-red-500' : 'text-green-400'}`}>
              {bz.toFixed(1)}
            </div>
            <div className={`text-sm font-semibold ${bz < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {bz < 0 ? t('dashboard.dangerous') : t('dashboard.safe')}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#f59e0b]/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <h3 className="text-gray-400 text-sm">{t('dashboard.xrayFlux')}</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-2">{xrayClass}</div>
            <div className="text-gray-400 text-sm">{t('dashboard.class')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6">{t('dashboard.kpHistory')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={kpHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #ffffff20',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="kp" stroke="#00ff88" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6">{t('dashboard.windHistory')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={windHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #ffffff20',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

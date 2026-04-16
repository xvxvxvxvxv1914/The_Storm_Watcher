import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, TrendingUp, AlertCircle, Sun } from 'lucide-react';
import { getKpForecast, getStormStatus, getKpGradientStyle } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Forecast = () => {
  const { t } = useLanguage();
  const [forecastData, setForecastData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLastUpdated] = useState<Date>(new Date());

  const fetchForecast = React.useCallback(async () => {
    try {
      const data = await getKpForecast();
      console.log('Forecast data received:', data);

      if (data && data.length > 0) {
        const formattedData = data.map((item) => {
          const date = new Date(item.time_tag);
          return {
            time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullTime: date.toLocaleString(),
            kp: item.kp_index || item.estimated_kp || 0,
            date: date,
          };
        });
        console.log('Formatted data:', formattedData);
        setForecastData(formattedData);
      } else {
        console.log('No forecast data available - using demo data');
        generateDemoData();
      }
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      generateDemoData();
      setLoading(false);
    }
  }, []);

  const generateDemoData = React.useCallback(() => {
    // const demoData = [];
    const now = new Date();
    // Generate 3-hour interval data
    const rawData = [];
    for (let i = 0; i < 27 * 8; i++) {
      const date = new Date(now.getTime() + i * 3 * 60 * 60 * 1000);
      const kp = Math.random() * 7 + Math.sin(i / 10) * 2 + 2;
      rawData.push({
        time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullTime: date.toLocaleString(),
        kp: Math.max(0, Math.min(9, kp)),
        date: date,
      });
    }
    setForecastData(rawData);
  }, []);

  useEffect(() => {
    fetchForecast();
    const interval = setInterval(fetchForecast, 300000);
    return () => clearInterval(interval);
  }, [fetchForecast]);

  const getMaxKp = () => {
    if (forecastData.length === 0) return 0;
    return Math.max(...forecastData.map(d => d.kp));
  };

  const getAverageKp = () => {
    if (forecastData.length === 0) return 0;
    const sum = forecastData.reduce((acc, d) => acc + d.kp, 0);
    return sum / forecastData.length;
  };

  const getDaysWithStorms = () => {
    return forecastData.filter(d => d.kp >= 5).length;
  };

  const groupByDay = () => {
    const grouped: { [key: string]: unknown[] } = {};
    forecastData.forEach((item) => {
      const dayKey = item.date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(item);
    });
    return grouped;
  };

  const getDailyChartData = () => {
    const grouped = groupByDay();
    return Object.entries(grouped).map(([day, items]) => {
      const maxKp = Math.max(...items.map(i => i.kp));
      const avgKp = items.reduce((acc, i) => acc + i.kp, 0) / items.length;
      const date = items[0].date;
      return {
        time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullTime: day,
        kp: avgKp,
        maxKp: maxKp,
        date: date,
        itemsCount: items.length
      };
    });
  };

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

  const maxKp = getMaxKp();
  const avgKp = getAverageKp();
  const stormDays = getDaysWithStorms();
  const groupedData = groupByDay();
  const dailyChartData = getDailyChartData();

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

      <div className="magnetic-orb" style={{ top: '200px', left: '-200px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-solar mb-3 uppercase tracking-tight">
            {t('forecast.title')}
          </h1>
          <p className="text-[#94a3b8] text-lg">
            {t('forecast.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className={`glass-surface rounded-2xl p-8 ${maxKp >= 5 ? 'glow-red' : 'glow-green'} hover:scale-105 transition-transform`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#ef4444] to-[#dc2626] rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('forecast.maxKp')}
              </h3>
            </div>
            <div className="text-6xl font-bold mb-2" style={getKpGradientStyle(maxKp)}>{maxKp.toFixed(1)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">
              {t('forecast.next3Days')}
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-8 hover:glow-orange transition-all hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('forecast.avgKp')}
              </h3>
            </div>
            <div className="text-6xl font-bold mb-2" style={getKpGradientStyle(avgKp)}>{avgKp.toFixed(1)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">
              {t('forecast.avgKp')}
            </div>
          </div>

          <div className={`glass-surface rounded-2xl p-8 ${stormDays > 0 ? 'glow-orange' : 'glow-green'} hover:scale-105 transition-transform`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('forecast.stormPeriods')}
              </h3>
            </div>
            <div className="text-6xl font-bold text-white mb-2">{stormDays}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">
              {t('forecast.threehourPeriods')}
            </div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide flex items-center gap-3">
            <Sun className="w-6 h-6 text-[#f97316]" />
            {t('forecast.kpForecast')}
          </h3>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#6b7280"
                  height={60}
                  tick={{ fontSize: 13, fill: '#9ca3af' }}
                />
                <YAxis
                  stroke="#6b7280"
                  domain={[0, 9]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Kp Index', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10, 0, 21, 0.95)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                  }}
                  labelStyle={{ color: '#f97316', fontWeight: 'bold', marginBottom: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullTime;
                    }
                    return value;
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'kp') return [value.toFixed(2), 'Avg Kp'];
                    if (name === 'maxKp') return [value.toFixed(2), 'Max Kp'];
                    return [value.toFixed(2), name];
                  }}
                />
                <Bar
                  dataKey="kp"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                >
                  {dailyChartData.map((entry, index) => {
                    let color = '#10b981';
                    if (entry.kp >= 7) color = '#ef4444';
                    else if (entry.kp >= 6) color = '#f97316';
                    else if (entry.kp >= 5) color = '#f59e0b';
                    else if (entry.kp >= 4) color = '#eab308';

                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-[#94a3b8]">
              {t('dashboard.noData')}
            </div>
          )}
        </div>

        <div className="glass-surface rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">
            {t('forecast.dailyForecast')}
          </h3>
          {Object.keys(groupedData).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedData).map(([day, items]) => {
              const maxDayKp = Math.max(...items.map(i => i.kp));
              // const avgDayKp = items.reduce((acc, i) => acc + i.kp, 0) / items.length;
              const status = getStormStatus(maxDayKp);

              return (
                <div key={day} className={`glass-surface rounded-xl p-6 ${
                  maxDayKp >= 5 ? 'glow-orange' : ''
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-white uppercase tracking-wide">{day}</h4>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-[#94a3b8] uppercase tracking-wider mb-1">Max</div>
                        <div className="text-2xl font-bold" style={getKpGradientStyle(maxDayKp)}>{maxDayKp.toFixed(1)}</div>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        maxDayKp >= 7 ? 'bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white' :
                        maxDayKp >= 5 ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white' :
                        maxDayKp >= 4 ? 'bg-gradient-to-r from-[#eab308] to-[#ca8a04] text-white' :
                        'bg-gradient-to-r from-[#10b981] to-[#059669] text-white'
                      }`}>
                        {t(status.statusKey)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {items.map((item, idx) => {
                      // const itemStatus = getStormStatus(item.kp);
                      return (
                        <div
                          key={idx}
                          className="glass-surface rounded-lg p-3 hover:scale-105 transition-transform"
                        >
                          <div className="text-xs text-[#94a3b8] mb-1 uppercase tracking-wider">
                            {item.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-2xl font-bold" style={getKpGradientStyle(item.kp)}>
                            {item.kp.toFixed(1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          ) : (
            <div className="text-center text-[#94a3b8] py-8">
              {t('dashboard.noData')}
            </div>
          )}
        </div>

        <div className="mt-8 glass-surface rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">
            {t('forecast.aboutTitle')}
          </h3>
          <div className="text-[#94a3b8] space-y-3 leading-relaxed">
            <p>
              {t('forecast.aboutText1')}
            </p>
            <p>
              {t('forecast.aboutText2')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forecast;

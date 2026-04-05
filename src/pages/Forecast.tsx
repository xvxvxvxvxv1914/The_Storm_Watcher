import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { getKpForecast, getStormStatus } from '../services/noaaApi';

const Forecast = () => {
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchForecast = async () => {
    try {
      const data = await getKpForecast();
      if (data && data.length > 0) {
        const formattedData = data.map((item) => {
          const date = new Date(item.time_tag);
          return {
            time: date.toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' }),
            fullTime: date.toLocaleString('bg-BG'),
            kp: item.kp_index || item.estimated_kp || 0,
            date: date,
          };
        });
        setForecastData(formattedData);
      }
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
    const interval = setInterval(fetchForecast, 300000);
    return () => clearInterval(interval);
  }, []);

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
    const grouped: { [key: string]: any[] } = {};
    forecastData.forEach((item) => {
      const dayKey = item.date.toLocaleDateString('bg-BG');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(item);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin"></div>
      </div>
    );
  }

  const maxKp = getMaxKp();
  const avgKp = getAverageKp();
  const stormDays = getDaysWithStorms();
  const groupedData = groupByDay();

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Прогноза за космическото време</h1>
          <p className="text-gray-400">
            Последна актуализация: {lastUpdated.toLocaleString('bg-BG')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00ff88]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#00ff88]" />
              </div>
              <h3 className="text-gray-400 text-sm">Максимален Kp</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-2">{maxKp.toFixed(1)}</div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStormStatus(maxKp).bgColor} ${getStormStatus(maxKp).color}`}>
              {getStormStatus(maxKp).status}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#3b82f6]/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 className="text-gray-400 text-sm">Среден Kp</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-2">{avgKp.toFixed(1)}</div>
            <div className="text-gray-400 text-sm">За прогнозния период</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#f59e0b]/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <h3 className="text-gray-400 text-sm">Periodi с буря</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-2">{stormDays}</div>
            <div className="text-gray-400 text-sm">3-часови периода</div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-white mb-6">Прогноза за Kp индекс</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="colorKp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis
                dataKey="time"
                stroke="#9ca3af"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9ca3af" domain={[0, 9]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px',
                }}
                labelFormatter={(value, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullTime;
                  }
                  return value;
                }}
              />
              <Area
                type="monotone"
                dataKey="kp"
                stroke="#00ff88"
                strokeWidth={3}
                fill="url(#colorKp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-6">Детайлна дневна прогноза</h3>
          <div className="space-y-6">
            {Object.entries(groupedData).map(([day, items]) => {
              const maxDayKp = Math.max(...items.map(i => i.kp));
              const avgDayKp = items.reduce((acc, i) => acc + i.kp, 0) / items.length;
              const status = getStormStatus(maxDayKp);

              return (
                <div key={day} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">{day}</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">
                          Максимален Kp: <span className={`font-semibold ${status.color}`}>{maxDayKp.toFixed(1)}</span>
                        </span>
                        <span className="text-gray-400 text-sm">
                          Среден Kp: <span className="text-white font-semibold">{avgDayKp.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>
                    <div className={`mt-3 md:mt-0 inline-block px-4 py-2 rounded-full text-sm font-semibold ${status.bgColor} ${status.color}`}>
                      {status.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {items.map((item, idx) => {
                      const itemStatus = getStormStatus(item.kp);
                      return (
                        <div
                          key={idx}
                          className={`${itemStatus.bgColor} border ${itemStatus.bgColor.replace('/20', '/30')} rounded-lg p-3`}
                        >
                          <div className="text-xs text-gray-400 mb-1">
                            {item.date.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className={`text-2xl font-bold ${itemStatus.color}`}>
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
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-4">За прогнозата</h3>
          <div className="text-gray-400 space-y-3">
            <p>
              Тази прогноза се базира на данни от NOAA Space Weather Prediction Center и показва очаквания Kp индекс за следващите дни.
            </p>
            <p>
              Прогнозата се актуализира на всеки 5 минути и може да се променя в зависимост от слънчевата активност и космическите условия.
            </p>
            <div className="mt-4">
              <h4 className="text-white font-semibold mb-2">Легенда:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Kp &lt; 4: Спокойно</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Kp 4-4.9: Нестабилно</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Kp 5-6.9: Буря</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Kp 7+: Силна буря</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forecast;

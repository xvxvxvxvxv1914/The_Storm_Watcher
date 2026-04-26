import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import TimeSeriesChart, { type TsPoint } from '../components/charts/TimeSeriesChart';
import { Calendar, TrendingUp, AlertCircle, Sun } from 'lucide-react';
import { getKpForecast, getStormStatus, getKpGradientStyle } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';
import { Skeleton, SkeletonChart } from '../components/Skeleton';

interface ForecastItem {
  time: string;
  fullTime: string;
  kp: number;
  date: Date;
}

const Forecast = () => {
  const { t } = useLanguage();
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLastUpdated] = useState<Date>(new Date());

  const fetchForecast = React.useCallback(async () => {
    try {
      const data = await getKpForecast();
      const formattedData = (data ?? []).map((item) => {
        const date = new Date(item.time_tag);
        return {
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullTime: date.toLocaleString(),
          kp: item.kp_index || item.estimated_kp || 0,
          date: date,
        };
      });
      setForecastData(formattedData);
      setLastUpdated(new Date());
      setLoading(false);
    } catch {
      setForecastData([]);
      setLoading(false);
    }
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
    const grouped: { [key: string]: ForecastItem[] } = {};
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

  // Continuous 3-hour forecast curve. Sorting defends against any
  // upstream re-ordering — lightweight-charts requires ascending time.
  const forecastChartData: TsPoint[] = [...forecastData]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(item => ({
      time: Math.floor(item.date.getTime() / 1000) as TsPoint['time'],
      value: parseFloat(item.kp.toFixed(2)),
    }));

  if (loading) {
    return (
      <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
        <StarField />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Skeleton className="h-12 w-80 mb-3" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-surface rounded-2xl p-6 border border-white/5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <SkeletonChart className="mb-6" />
          <div className="glass-surface rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <Skeleton className="h-5 w-40" />
            </div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/5 last:border-0">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12 rounded-lg" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const maxKp = getMaxKp();
  const avgKp = getAverageKp();
  const stormDays = getDaysWithStorms();
  const groupedData = groupByDay();

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
      <Helmet>
        <title>Kp Index Forecast — The Storm Watcher</title>
        <meta name="description" content="3-day Kp index forecast from NOAA. See predicted geomagnetic storm levels and plan your aurora viewing." />
      </Helmet>
      <StarField />

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
          {forecastChartData.length > 0 ? (
            <TimeSeriesChart
              data={forecastChartData}
              color="#f97316"
              type="area"
              height={300}
              yMin={0}
              yMax={9}
              refLines={[
                { value: 5, color: '#f59e0b', label: 'G1' },
                { value: 7, color: '#ef4444', label: 'G3' },
              ]}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-[#94a3b8]">
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
              {Object.entries(groupedData)
                // NOAA's 3-day forecast cuts off mid-day on day 3 (often a single
                // 00:00 UTC point on the trailing day). Hide partial days so the
                // list isn't padded with a lonely card; the chart still includes
                // every point.
                .filter(([, items]) => items.length >= 4)
                .map(([day, items]) => {
              const maxDayKp = Math.max(...items.map(i => i.kp));
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

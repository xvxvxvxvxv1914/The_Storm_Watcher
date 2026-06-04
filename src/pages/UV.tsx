import { useEffect, useState, useCallback } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import TimeSeriesChart, { type TsPoint } from '../components/charts/TimeSeriesChart';
import { Sun, Shield } from 'lucide-react';
import { getUvIndex, getUvLevel, UvData } from '../services/uvApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import LocationPicker from '../components/LocationPicker';
import ErrorCard from '../components/ErrorCard';
import { reverseGeocode } from '../utils/reverseGeocode';
import { getCurrentPosition } from '../utils/geolocation';

const UV = () => {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [uvData, setUvData] = useState<UvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [currentLat, setCurrentLat] = useState(0);
  const [currentLon, setCurrentLon] = useState(0);

  const loadForCoords = useCallback(async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    setLocationError(false);
    try {
      const data = await getUvIndex(lat, lon);
      setUvData(data);
      setCurrentLat(lat);
      setCurrentLon(lon);
      setLocationName(name ?? await reverseGeocode(lat, lon));
    } catch {
      setLocationError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestGPS = useCallback(() => {
    getCurrentPosition()
      .then(pos => loadForCoords(pos.coords.latitude, pos.coords.longitude))
      .catch(() => loadForCoords(42.7, 23.3));
  }, [loadForCoords]);

  const refresh = useCallback(() => {
    if (currentLat === 0 && currentLon === 0) return;
    return loadForCoords(currentLat, currentLon, locationName || undefined);
  }, [loadForCoords, currentLat, currentLon, locationName]);
  const { pulling, pullY } = usePullToRefresh(refresh);

  useEffect(() => {
    if (settings.preferredLat !== null && settings.preferredLon !== null) {
      loadForCoords(settings.preferredLat, settings.preferredLon, settings.preferredLocationName || undefined);
    } else {
      requestGPS();
    }
  }, [settings.preferredLat, settings.preferredLon, settings.preferredLocationName, loadForCoords, requestGPS]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#fbbf24]/20 border-t-[#fbbf24] rounded-full animate-spin" />
      </div>
    );
  }

  if (locationError || !uvData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorCard message={t('uv.errorLoad')} onRetry={requestGPS} />
      </div>
    );
  }

  const level = getUvLevel(uvData.current);
  const maxLevel = getUvLevel(uvData.max);

  const getSpfKey = (uv: number) => {
    if (uv < 3) return 'uv.spf.low';
    if (uv < 6) return 'uv.spf.moderate';
    if (uv < 8) return 'uv.spf.high';
    if (uv < 11) return 'uv.spf.veryHigh';
    return 'uv.spf.extreme';
  };

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16">
      {pulling && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center w-9 h-9 rounded-full bg-[#fbbf24]/20 border border-[#fbbf24]/40 transition-transform"
          style={{ transform: `translateX(-50%) translateY(${pullY}px)` }}
        >
          <div className="w-4 h-4 border-2 border-[#fbbf24] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <PageMeta
        title="UV Index — The Storm Watcher"
        description="Real-time UV index and sun exposure forecast for your location. Know when to apply sunscreen."
        path="/uv"
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'UV Index', path: '/uv' }]} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-white mb-2 uppercase tracking-tight">
            UV <span className="gradient-solar">Index</span>
          </h1>
          <LocationPicker
            lat={currentLat}
            lon={currentLon}
            locationName={locationName}
            onSelect={(lat, lon, name) => loadForCoords(lat, lon, name)}
            onRequestGPS={requestGPS}
          />
        </div>

        {/* Current UV */}
        <div className="glass-surface rounded-3xl p-10 mb-8 text-center border border-white/10">
          <div className="text-sm text-[#64748b] uppercase tracking-widest mb-3 font-semibold">{t('uv.currentUvIndex')}</div>

          <div
            className="text-[120px] sm:text-[160px] font-bold leading-none mb-4"
            style={{ backgroundImage: `linear-gradient(135deg, ${level.color}, ${level.color}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            {uvData.current.toFixed(1)}
          </div>

          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${level.bg} mb-6`}>
            <Sun className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-lg uppercase tracking-wider">{t(level.labelKey)}</span>
          </div>

          <p className="text-[#94a3b8] max-w-md mx-auto leading-relaxed">{t(level.adviceKey)}</p>

          <div className="mt-5 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border" style={{ borderColor: level.color + '50', background: level.color + '15' }}>
            <Shield className="w-4 h-4 flex-shrink-0" style={{ color: level.color }} />
            <span className="text-sm font-semibold" style={{ color: level.color }}>
              <span className="text-white/50 mr-1.5">{t('uv.spf.label')}:</span>
              {t(getSpfKey(uvData.current))}
            </span>
          </div>
        </div>

        {/* Today's max */}
        <div className="glass-surface rounded-2xl p-4 sm:p-6 mb-8 flex items-center justify-between border border-white/10">
          <div>
            <div className="text-sm text-[#64748b] uppercase tracking-widest mb-1">{t('uv.todaysMax')}</div>
            <div className="text-2xl sm:text-4xl font-bold text-white">{uvData.max.toFixed(1)}</div>
          </div>
          <div className={`px-5 py-2 rounded-full bg-gradient-to-r ${maxLevel.bg}`}>
            <span className="text-white font-bold uppercase tracking-wider">{t(maxLevel.labelKey)}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-surface rounded-2xl p-4 sm:p-8 mb-8 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wide flex items-center gap-3">
            <Sun className="w-5 h-5 text-[#fbbf24]" />
            {t('uv.indexToday')}
          </h3>
          <TimeSeriesChart
            data={uvData.hourly
              .filter(h => h.isoTime)
              .map(h => ({
                time: Math.floor(new Date(h.isoTime).getTime() / 1000) as TsPoint['time'],
                value: h.uv_index,
              }))}
            color="#fbbf24"
            type="area"
            height={280}
            refLines={[
              { value: 3, color: '#10b981', label: t('uv.low3') || 'Low 3' },
              { value: 6, color: '#eab308', label: t('uv.mod6') || 'Moderate 6' },
              { value: 8, color: '#f97316', label: t('uv.high8') || 'High 8' },
            ]}
          />
        </div>

        {/* {t('uv.scale')} */}
        <div className="glass-surface rounded-2xl p-4 sm:p-8 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-5 uppercase tracking-wide">{t('uv.scale')}</h3>
          <div className="space-y-3">
            {[
                { range: '0–2', label: t('uv.scaleLow'), color: '#10b981', advice: t('uv.advLow') },
                { range: '3–5', label: t('uv.scaleModerate'), color: '#eab308', advice: t('uv.advMod') },
                { range: '6–7', label: t('uv.scaleHigh'), color: '#f97316', advice: t('uv.advHigh') },
                { range: '8–10', label: t('uv.scaleVHigh'), color: '#ef4444', advice: t('uv.advVHigh') },
                { range: '11+', label: t('uv.scaleExtreme'), color: '#7c3aed', advice: t('uv.advExtreme') },
            ].map(item => (
              <div key={item.range} className="flex items-center gap-4">
                <div className="w-12 text-center font-bold text-sm" style={{ color: item.color }}>{item.range}</div>
                <div className="w-20 font-semibold text-sm" style={{ color: item.color }}>{item.label}</div>
                <div className="text-[#94a3b8] text-sm">{item.advice}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UV;

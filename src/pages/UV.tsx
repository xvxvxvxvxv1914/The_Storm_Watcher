/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import TimeSeriesChart, { type TsPoint } from '../components/charts/TimeSeriesChart';
import { Sun, AlertTriangle } from 'lucide-react';
import { getUvIndex, getUvLevel, UvData } from '../services/uvApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import LocationPicker from '../components/LocationPicker';

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
      if (name) {
        setLocationName(name);
      } else {
        try {
          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          ).then(r => r.json());
          const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
          const country = geo.address?.country || '';
          setLocationName([city, country].filter(Boolean).join(', '));
        } catch {
          setLocationName(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);
        }
      }
    } catch {
      setLocationError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) { loadForCoords(42.7, 23.3, t('uv.defaultLocation')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => loadForCoords(pos.coords.latitude, pos.coords.longitude),
      () => loadForCoords(42.7, 23.3, t('uv.defaultLocation')),
      { timeout: 5000 }
    );
  }, [loadForCoords, t]);

  useEffect(() => {
    if (settings.preferredLat !== null && settings.preferredLon !== null) {
      loadForCoords(settings.preferredLat, settings.preferredLon, settings.preferredLocationName || undefined);
    } else {
      requestGPS();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-[#f97316] mx-auto mb-4" />
          <p className="text-white text-lg">{t('uv.errorLoad')}</p>
        </div>
      </div>
    );
  }

  const level = getUvLevel(uvData.current);
  const maxLevel = getUvLevel(uvData.max);

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16">
      <Helmet>
        <title>UV Index — The Storm Watcher</title>
        <meta name="description" content="Real-time UV index and sun exposure forecast for your location. Know when to apply sunscreen." />
      </Helmet>
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
        </div>

        {/* Today's max */}
        <div className="glass-surface rounded-2xl p-6 mb-8 flex items-center justify-between border border-white/10">
          <div>
            <div className="text-sm text-[#64748b] uppercase tracking-widest mb-1">{t('uv.todaysMax')}</div>
            <div className="text-4xl font-bold text-white">{uvData.max.toFixed(1)}</div>
          </div>
          <div className={`px-5 py-2 rounded-full bg-gradient-to-r ${maxLevel.bg}`}>
            <span className="text-white font-bold uppercase tracking-wider">{t(maxLevel.labelKey)}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-surface rounded-2xl p-8 mb-8 border border-white/10">
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
        <div className="glass-surface rounded-2xl p-8 border border-white/10">
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

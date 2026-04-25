/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Sun, MapPin, AlertTriangle } from 'lucide-react';
import { getUvIndex, getUvLevel, UvData } from '../services/uvApi';
import { useLanguage } from '../contexts/LanguageContext';

const UV = () => {
  const { t } = useLanguage();
  const [uvData, setUvData] = useState<UvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const data = await getUvIndex(latitude, longitude);
          setUvData(data);

          // Reverse geocode is best-effort and should not break UV rendering.
          try {
            const geo = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            ).then(r => r.json());
            const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
            const country = geo.address?.country || '';
            setLocationName([city, country].filter(Boolean).join(', '));
          } catch {
            setLocationName(t('uv.currentLocation') || t('uv.currentLoc'));
          }
        } catch {
          setLocationError(true);
        } finally {
          setLoading(false);
        }
      },
      async () => {
        // Fallback to Sofia if geolocation denied
        try {
          const data = await getUvIndex(42.7, 23.3);
          setUvData(data);
          setLocationName(t('uv.defaultLocation') || t('uv.sofiaDef'));
        } catch {
          setLocationError(true);
        } finally {
          setLoading(false);
        }
      },
      { timeout: 5000 }
    );
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
  const currentHour = new Date().getHours();

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
          {locationName && (
            <div className="flex items-center gap-2 text-[#94a3b8]">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{locationName}</span>
            </div>
          )}
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
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={uvData.hourly}>
              <defs>
                <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(10,0,21,0.95)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', padding: '12px' }}
                labelStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                itemStyle={{ color: '#fff' }}
                formatter={(v: unknown) => [Number(v), t('uv.chartTooltip')]}
              />
              <ReferenceLine y={3} stroke="#10b981" strokeDasharray="4 4" label={{ value: t('uv.low3'), fill: '#10b981', fontSize: 11 }} />
              <ReferenceLine y={6} stroke="#eab308" strokeDasharray="4 4" label={{ value: t('uv.mod6'), fill: '#eab308', fontSize: 11 }} />
              <ReferenceLine y={8} stroke="#f97316" strokeDasharray="4 4" label={{ value: t('uv.high8'), fill: '#f97316', fontSize: 11 }} />
              <ReferenceLine x={uvData.hourly[currentHour]?.time} stroke="#ffffff50" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="uv_index" stroke="#fbbf24" strokeWidth={2} fill="url(#uvGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
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

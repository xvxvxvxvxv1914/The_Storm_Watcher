import { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sunrise, Sunset, Sun, Clock } from 'lucide-react';
import { getSunData, SunDay } from '../services/uvApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import LocationPicker from '../components/LocationPicker';

const formatDaylight = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
};

const SunArc = ({ sunrise, sunset }: { sunrise: string; sunset: string }) => {
  const now = new Date();
  const today = now.toDateString();

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.replace(/\s*(AM|PM)/i, '').split(':').map(Number);
    const isPM = timeStr.toLowerCase().includes('pm');
    return new Date(`${today} ${isPM && h !== 12 ? h + 12 : h}:${m}`);
  };

  const sunriseDate = parseTime(sunrise);
  const sunsetDate = parseTime(sunset);
  const totalMs = sunsetDate.getTime() - sunriseDate.getTime();
  const elapsedMs = Math.min(Math.max(now.getTime() - sunriseDate.getTime(), 0), totalMs);
  const progress = totalMs > 0 ? elapsedMs / totalMs : 0;

  const cx = 200;
  const cy = 160;
  const r = 120;
  const startAngle = Math.PI;
  const endAngle = 0;
  const angle = startAngle + progress * (endAngle - startAngle);
  const sunX = cx + r * Math.cos(angle);
  const sunY = cy - r * Math.sin(angle);
  const isVisible = progress > 0 && progress < 1;

  return (
    <svg viewBox="0 0 400 180" className="w-full max-w-md mx-auto">
      {/* Arc track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#ffffff10"
        strokeWidth="3"
      />
      {/* Elapsed arc */}
      {progress > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`}
          fill="none"
          stroke="#f97316"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {/* Horizon line */}
      <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="#ffffff20" strokeWidth="1" />
      {/* Sun dot */}
      {isVisible && (
        <>
          <circle cx={sunX} cy={sunY} r="14" fill="#f97316" opacity="0.2" />
          <circle cx={sunX} cy={sunY} r="8" fill="#fbbf24" />
        </>
      )}
      {/* Sunrise label */}
      <text x={cx - r} y={cy + 20} textAnchor="middle" fill="#94a3b8" fontSize="12">{sunrise}</text>
      {/* Sunset label */}
      <text x={cx + r} y={cy + 20} textAnchor="middle" fill="#94a3b8" fontSize="12">{sunset}</text>
    </svg>
  );
};

const SunTimes = () => {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [days, setDays] = useState<SunDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('');
  const [currentLat, setCurrentLat] = useState(0);
  const [currentLon, setCurrentLon] = useState(0);

  const loadForCoords = useCallback(async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    const data = await getSunData(lat, lon);
    setDays(data);
    setCurrentLat(lat);
    setCurrentLon(lon);
    setLoading(false);
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
  }, []);

  const requestGPS = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => loadForCoords(pos.coords.latitude, pos.coords.longitude),
      () => loadForCoords(42.7, 23.3, t('uv.defaultLocation')),
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
        <div className="w-16 h-16 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
      </div>
    );
  }

  const today = days[0];

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16">
      <Helmet>
        <title>Sunrise & Sunset Times — The Storm Watcher</title>
        <meta name="description" content="Accurate sunrise, sunset and golden hour times for your location. Plan your photography and outdoor activities." />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-white mb-2 uppercase tracking-tight">
            <span className="gradient-solar">{t('sun.title')}</span> {t('sun.times')}
          </h1>
          <LocationPicker
            lat={currentLat}
            lon={currentLon}
            locationName={locationName}
            onSelect={(lat, lon, name) => loadForCoords(lat, lon, name)}
            onRequestGPS={requestGPS}
          />
        </div>

        {/* Sun arc */}
        {today && (
          <div className="glass-surface rounded-3xl p-8 mb-8 border border-white/10">
            <div className="text-sm text-[#64748b] uppercase tracking-widest mb-6 font-semibold text-center">
              {formatDate(today.date)}
            </div>
            <SunArc sunrise={today.sunrise} sunset={today.sunset} />

            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-[#fbbf24] mb-2">
                  <Sunrise className="w-5 h-5" />
                  <span className="text-sm uppercase tracking-wider font-bold">{t('sun.sunrise')}</span>
                </div>
                <div className="text-4xl font-bold text-white">{today.sunrise}</div>
                <div className="text-[#64748b] text-xs mt-1">{t('sun.goldenMorning')} {today.goldenMorningEnd}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-[#f97316] mb-2">
                  <Sunset className="w-5 h-5" />
                  <span className="text-sm uppercase tracking-wider font-bold">{t('sun.sunset')}</span>
                </div>
                <div className="text-4xl font-bold text-white">{today.sunset}</div>
                <div className="text-[#64748b] text-xs mt-1">{t('sun.goldenEvening')} {today.goldenEveningStart}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-8 glass-surface rounded-xl px-6 py-3 w-fit mx-auto">
              <Clock className="w-4 h-4 text-[#94a3b8]" />
              <span className="text-[#94a3b8] text-sm">{t('sun.daylight')}:</span>
              <span className="text-white font-bold">{formatDaylight(today.daylightSeconds)}</span>
            </div>
          </div>
        )}

        {/* Next 2 days */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {days.slice(1).map((day) => (
            <div key={day.date} className="glass-surface rounded-2xl p-7 border border-white/10">
              <div className="text-[#94a3b8] text-sm font-semibold mb-5">{formatDate(day.date)}</div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#fbbf24]">
                    <Sunrise className="w-4 h-4" />
                    <span className="text-sm">{t('sun.sunrise')}</span>
                  </div>
                  <span className="text-white font-bold">{day.sunrise}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#f97316]">
                    <Sunset className="w-4 h-4" />
                    <span className="text-sm">{t('sun.sunset')}</span>
                  </div>
                  <span className="text-white font-bold">{day.sunset}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 text-[#94a3b8]">
                    <Sun className="w-4 h-4" />
                    <span className="text-sm">{t('sun.daylight')}</span>
                  </div>
                  <span className="text-white font-bold">{formatDaylight(day.daylightSeconds)}</span>
                </div>
                <div className="text-xs text-[#64748b] pt-1">
                  Golden hour: {day.goldenMorningEnd} · {day.goldenEveningStart}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default SunTimes;

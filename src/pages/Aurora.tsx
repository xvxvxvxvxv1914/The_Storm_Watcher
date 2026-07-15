import { useEffect, useState, useRef, useCallback, lazy, Suspense, useMemo, Component, type ReactNode } from 'react';
import { useVisibilityInterval } from '../hooks/useVisibilityInterval';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { MapPin, Eye, Sparkles, AlertTriangle, Check, Zap, Share2 } from 'lucide-react';
import { getKpIndex, getAuroraModel, getMagField, getSolarWind, getWeatherData, getKpGradientStyle, type AuroraOvationPoint, type WeatherData } from '../services/noaaApi';
import { calcAuroraVisibility } from '../utils/auroraVisibility';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { logError } from '../utils/logger';
import { getCurrentPosition, resolveLocation } from '../utils/geolocation';
import { reverseGeocode } from '../utils/reverseGeocode';
import KpGauge from '../components/KpGauge';

const AuroraGlobe = lazy(() => import('../components/AuroraGlobe'));

class GlobeErrorBoundary extends Component<{ children: ReactNode; t: (k: string) => string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      const { t } = this.props;
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="text-[#64748b] text-sm">{t('aurora.globeError') || '3D globe failed to load'}</div>
          <button
            className="text-xs px-4 py-1.5 rounded-full border border-[#10b981]/40 text-[#10b981] hover:bg-[#10b981]/10 transition-colors"
            onClick={() => this.setState({ failed: false })}
            aria-label={t('aurora.globeRetry') || 'Retry loading 3D globe'}
          >
            {t('aurora.globeRetry') || 'Retry'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Aurora = () => {
  const { t } = useLanguage();
  const { settings, updateSettings } = useSettings();
  const { theme } = useTheme();
  const [kpValue, setKpValue] = useState<number>(0);
  const [auroraData, setAuroraData] = useState<AuroraOvationPoint[]>([]);
  const [bz, setBz] = useState<number>(0);
  const [bt, setBt] = useState<number>(0);
  const [windSpeed, setWindSpeed] = useState<number>(0);
  const [windDensity, setWindDensity] = useState<number>(0);
  const [globeWidth, setGlobeWidth] = useState(800);
  const [localWeather, setLocalWeather] = useState<WeatherData | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [isGlobeLoading, setIsGlobeLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const [isGlobeVisible, setIsGlobeVisible] = useState(true);
  // Defer loading the 1.2 MB globe bundle until the container enters the viewport
  const [globeChunkLoaded, setGlobeChunkLoaded] = useState(false);

  const getMoonPhase = () => {
    const date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Simple Moon phase approximation
    if (month < 3) { year--; month += 12; }
    month++;
    const c = 365.25 * year;
    const e = 30.6 * month;
    let jd = c + e + day - 694039.09; // jd is total days since new moon 1900
    jd /= 29.5305882; // divide by the moon cycle
    const b = Math.floor(jd); // int(jd)
    jd -= b; // get fractional part of jd
    return Math.round(jd * 8); // scale fraction from 0-8 and round
  };

  useEffect(() => {
    let mounted = true;
    setIsWeatherLoading(true);

    const load = async (lat: number, lon: number) => {
      setUserLat(lat);
      setUserLng(lon);
      try {
        const data = await getWeatherData(lat, lon);
        if (!mounted) return;
        setLocalWeather(data);
      } catch {
        if (!mounted) return;
        setLocationError(true);
      } finally {
        if (mounted) setIsWeatherLoading(false);
      }
    };

    if (settings.preferredLat !== null && settings.preferredLon !== null) {
      load(settings.preferredLat, settings.preferredLon);
    } else {
      // Silent: GPS only when permission is already granted, otherwise the IP
      // city. Never triggers a permission prompt — the "allow" button in the
      // error state below requests precise location on an explicit tap.
      resolveLocation()
        .then(loc => {
          if (loc) load(loc.lat, loc.lon);
          else if (mounted) { setLocationError(true); setIsWeatherLoading(false); }
        })
        .catch(() => { if (mounted) { setLocationError(true); setIsWeatherLoading(false); } });
    }

    return () => { mounted = false; };
  }, [settings.preferredLat, settings.preferredLon]);

  const handleGlobeResize = useCallback((entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      setGlobeWidth(Math.floor(entry.contentRect.width));
    }
  }, []);

  useEffect(() => {
    if (!globeContainerRef.current) return;
    const ro = new ResizeObserver(handleGlobeResize);
    ro.observe(globeContainerRef.current);
    return () => ro.disconnect();
  }, [handleGlobeResize]);

  useEffect(() => {
    const el = globeContainerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setGlobeChunkLoaded(true);
        setIsGlobeVisible(entry.isIntersecting);
        // Immersive cinema mode: hide the bottom tab bar while globe is on screen
        document.body.classList.toggle('immersive-globe', entry.isIntersecting);
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      document.body.classList.remove('immersive-globe');
    };
  }, []);

  const fetchAuroraModel = useCallback(async () => {
    setIsGlobeLoading(true);
    const points = await getAuroraModel();
    setAuroraData(points);
    setIsGlobeLoading(false);
  }, []);
  useEffect(() => { fetchAuroraModel(); }, [fetchAuroraModel]);
  useVisibilityInterval(fetchAuroraModel, 300000);

  const fetchKp = useCallback(async () => {
    try {
      const data = await getKpIndex();
      if (data && data.length > 0) {
        const latest = data[data.length - 1];
        setKpValue(latest.kp_index ?? latest.estimated_kp ?? 0);
      } else {
        setKpValue(0);
      }
    } catch (error) {
      logError('Error fetching Kp index:', error);
      setKpValue(0);
    }
  }, []);
  useEffect(() => { fetchKp(); }, [fetchKp]);
  useVisibilityInterval(fetchKp, 60000);

  const fetchSpace = useCallback(async () => {
    try {
      const [magData, windData] = await Promise.all([getMagField(), getSolarWind()]);
      if (magData.length) {
        const latest = magData[magData.length - 1];
        setBz(latest.bz_gsm ?? 0);
        setBt(latest.bt ?? 0);
      }
      if (windData.length) {
        const active = windData.findLast(d => d.active) ?? windData[windData.length - 1];
        setWindSpeed(active.proton_speed ?? 0);
        setWindDensity(active.proton_density ?? 0);
      }
    } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchSpace(); }, [fetchSpace]);
  useVisibilityInterval(fetchSpace, 60000);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchKp(), fetchAuroraModel(), fetchSpace()]);
  }, [fetchKp, fetchAuroraModel, fetchSpace]);
  const { pulling, pullY } = usePullToRefresh(refreshAll);

  const getVisibilityInfo = (kp: number) => {
    if (kp >= 7) return { latitude: 50, color: 'text-[#ef4444]', intensityKey: 'aurora.intensityVeryHigh', bgGlow: 'glow-red' };
    if (kp >= 6) return { latitude: 55, color: 'text-[#f97316]', intensityKey: 'aurora.intensityHigh', bgGlow: 'glow-orange' };
    if (kp >= 5) return { latitude: 60, color: 'text-[#fbbf24]', intensityKey: 'aurora.intensityModerate', bgGlow: 'glow-orange' };
    if (kp >= 4) return { latitude: 65, color: 'text-[#10b981]', intensityKey: 'aurora.intensityLow', bgGlow: 'glow-green' };
    return { latitude: 70, color: 'text-[#94a3b8]', intensityKey: 'aurora.intensityVeryLow', bgGlow: '' };
  };

  const visibility = getVisibilityInfo(kpValue);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const auroraQuality = Math.round(
    clamp((-bz / 30) * 100, 0, 100) * 0.5 +
    clamp((bt / 30) * 100, 0, 100) * 0.2 +
    clamp(((windSpeed - 300) / 500) * 100, 0, 100) * 0.2 +
    clamp((windDensity / 20) * 100, 0, 100) * 0.1
  );
  const qualityLabel = auroraQuality >= 76 ? t('aurora.quality.excellent') : auroraQuality >= 51 ? t('aurora.quality.good') : auroraQuality >= 26 ? t('aurora.quality.moderate') : t('aurora.quality.low');
  const qualityColor = auroraQuality >= 76 ? '#10b981' : auroraQuality >= 51 ? '#f97316' : auroraQuality >= 26 ? '#eab308' : '#64748b';
  const qualityDesc = auroraQuality >= 76
    ? t('aurora.quality.desc.excellent')
    : auroraQuality >= 51
    ? t('aurora.quality.desc.good')
    : auroraQuality >= 26
    ? t('aurora.quality.desc.moderate')
    : t('aurora.quality.desc.low');

  const stars = useMemo(() =>
    [...Array(50)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
    })), []);

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
      {pulling && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center w-9 h-9 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 transition-transform"
          style={{ transform: `translateX(-50%) translateY(${pullY}px)` }}
        >
          <div className="w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <PageMeta
        title="Can I see the Aurora tonight? Live Forecast & Checklist | The Storm Watcher"
        description="Check your local aurora visibility in seconds. Interactive 3D OVATION model, real-time cloud cover, moon phase, and Kp index checklist for perfect aurora hunting."
        path="/aurora"
        ogKp={kpValue}
      >
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Aurora Forecast — The Storm Watcher",
          "url": "https://thestormwatcher.com/aurora",
          "description": "Live aurora borealis forecast with 3D OVATION model and real-time Kp index"
        })}</script>
      </PageMeta>
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Aurora', path: '/aurora' }]} />
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

      <div className="magnetic-orb" style={{ top: '-100px', right: '-200px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 md:mb-12">
          <div className="flex justify-center md:justify-start mb-4 md:mb-5">
            <img
              src="/logos/logo-transparent.png"
              alt="The Storm Watcher"
              className="h-16 md:h-20 w-auto"
              style={{ filter: 'drop-shadow(0 0 16px rgba(16,185,129,0.55)) drop-shadow(0 0 36px rgba(16,185,129,0.25))', animation: 'twinkle 4s ease-in-out infinite' }}
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold gradient-emerald mb-3 uppercase tracking-tight">
            {t('aurora.title')}
          </h1>
          <p className="text-[#94a3b8] text-base md:text-lg">
            {t('aurora.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-12">
          <div className={`glass-surface rounded-2xl p-4 sm:p-8 ${visibility.bgGlow} hover:scale-105 transition-transform`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.kpIndex')}
              </h3>
            </div>
            <div className="text-6xl font-bold mb-1" style={getKpGradientStyle(kpValue)}>{kpValue.toFixed(1)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('aurora.currentValue')}</div>
            <KpGauge kp={kpValue} />
          </div>

          <div className={`glass-surface rounded-2xl p-4 sm:p-8 ${visibility.bgGlow} hover:scale-105 transition-transform`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.intensity')}
              </h3>
            </div>
            <div className={`text-4xl font-bold mb-3 ${visibility.color}`}>{t(visibility.intensityKey)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('aurora.strength')}</div>
          </div>

          <div className="glass-surface rounded-2xl p-4 sm:p-8 hover:glow-green transition-all hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.visibleFrom')}
              </h3>
            </div>
            <div className="text-6xl font-bold text-white mb-3">{visibility.latitude}°</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('aurora.latNorth')}</div>
          </div>
        </div>

        {/* Aurora Quality Index */}
        <div className="glass-surface rounded-2xl p-5 sm:p-8 mb-6 md:mb-8 border border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="shrink-0">
              <div className="text-xs text-[#64748b] uppercase tracking-widest mb-1 font-semibold">{t('aurora.qualityIndex') || 'Aurora Quality Index'}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-bold" style={{ color: qualityColor }}>{auroraQuality}</span>
                <span className="text-[#94a3b8] text-lg">/100</span>
                <span className="ml-2 text-sm font-semibold px-3 py-1 rounded-full" style={{ color: qualityColor, background: qualityColor + '20' }}>{qualityLabel}</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="h-3 rounded-full bg-white/5 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${auroraQuality}%`, background: `linear-gradient(90deg, ${qualityColor}80, ${qualityColor})` }}
                />
              </div>
              <p className="text-[#94a3b8] text-sm mb-3">{qualityDesc}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#64748b]">
                <span>Bz <span className={bz < 0 ? 'text-[#10b981]' : 'text-[#94a3b8]'}>{bz.toFixed(1)} nT</span></span>
                <span>Bt <span className="text-[#94a3b8]">{bt.toFixed(1)} nT</span></span>
                <span>Wind <span className="text-[#94a3b8]">{Math.round(windSpeed)} km/s</span></span>
                <span>Density <span className="text-[#94a3b8]">{windDensity.toFixed(1)} cm⁻³</span></span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-[#374151] mt-4">
            {t('aurora.qualityWeights') || 'Bz 50% · Bt 20% · Solar wind speed 20% · Density 10%. More accurate than Kp alone.'}
          </p>
        </div>

        <div className="glass-surface rounded-2xl p-4 sm:p-8 mb-6 md:mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">
            {t('aurora.visibilityEurope')}
          </h3>
          <div className="space-y-3">
            {[
              { city: t('aurora.city.reykjavik'), lat: 64.1, lon: -21.9 },
              { city: t('aurora.city.helsinki'),   lat: 60.2, lon:  24.9 },
              { city: t('aurora.city.stockholm'),  lat: 59.3, lon:  18.1 },
              { city: t('aurora.city.copenhagen'), lat: 55.7, lon:  12.6 },
              { city: t('aurora.city.berlin'),     lat: 52.5, lon:  13.4 },
              { city: t('aurora.city.warsaw'),     lat: 52.2, lon:  21.0 },
              { city: t('aurora.city.prague'),     lat: 50.1, lon:  14.4 },
              { city: t('aurora.city.vienna'),     lat: 48.2, lon:  16.4 },
              { city: t('aurora.city.sofia'),      lat: 42.7, lon:  23.3 },
            ].map(({ city, lat, lon }) => {
              const chance = calcAuroraVisibility(lat, lon, kpValue);
              const visible = chance > 0;
              return (
                <div key={city} className="flex items-center gap-2 sm:gap-4">
                  <div className="w-24 sm:w-48 text-xs sm:text-sm text-[#94a3b8] flex-shrink-0">{city}</div>
                  <div className="flex-1 bg-white/5 rounded-full h-2 sm:h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${visible ? Math.max(4, chance) : 2}%`,
                        background: visible
                          ? 'linear-gradient(90deg, #10b981, #fbbf24)'
                          : 'rgba(148,163,184,0.2)',
                      }}
                    />
                  </div>
                  <div className={`text-xs sm:text-sm font-bold w-14 sm:w-24 text-right flex-shrink-0 ${visible ? 'text-[#10b981]' : 'text-[#475569]'}`}>
                    {visible ? `~${chance}%` : t('aurora.notVisible')}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[#475569] text-xs mt-4">* {t('aurora.approxChance')} {kpValue.toFixed(1)}</p>
        </div>


        {/* Visibility Checklist */}
        <div className="glass-surface rounded-2xl p-6 sm:p-8 mb-8 border border-white/5 overflow-hidden relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#10b981]" />
                {t('aurora.visibility.title')}
              </h3>
              <p className="text-[#94a3b8] text-sm">{t('aurora.visibility.desc')}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-8">
              {isWeatherLoading ? (
                <div className="flex items-center gap-2 text-[#94a3b8] text-sm animate-pulse">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {t('aurora.visibility.checking')}
                </div>
              ) : locationError ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-[#94a3b8] text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t('aurora.visibility.noLocation')}
                  </div>
                  <button
                    onClick={() => {
                      setLocationError(false);
                      setIsWeatherLoading(true);
                      // User gesture — the one place this page may show the
                      // OS/browser permission dialog. Saving to settings makes
                      // every location page pick the fix up.
                      getCurrentPosition()
                        .then(async pos => {
                          const lat = pos.coords.latitude;
                          const lon = pos.coords.longitude;
                          const name = await reverseGeocode(lat, lon);
                          updateSettings({ preferredLat: lat, preferredLon: lon, preferredLocationName: name, locationMode: 'auto' });
                        })
                        .catch(() => { setLocationError(true); setIsWeatherLoading(false); });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-xs font-semibold hover:bg-[#10b981]/25 transition-colors"
                  >
                    {t('location.prompt.allow') || 'Allow Location'}
                  </button>
                </div>
              ) : localWeather ? (
                <>
                  {/* Clouds */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${localWeather.cloudCover < 30 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                      {localWeather.cloudCover < 30 ? <Check className="w-5 h-5" /> : <Zap className="w-5 h-5 rotate-180" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-bold">{t('aurora.visibility.clouds')}</div>
                    <div className="text-xs text-white font-medium">{localWeather.cloudCover}%</div>
                  </div>

                  {/* Kp */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${kpValue >= 4 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#eab308]/20 text-[#eab308]'}`}>
                      {kpValue >= 4 ? <Check className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-bold">{t('aurora.visibility.kp')}</div>
                    <div className="text-xs text-white font-medium">{kpValue >= 4 ? t('aurora.visibility.kpHigh') : t('aurora.visibility.kpLow')}</div>
                  </div>

                  {/* Moon */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${getMoonPhase() === 0 || getMoonPhase() === 4 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#fbbf24]/20 text-[#fbbf24]'}`}>
                      {getMoonPhase() === 0 || getMoonPhase() === 4 ? <Check className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-bold">{t('aurora.visibility.moon')}</div>
                    <div className="text-xs text-white font-medium">{getMoonPhase() === 0 ? t('aurora.visibility.moonDark') : t('aurora.visibility.moonBright')}</div>
                  </div>

                  {/* Final Verdict */}
                  <div className={`ml-4 px-6 py-3 rounded-xl flex items-center gap-3 border ${localWeather.cloudCover < 40 && kpValue >= 4 ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : 'bg-white/5 border-white/10 text-[#94a3b8]'}`}>
                    <div className={`w-3 h-3 rounded-full animate-pulse ${localWeather.cloudCover < 40 && kpValue >= 4 ? 'bg-[#10b981]' : 'bg-[#94a3b8]'}`} />
                    <span className="font-bold text-sm uppercase tracking-wider">
                      {localWeather.cloudCover < 40 && kpValue >= 4 ? t('aurora.visibility.go') : t('aurora.visibility.wait')}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Share Conditions Button */}
        {localWeather && (
          <div className="flex justify-center -mt-4 mb-8">
            <button
              onClick={() => {
                const moonText = getMoonPhase() === 0 ? 'Dark' : 'Bright';
                const verdict = localWeather.cloudCover < 40 && kpValue >= 4 ? '✅ GO!' : '⏳ WAIT';
                const text = `🌌 Aurora conditions right now:\n⚡ Kp: ${kpValue.toFixed(1)}\n☁️ Clouds: ${localWeather.cloudCover}%\n🌙 Moon: ${moonText}\n📊 Verdict: ${verdict}\n\nCheck yours → thestormwatcher.com/aurora`;
                navigator.clipboard.writeText(text);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 glass-surface rounded-xl text-sm font-bold uppercase tracking-wider text-[#94a3b8] hover:text-white border border-white/10 hover:border-[#10b981]/30 hover:bg-[#10b981]/10 transition-all hover:scale-105"
            >
              {shareCopied ? (
                <><Check className="w-4 h-4 text-[#10b981]" /> <span className="text-[#10b981]">{t('aurora.copied')}</span></>
              ) : (
                <><Share2 className="w-4 h-4" /> {t('aurora.shareConditions')}</>
              )}
            </button>
          </div>
        )}
        
        <div className="rounded-3xl overflow-hidden mb-8 flex flex-col items-center w-full" style={{
          background: 'linear-gradient(180deg, #0d0d1f 0%, #050510 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <div className="flex items-center justify-between w-full p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-xl font-bold uppercase tracking-wide" style={{ color: 'white' }}>
              {t('aurora.oval')}
            </h3>
            {isGlobeLoading && <div className="w-5 h-5 border-2 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin" />}
          </div>
          
          <div ref={globeContainerRef} className="relative w-full flex justify-center cursor-grab active:cursor-grabbing" style={{ minHeight: Math.max(320, Math.round(globeWidth * 0.75)), background: '#050510' }}>
            <GlobeErrorBoundary t={t}>
              <Suspense fallback={
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin mb-4" />
                  <div className="text-[#10b981] font-bold tracking-widest text-sm uppercase animate-pulse">{t('aurora.loadingModel')}</div>
                </div>
              }>
                {globeChunkLoaded && <AuroraGlobe
                  globeWidth={globeWidth}
                  isGlobeLoading={isGlobeLoading}
                  auroraData={auroraData}
                  theme={theme}
                  userLat={userLat}
                  userLng={userLng}
                  active={isGlobeVisible}
                />}
              </Suspense>
            </GlobeErrorBoundary>
          </div>
          
          <div className="w-full px-8 py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              {t('aurora.ovalDesc')} · Use your mouse to rotate and zoom the globe. Bright green indicates the base of the aurora, shifting into cyan, purple, and vibrant pink at the highest active intensities.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-surface rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">
              {t('aurora.bestViewing')}
            </h3>
            <ul className="space-y-3 text-[#94a3b8] leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-[#10b981] mt-1">•</span>
                <span>{t('aurora.tip1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#10b981] mt-1">•</span>
                <span>{t('aurora.tip2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#10b981] mt-1">•</span>
                <span>{t('aurora.tip3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#10b981] mt-1">•</span>
                <span>{t('aurora.tip4')}</span>
              </li>
            </ul>
          </div>

          <div className="glass-surface rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">
              {t('aurora.whatAreAuroras')}
            </h3>
            <p className="text-[#94a3b8] leading-relaxed">
              {t('aurora.auroraDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aurora;

import { useEffect, useRef, useState, useCallback, Suspense, Component, type ReactNode, lazy } from 'react';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import StarField from '../components/StarField';
import { MapPin, Clock, Eye, Satellite } from 'lucide-react';
const ISSGlobe = lazy(() => import('../components/ISSGlobe'));

class ISSGlobeErrorBoundary extends Component<{ children: ReactNode; t: (k: string) => string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      const { t } = this.props;
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="text-[#64748b] text-sm">{t('aurora.globeError') || '3D globe failed to load'}</div>
          <button
            className="text-xs px-4 py-1.5 rounded-full border border-[#f97316]/40 text-[#f97316] hover:bg-[#f97316]/10 transition-colors"
            onClick={() => this.setState({ failed: false })}
          >
            {t('aurora.globeRetry') || 'Retry'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { getIssPosition, getIssPasses, IssPosition, IssPass } from '../services/issApi';
import { getAuroraModel, AuroraOvationPoint } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { reverseGeocode } from '../utils/reverseGeocode';
import { resolveLocation } from '../utils/geolocation';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

const ISS = () => {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const [globeWidth, setGlobeWidth] = useState(780);
  const [position, setPosition] = useState<IssPosition | null>(null);
  const [passes, setPasses] = useState<IssPass[]>([]);
  const [loadingPos, setLoadingPos] = useState(true);
  const [loadingPasses, setLoadingPasses] = useState(true);
  const [posError, setPosError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [locationName, setLocationName] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [auroraData, setAuroraData] = useState<AuroraOvationPoint[]>([]);

  const handleGlobeResize = useCallback((entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.contentRect.width > 0) {
        setGlobeWidth(Math.floor(entry.contentRect.width));
      }
    }
  }, []);

  useEffect(() => {
    if (!globeContainerRef.current) return;
    const ro = new ResizeObserver(handleGlobeResize);
    ro.observe(globeContainerRef.current);
    return () => ro.disconnect();
  }, [handleGlobeResize]);

  // Fetch aurora OVATION data once on mount
  useEffect(() => {
    getAuroraModel().then(setAuroraData).catch(() => {});
  }, []);

  const fetchPos = useCallback(async () => {
    try {
      const pos = await getIssPosition();
      setPosition(pos);
      setPosError(false);
      setLastUpdated(new Date());
    } catch {
      setPosError(true);
    } finally {
      setLoadingPos(false);
    }
  }, []);

  // Live ISS position — refresh every 5s
  useEffect(() => {
    fetchPos();
    const interval = setInterval(() => { if (document.visibilityState !== 'hidden') fetchPos(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchPos]);

  const { pulling, pullY } = usePullToRefresh(fetchPos);

  const defaultLocationLabel = t('uv.defaultLocation') || 'Sofia, Bulgaria (default)';

  // Pass predictions + reverse geocode — run once on mount only.
  useEffect(() => {
    let mounted = true;

    const load = async (lat: number, lon: number) => {
      if (!mounted) return;
      setUserCoords({ lat, lon });
      try {
        const p = await getIssPasses(lat, lon);
        if (mounted) setPasses(p);
      } catch {
        // silent
      } finally {
        if (mounted) setLoadingPasses(false);
      }
      const geoName = await reverseGeocode(lat, lon);
      if (mounted) setLocationName(geoName);
    };

    if (settings.preferredLat !== null && settings.preferredLon !== null) {
      load(settings.preferredLat, settings.preferredLon);
      if (settings.preferredLocationName) setLocationName(settings.preferredLocationName);
    } else {
      // Silent: GPS only when permission is already granted, otherwise the IP
      // city. Never triggers a permission prompt. Sofia is the last resort.
      resolveLocation()
        .then(loc => {
          if (loc) {
            load(loc.lat, loc.lon);
            if (loc.name && mounted) setLocationName(loc.name);
          } else {
            load(42.7, 23.3);
            if (mounted) setLocationName(defaultLocationLabel);
          }
        })
        .catch(() => { load(42.7, 23.3); if (mounted) setLocationName(defaultLocationLabel); });
    }

    return () => { mounted = false; };
  }, [settings.preferredLat, settings.preferredLon, settings.preferredLocationName, defaultLocationLabel]);

  const getElevationColor = (el: number) => {
    if (el >= 60) return '#10b981';
    if (el >= 30) return '#fbbf24';
    return '#f97316';
  };

  const getElevationLabel = (el: number) => {
    if (el >= 60) return t('iss.excellentShort') || 'Excellent';
    if (el >= 30) return t('iss.goodShort') || 'Good';
    return t('iss.lowShort') || 'Low';
  };

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16">
      <StarField />
      {pulling && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center w-9 h-9 rounded-full bg-[#f97316]/20 border border-[#f97316]/40 transition-transform"
          style={{ transform: `translateX(-50%) translateY(${pullY}px)` }}
        >
          <div className="w-4 h-4 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <PageMeta
        title="ISS Tracker — The Storm Watcher"
        description="Track the International Space Station in real time. See live position, altitude, speed and next pass times over your location."
        path="/iss"
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'ISS Tracker', path: '/iss' }]} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 uppercase tracking-tight">
            <span className="gradient-solar">ISS</span> Tracker
          </h1>
          <p className="text-[#94a3b8] text-sm">{t('iss.subtitle')}</p>
          {locationName && (
            <div className="flex items-center gap-2 text-[#94a3b8] mt-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{locationName}</span>
            </div>
          )}
        </div>

        {/* Globe */}
        <div className="glass-surface rounded-3xl overflow-hidden border border-white/10 mb-8 flex flex-col items-center">
          <div className="flex items-center gap-3 w-full px-8 pt-6 pb-2">
            <div className={`w-3 h-3 rounded-full ${posError ? 'bg-[#ef4444]' : 'bg-[#10b981] animate-pulse'}`} />
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">{t('iss.livePosition')}</h2>
            <span className="text-[#64748b] text-xs">
              {posError ? (t('iss.signalLost') || 'Signal lost — last known position') : t('iss.updates5s')}
            </span>
            {lastUpdated && (
              <span className="ml-auto text-xs text-[#475569]">{lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>

          <div ref={globeContainerRef} style={{ minHeight: Math.max(280, Math.round(globeWidth * 0.74)) }} className="w-full flex flex-col items-center justify-center relative">
            {loadingPos ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <ISSGlobeErrorBoundary t={t}>
                <Suspense fallback={<div style={{ width: globeWidth, height: Math.max(280, Math.round(globeWidth * 0.74)), background: '#050510' }} />}>
                  <ISSGlobe
                    globeWidth={globeWidth}
                    auroraData={auroraData}
                    issLat={position?.latitude ?? null}
                    issLng={position?.longitude ?? null}
                    userLat={userCoords?.lat}
                    userLng={userCoords?.lon}
                    theme={theme}
                    active={true}
                  />
                </Suspense>
                </ISSGlobeErrorBoundary>

                {/* Stats */}
                {position && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full px-8 pb-8">
                    <div className="text-center">
                      <div className="text-[#64748b] text-xs uppercase tracking-wider mb-1">{t('iss.latitude')}</div>
                      <div className="text-xl font-bold text-white">{position.latitude.toFixed(2)}°</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[#64748b] text-xs uppercase tracking-wider mb-1">{t('iss.longitude')}</div>
                      <div className="text-xl font-bold text-white">{position.longitude.toFixed(2)}°</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[#64748b] text-xs uppercase tracking-wider mb-1">{t('iss.altitude')}</div>
                      <div className="text-xl font-bold text-white">{position.altitude.toFixed(0)} km</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[#64748b] text-xs uppercase tracking-wider mb-1">{t('iss.speed')}</div>
                      <div className="text-xl font-bold text-white">{Math.round(position.velocity).toLocaleString()} km/h</div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-6 pb-5 text-xs text-[#64748b]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f97316] inline-block" />{t('iss.locIss')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#10b981] inline-block" />{t('iss.locYou')}</span>
            </div>
          </div>
        </div>

        {/* Pass predictions */}
        <div className="glass-surface rounded-2xl p-4 sm:p-8 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-3">
            <Satellite className="w-5 h-5 text-[#f97316]" />
            {t('iss.upcomingPasses')}
          </h2>
          <p className="text-[#64748b] text-sm mb-6">{t('iss.passesSubtitle')}</p>

          {loadingPasses ? (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
            </div>
          ) : passes.length === 0 ? (
            <div className="text-center py-10">
              <Satellite className="w-10 h-10 text-[#334155] mx-auto mb-3" />
              <p className="text-[#94a3b8] text-sm font-semibold mb-1">{t('iss.noPasses') || 'No visible passes in the next 7 days'}</p>
              <p className="text-[#475569] text-xs max-w-xs mx-auto leading-relaxed">
                {t('iss.noPassesDesc') || "The ISS orbit doesn't always align with your location at night. Try checking again in a few days, or update your location in Settings."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {passes.map((pass, i) => (
                <div key={pass.timestamp} className={`flex items-center justify-between p-5 rounded-xl border transition-all ${
                  i === 0 ? 'border-[#f97316]/40 bg-[#f97316]/5' : 'border-white/10 bg-white/5'
                }`}>
                  <div className="flex items-center gap-4">
                    {i === 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#f97316]/20 text-[#f97316]">{t('iss.nextPassTitle')}</span>
                    )}
                    <div>
                      <div className="text-white font-semibold">{pass.date}</div>
                      <div className="text-[#94a3b8] text-sm flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3" />
                        {pass.time}
                        <span>·</span>
                        <span>{Math.floor(pass.duration / 60)}m {pass.duration % 60}s</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: getElevationColor(pass.maxElevation) }}>
                      {pass.maxElevation}°
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-1 justify-end" style={{ color: getElevationColor(pass.maxElevation) }}>
                      <Eye className="w-3 h-3" />
                      {getElevationLabel(pass.maxElevation)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-4 text-xs text-[#64748b]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981] inline-block" />{t('iss.excellent')}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fbbf24] inline-block" />{t('iss.good')}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316] inline-block" />{t('iss.low')}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ISS;

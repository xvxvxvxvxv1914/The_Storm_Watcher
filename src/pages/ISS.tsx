import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import PageMeta from '../components/PageMeta';
import { MapPin, Clock, Eye, Satellite } from 'lucide-react';
import ISSGlobe from '../components/ISSGlobe';
import { getIssPosition, getIssPasses, IssPosition, IssPass } from '../services/issApi';
import { getAuroraModel, AuroraOvationPoint } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';

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

  // Live ISS position — refresh every 5s
  useEffect(() => {
    const fetchPos = async () => {
      try {
        const pos = await getIssPosition();
        setPosition(pos);
        setLoadingPos(false);
      } catch {
        setLoadingPos(false);
      }
    };
    fetchPos();
    const interval = setInterval(() => { if (document.visibilityState !== 'hidden') fetchPos(); }, 5000);
    return () => clearInterval(interval);
  }, []);

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
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        ).then(r => r.json());
        const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
        const country = geo.address?.country || '';
        if (mounted) setLocationName([city, country].filter(Boolean).join(', '));
      } catch {
        // silent
      }
    };

    if (settings.preferredLat !== null && settings.preferredLon !== null) {
      load(settings.preferredLat, settings.preferredLon);
      if (settings.preferredLocationName) setLocationName(settings.preferredLocationName);
    } else {
      navigator.geolocation?.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => { load(42.7, 23.3); if (mounted) setLocationName('Sofia, Bulgaria (default)'); },
      );
    }

    return () => { mounted = false; };
  }, [settings.preferredLat, settings.preferredLon, settings.preferredLocationName]);

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
      <PageMeta
        title="ISS Tracker — The Storm Watcher"
        description="Track the International Space Station in real time. See live position, altitude, speed and next pass times over your location."
        path="/iss"
      />
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
            <div className="w-3 h-3 rounded-full bg-[#10b981] animate-pulse" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">{t('iss.livePosition')}</h2>
            <span className="text-[#64748b] text-xs">{t('iss.updates5s')}</span>
          </div>

          <div ref={globeContainerRef} style={{ minHeight: Math.max(280, Math.round(globeWidth * 0.74)) }} className="w-full flex flex-col items-center justify-center relative">
            {loadingPos ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
              </div>
            ) : (
              <>
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
                The ISS orbit doesn't always align with your location at night. Try checking again in a few days, or update your location in Settings.
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

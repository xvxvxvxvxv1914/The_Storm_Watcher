/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, Eye, Satellite } from 'lucide-react';
import Globe from 'react-globe.gl';
import { getIssPosition, getIssPasses, IssPosition, IssPass } from '../services/issApi';

const ISS = () => {
  const globeRef = useRef<unknown>(null);
  const [position, setPosition] = useState<IssPosition | null>(null);
  const [passes, setPasses] = useState<IssPass[]>([]);
  const [loadingPos, setLoadingPos] = useState(true);
  const [loadingPasses, setLoadingPasses] = useState(true);
  const [locationName, setLocationName] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

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
    const interval = setInterval(fetchPos, 5000);
    return () => clearInterval(interval);
  }, [position]);

  // Point globe at ISS when position updates
  useEffect(() => {
    if (globeRef.current && position) {
      globeRef.current.pointOfView({ lat: position.latitude, lng: position.longitude, altitude: 2 }, 1000);
    }
  }, [position?.latitude, position?.longitude]);

  // Pass predictions
  useEffect(() => {
    const load = async (lat: number, lon: number) => {
      setUserCoords({ lat, lon });
      try {
        const p = await getIssPasses(lat, lon);
        setPasses(p);
      } catch {
        // silent
      } finally {
        setLoadingPasses(false);
      }
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      ).then(r => r.json());
      const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
      const country = geo.address?.country || '';
      setLocationName([city, country].filter(Boolean).join(', '));
    };

    navigator.geolocation?.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => { load(42.7, 23.3); setLocationName('Sofia, Bulgaria (default)'); },
    );
  }, [position]);

  const getElevationColor = (el: number) => {
    if (el >= 60) return '#10b981';
    if (el >= 30) return '#fbbf24';
    return '#f97316';
  };

  const getElevationLabel = (el: number) => {
    if (el >= 60) return 'Excellent';
    if (el >= 30) return 'Good';
    return 'Low';
  };

  // Points for globe
  const points = [
    ...(position ? [{
      lat: position.latitude,
      lng: position.longitude,
      size: 0.8,
      color: '#f97316',
      label: '🛸 ISS',
    }] : []),
    ...(userCoords ? [{
      lat: userCoords.lat,
      lng: userCoords.lon,
      size: 0.5,
      color: '#10b981',
      label: '📍 You',
    }] : []),
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 uppercase tracking-tight">
            <span className="gradient-solar">ISS</span> Tracker
          </h1>
          <p className="text-[#94a3b8] text-sm">International Space Station — live position & pass predictions</p>
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
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">Live Position</h2>
            <span className="text-[#64748b] text-xs">updates every 5s</span>
          </div>

          {loadingPos ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <Globe
                ref={globeRef}
                width={780}
                height={580}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                atmosphereColor="#f97316"
                atmosphereAltitude={0.15}
                pointsData={points}
                pointLat="lat"
                pointLng="lng"
                pointColor="color"
                pointRadius="size"
                pointAltitude={0.02}
                pointLabel="label"
                enablePointerInteraction={true}
              />

              {/* Stats */}
              {position && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full px-8 pb-8">
                  <div className="text-center">
                    <div className="text-[#64748b] text-xs uppercase tracking-wider mb-1">Latitude</div>
                    <div className="text-xl font-bold text-white">{position.latitude.toFixed(2)}°</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#64748b] text-xs uppercase tracking-wider mb-1">Longitude</div>
                    <div className="text-xl font-bold text-white">{position.longitude.toFixed(2)}°</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#64748b] text-xs uppercase tracking-wider mb-1">Altitude</div>
                    <div className="text-xl font-bold text-white">{position.altitude.toFixed(0)} km</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#64748b] text-xs uppercase tracking-wider mb-1">Speed</div>
                    <div className="text-xl font-bold text-white">{(position.velocity / 3600).toFixed(2)} km/s</div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-6 pb-5 text-xs text-[#64748b]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f97316] inline-block" /> ISS</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#10b981] inline-block" /> Your location</span>
          </div>
        </div>

        {/* Pass predictions */}
        <div className="glass-surface rounded-2xl p-8 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-3">
            <Satellite className="w-5 h-5 text-[#f97316]" />
            Upcoming Passes
          </h2>
          <p className="text-[#64748b] text-sm mb-6">Next 7 days · minimum elevation 10°</p>

          {loadingPasses ? (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
            </div>
          ) : passes.length === 0 ? (
            <div className="text-center py-8 text-[#94a3b8]">No visible passes in the next 7 days.</div>
          ) : (
            <div className="space-y-4">
              {passes.map((pass, i) => (
                <div key={pass.timestamp} className={`flex items-center justify-between p-5 rounded-xl border transition-all ${
                  i === 0 ? 'border-[#f97316]/40 bg-[#f97316]/5' : 'border-white/10 bg-white/5'
                }`}>
                  <div className="flex items-center gap-4">
                    {i === 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#f97316]/20 text-[#f97316]">Next</span>
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
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981] inline-block" /> Excellent (60°+)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fbbf24] inline-block" /> Good (30°+)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316] inline-block" /> Low (10°+)</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ISS;

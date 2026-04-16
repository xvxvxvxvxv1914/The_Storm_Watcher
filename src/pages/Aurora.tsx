import { useEffect, useMemo, useState, useRef } from 'react';
import { MapPin, Eye, Sparkles } from 'lucide-react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { getKpIndex, getKpGradientStyle, getAuroraModel, AuroraOvationPoint } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Aurora = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number>(0);
    const [auroraData, setAuroraData] = useState<AuroraOvationPoint[]>([]);
  const [isGlobeLoading, setIsGlobeLoading] = useState(true);
  const globeRef = useRef<unknown>(null);

  useEffect(() => {
    const fetchAuroraModel = async () => {
      setIsGlobeLoading(true);
      const points = await getAuroraModel();
      setAuroraData(points);
      setIsGlobeLoading(false);
    };
    fetchAuroraModel();
    const interval = setInterval(fetchAuroraModel, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  

  useEffect(() => {
    if (!globeRef.current) return;
    
    // Time and date setup
    const now = new Date();
    const D = now.getTime() / 86400000 + 2440587.5 - 2451545.0; // Days since J2000
    
    // Solar position approximation (accurate to ~1 deg)
    const g = (357.529 + 0.98560028 * D) % 360;
    const q = (280.459 + 0.98564736 * D) % 360;
    const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360;
    const e = 23.439 - 0.00000036 * D;
    
    const ra = Math.atan2(Math.cos(e * Math.PI/180) * Math.sin(L * Math.PI/180), Math.cos(L * Math.PI/180)) * 180 / Math.PI;
    const decl = Math.asin(Math.sin(e * Math.PI/180) * Math.sin(L * Math.PI/180)) * 180 / Math.PI;
    const gmst = (18.697374558 + 24.06570982441908 * D) % 24;
    
    let lng = ra - (gmst * 15);
    lng = (lng + 540) % 360 - 180;
    
    // Convert to globe coordinate space (Y up, X right, Z front)
    const latRad = decl * Math.PI / 180;
    const lngRad = lng * Math.PI / 180;
    
    setTimeout(() => {
      try {
        if (!globeRef.current) return;
        const scene = typeof globeRef.current.scene === 'function' ? globeRef.current.scene() : null;
        if (!scene) return;
        
        // Remove existing standard lights
          const lightsToRemove = scene.children.filter((c: THREE.Light | THREE.Object3D) => typeof c.type === 'string' && c.type.includes('Light'));
          const camera = typeof globeRef.current.camera === 'function' ? globeRef.current.camera() : null;
          if (camera) {
             camera.children.filter((c: THREE.Light | THREE.Object3D) => typeof c.type === 'string' && c.type.includes('Light'))
               .forEach((l: THREE.Light | THREE.Object3D) => camera.remove(l));
        }
        lightsToRemove.forEach((l: THREE.Light | THREE.Object3D) => scene.remove(l));
        
        // Add minimal ambient light so the night side isn't 100% pitch black
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.015);
        scene.add(ambientLight);
        
        // Add the Sun
        const sunLight = new THREE.DirectionalLight(0xffffff, 4.0); // Bright, high-contrast sunlight
        sunLight.position.set(
          Math.cos(latRad) * Math.sin(lngRad) * 1000,
          Math.sin(latRad) * 1000,
          Math.cos(latRad) * Math.cos(lngRad) * 1000
        );
        scene.add(sunLight);
      } catch (err) {
        console.error("Failed to inject realistic lighting", err);
      }
    }, 1000); 
  }, [auroraData]);

  useEffect(() => {
    // Initial zoom for globe
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 90, lng: 0, altitude: 2 }, 1000);
    }
  }, [auroraData]);

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const data = await getKpIndex();
        if (data && data.length > 0) {
          const latest = data[data.length - 1];
          setKpValue(latest.kp_index || latest.estimated_kp || 0);
        } else {
          setKpValue(0);
        }
      } catch (error) {
        console.error('Error fetching Kp index:', error);
        setKpValue(0);
      }
    };

    fetchKp();
    const interval = setInterval(fetchKp, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setImageKey(Date.now());
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const getVisibilityInfo = (kp: number) => {
    if (kp >= 7) return { latitude: 50, color: 'text-[#ef4444]', intensityKey: 'aurora.intensityVeryHigh', bgGlow: 'glow-red' };
    if (kp >= 6) return { latitude: 55, color: 'text-[#f97316]', intensityKey: 'aurora.intensityHigh', bgGlow: 'glow-orange' };
    if (kp >= 5) return { latitude: 60, color: 'text-[#fbbf24]', intensityKey: 'aurora.intensityModerate', bgGlow: 'glow-orange' };
    if (kp >= 4) return { latitude: 65, color: 'text-[#10b981]', intensityKey: 'aurora.intensityLow', bgGlow: 'glow-green' };
    return { latitude: 70, color: 'text-[#94a3b8]', intensityKey: 'aurora.intensityVeryLow', bgGlow: '' };
  };

  const visibility = getVisibilityInfo(kpValue);

  const stars = useMemo(() =>
    [...Array(50)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
    })), []);

  return (
    <div className="min-h-screen pt-24 pb-16 relative">
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
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-aurora mb-3 uppercase tracking-tight">
            {t('aurora.title')}
          </h1>
          <p className="text-[#94a3b8] text-lg">
            {t('aurora.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className={`glass-surface rounded-2xl p-8 ${visibility.bgGlow} hover:scale-105 transition-transform`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.kpIndex')}
              </h3>
            </div>
            <div className="text-6xl font-bold mb-3" style={getKpGradientStyle(kpValue)}>{kpValue.toFixed(1)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">Current Value</div>
          </div>

          <div className={`glass-surface rounded-2xl p-8 ${visibility.bgGlow} hover:scale-105 transition-transform`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.intensity')}
              </h3>
            </div>
            <div className={`text-4xl font-bold mb-3 ${visibility.color}`}>{t(visibility.intensityKey)}</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">Aurora Strength</div>
          </div>

          <div className="glass-surface rounded-2xl p-8 hover:glow-purple transition-all hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#94a3b8] text-sm uppercase tracking-wider font-bold">
                {t('aurora.visibleFrom')}
              </h3>
            </div>
            <div className="text-6xl font-bold text-white mb-3">{visibility.latitude}°</div>
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">Latitude North</div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">
            Видимост в Европа
          </h3>
          <div className="space-y-3">
            {[
              { city: 'Рейкявик, Исландия', lat: 64, minKp: 0 },
              { city: 'Хелзинки, Финландия', lat: 60, minKp: 3 },
              { city: 'Стокхолм, Швеция', lat: 59, minKp: 4 },
              { city: 'Копенхаген, Дания', lat: 56, minKp: 5 },
              { city: 'Берлин, Германия', lat: 52, minKp: 6 },
              { city: 'Варшава, Полша', lat: 52, minKp: 6 },
              { city: 'Прага, Чехия', lat: 50, minKp: 7 },
              { city: 'Виена, Австрия', lat: 48, minKp: 7 },
              { city: 'София, България', lat: 42, minKp: 8 },
            ].map(({ city, minKp }) => {
              const visible = kpValue >= minKp;
              const chance = Math.min(100, Math.max(0, ((kpValue - minKp + 1) / 3) * 100));
              return (
                <div key={city} className="flex items-center gap-4">
                  <div className="w-48 text-sm text-[#94a3b8] flex-shrink-0">{city}</div>
                  <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${visible ? Math.max(10, chance) : 2}%`,
                        background: visible
                          ? 'linear-gradient(90deg, #10b981, #fbbf24)'
                          : 'rgba(148,163,184,0.2)',
                      }}
                    />
                  </div>
                  <div className={`text-sm font-bold w-20 text-right flex-shrink-0 ${visible ? 'text-[#10b981]' : 'text-[#475569]'}`}>
                    {visible ? `~${Math.round(chance)}%` : 'Не се вижда'}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[#475569] text-xs mt-4">* Приблизителна вероятност при текущото Kp = {kpValue.toFixed(1)} и ясно небе</p>
        </div>

        
        <div className="glass-surface rounded-3xl overflow-hidden border border-white/10 mb-8 flex flex-col items-center w-full">
          <div className="flex items-center justify-between w-full p-4 border-b border-white/5">
            <h3 className="text-xl font-bold text-white uppercase tracking-wide">
              {t('aurora.oval')}
            </h3>
            {isGlobeLoading && <div className="w-5 h-5 border-2 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin" />}
          </div>
          
          <div className="relative w-full flex justify-center bg-[#050510] min-h-[500px] cursor-grab active:cursor-grabbing">
            {isGlobeLoading && auroraData.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin mb-4" />
                <div className="text-[#10b981] font-bold tracking-widest text-sm uppercase animate-pulse">Loading Aurora Model</div>
              </div>
            ) : (
              <Globe
                ref={globeRef}
                width={800}
                height={500}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                hexBinPointsData={auroraData}
                hexBinPointWeight="intensity"
                hexBinResolution={4}
                hexMargin={0.2}
                hexBinPointColor={(d: { sumWeight: number; points: AuroraOvationPoint[] }) => {
                  const avg = d.sumWeight / d.points.length;
                  const o = Math.max(0.15, Math.min(0.95, avg / 60));
                  // Aurora colors: bright green base, cyan middle, purple/pink top
                  if (avg > 75) return "rgba(244, 63, 94, " + o + ")";   // Pinkish-red (Extreme)
                  if (avg > 50) return "rgba(168, 85, 247, " + o + ")";  // Purple (High)
                  if (avg > 25) return "rgba(45, 212, 191, " + o + ")";  // Cyan (Moderate)
                  return "rgba(34, 197, 94, " + o + ")";                 // Bright Green (Low/Base)
                }}
                hexAltitude={(d: { sumWeight: number; points: AuroraOvationPoint[] }) => Math.max(0.01, (d.sumWeight / d.points.length) / 100)}
                hexTransitionDuration={1000}
              />
            )}
          </div>
          
          <div className="w-full px-8 py-6 border-t border-white/5 bg-black/20">
            <p className="text-[#94a3b8] text-sm leading-relaxed">
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

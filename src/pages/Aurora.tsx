import { useEffect, useMemo, useState, useRef } from 'react';
import { MapPin, Eye, Sparkles } from 'lucide-react';
import GlobeOrig from 'react-globe.gl';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Globe = GlobeOrig as any;
import * as THREE from 'three';
import { getKpIndex, getKpGradientStyle, getAuroraModel, AuroraOvationPoint } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Aurora = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number>(0);
  const [auroraData, setAuroraData] = useState<AuroraOvationPoint[]>([]);
  const [isGlobeLoading, setIsGlobeLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);

  const auroraTexture = useMemo(() => {
    if (auroraData.length === 0) return null;
    const W = 2048, H = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.globalCompositeOperation = 'lighter';
    auroraData.forEach(point => {
      if (point.intensity < 2) return;
      const x = ((point.lng + 180) / 360) * W;
      const y = ((90 - point.lat) / 180) * H;
      const intensity = point.intensity;
      const radius = 18 + intensity / 2.5;
      const alpha = Math.min(0.65, intensity / 55);
      let r = 57, g = 255, b = 20;
      if (intensity > 75) { r = 220; g = 20; b = 20; }
      else if (intensity > 50) { r = 255; g = 100; b = 0; }
      else if (intensity > 25) { r = 80; g = 255; b = 40; }
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},${alpha * 0.35})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    return new THREE.CanvasTexture(canvas);
  }, [auroraData]);

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

    const now = new Date();
    const D = now.getTime() / 86400000 + 2440587.5 - 2451545.0;

    const g = (357.529 + 0.98560028 * D) % 360;
    const q = (280.459 + 0.98564736 * D) % 360;
    const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360;
    const e = 23.439 - 0.00000036 * D;

    const ra = Math.atan2(Math.cos(e * Math.PI/180) * Math.sin(L * Math.PI/180), Math.cos(L * Math.PI/180)) * 180 / Math.PI;
    const decl = Math.asin(Math.sin(e * Math.PI/180) * Math.sin(L * Math.PI/180)) * 180 / Math.PI;
    const gmst = (18.697374558 + 24.06570982441908 * D) % 24;

    let lng = ra - (gmst * 15);
    lng = (lng + 540) % 360 - 180;

    const latRad = decl * Math.PI / 180;
    const lngRad = lng * Math.PI / 180;

    setTimeout(() => {
      try {
        if (!globeRef.current) return;
        const scene = typeof globeRef.current.scene === 'function' ? globeRef.current.scene() : null;
        if (!scene) return;

        const lightsToRemove = scene.children.filter((c: THREE.Light | THREE.Object3D) => typeof c.type === 'string' && c.type.includes('Light'));
        const camera = typeof globeRef.current.camera === 'function' ? globeRef.current.camera() : null;
        if (camera) {
          camera.children.filter((c: THREE.Light | THREE.Object3D) => typeof c.type === 'string' && c.type.includes('Light'))
            .forEach((l: THREE.Light | THREE.Object3D) => camera.remove(l));
        }
        lightsToRemove.forEach((l: THREE.Light | THREE.Object3D) => scene.remove(l));

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.03);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 4.0);
        sunLight.position.set(
          Math.cos(latRad) * Math.sin(lngRad) * 1000,
          Math.sin(latRad) * 1000,
          Math.cos(latRad) * Math.cos(lngRad) * 1000
        );
        scene.add(sunLight);

        // City lights layer (added once)
        const existingCityLights = scene.children.find((c: THREE.Object3D) => c.userData?.isCityLights);
        if (!existingCityLights) {
          new THREE.TextureLoader().load('//unpkg.com/three-globe/example/img/earth-night.jpg', (texture) => {
            const geo = new THREE.SphereGeometry(100.3, 64, 32);
            const mat = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 0.45,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.y = -Math.PI / 2;
            mesh.renderOrder = 1;
            mesh.userData = { isCityLights: true };
            scene.add(mesh);
          });
        }

        // Aurora overlay — multiple layers at different altitudes (curtain effect)
        scene.children
          .filter((c: THREE.Object3D) => c.userData?.isAurora)
          .forEach((c: THREE.Object3D) => scene.remove(c));

        if (auroraTexture) {
          const layers = [
            { radius: 102.0, opacity: 0.6 },
            { radius: 104.0, opacity: 0.35 },
            { radius: 106.5, opacity: 0.15 },
          ];
          layers.forEach(({ radius, opacity }) => {
            const geo = new THREE.SphereGeometry(radius, 128, 64);
            const mat = new THREE.MeshBasicMaterial({
              map: auroraTexture,
              transparent: true,
              opacity,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.FrontSide,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.y = -Math.PI / 2;
            mesh.userData = { isAurora: true };
            scene.add(mesh);
          });
        }
      } catch (err) {
        console.error("Failed to inject realistic lighting", err);
      }
    }, 1000);
  }, [auroraData, auroraTexture]);

  useEffect(() => {
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
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('aurora.currentValue')}</div>
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
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('aurora.strength')}</div>
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
            <div className="text-[#94a3b8] text-sm uppercase tracking-wider">{t('aurora.latNorth')}</div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">
            {t('aurora.visibilityEurope')}
          </h3>
          <div className="space-y-3">
            {[
              { city: t('aurora.city.reykjavik'), lat: 64, minKp: 0 },
              { city: t('aurora.city.helsinki'), lat: 60, minKp: 3 },
              { city: t('aurora.city.stockholm'), lat: 59, minKp: 4 },
              { city: t('aurora.city.copenhagen'), lat: 56, minKp: 5 },
              { city: t('aurora.city.berlin'), lat: 52, minKp: 6 },
              { city: t('aurora.city.warsaw'), lat: 52, minKp: 6 },
              { city: t('aurora.city.prague'), lat: 50, minKp: 7 },
              { city: t('aurora.city.vienna'), lat: 48, minKp: 7 },
              { city: t('aurora.city.sofia'), lat: 42, minKp: 8 },
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
                  <div className={`text-sm font-bold w-24 text-right flex-shrink-0 ${visible ? 'text-[#10b981]' : 'text-[#475569]'}`}>
                    {visible ? `~${Math.round(chance)}%` : t('aurora.notVisible')}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[#475569] text-xs mt-4">* {t('aurora.approxChance')} {kpValue.toFixed(1)}</p>
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
                <div className="text-[#10b981] font-bold tracking-widest text-sm uppercase animate-pulse">{t('aurora.loadingModel')}</div>
              </div>
            ) : (
              <Globe
                ref={globeRef}
                width={800}
                height={500}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                atmosphereColor="rgba(0,180,60,0.15)"
                atmosphereAltitude={0.15}
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

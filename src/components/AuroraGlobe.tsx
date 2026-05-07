import { useEffect, useMemo, useRef } from 'react';
import GlobeOrig from 'react-globe.gl';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Globe = GlobeOrig as any;
import * as THREE from 'three';
import { type AuroraOvationPoint } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import ErrorBoundary from './ErrorBoundary';
import { Sparkles } from 'lucide-react';
import { logError } from '../utils/logger';

interface Props {
  globeWidth: number;
  isGlobeLoading: boolean;
  auroraData: AuroraOvationPoint[];
  theme?: string;
}

export default function AuroraGlobe({ globeWidth, isGlobeLoading, auroraData, theme }: Props) {
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const lightsInitializedRef = useRef(false);
  const prevAuroraTextureRef = useRef<THREE.CanvasTexture | null>(null);

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

  // One-time lighting setup — runs once after globe is mounted
  useEffect(() => {
    const setupLights = () => {
      if (lightsInitializedRef.current || !globeRef.current) return false;
      const scene = typeof globeRef.current.scene === 'function' ? globeRef.current.scene() : null;
      if (!scene) return false;

      const now = new Date();
      const D = now.getTime() / 86400000 + 2440587.5 - 2451545.0;
      const g = (357.529 + 0.98560028 * D) % 360;
      const q = (280.459 + 0.98564736 * D) % 360;
      const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360;
      const e = 23.439 - 0.00000036 * D;
      const ra = Math.atan2(Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180), Math.cos(L * Math.PI / 180)) * 180 / Math.PI;
      const decl = Math.asin(Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180)) * 180 / Math.PI;
      const gmst = (18.697374558 + 24.06570982441908 * D) % 24;
      let lng = ra - (gmst * 15);
      lng = (lng + 540) % 360 - 180;
      const latRad = decl * Math.PI / 180;
      const lngRad = lng * Math.PI / 180;

      scene.children
        .filter((c: THREE.Object3D) => c.type.includes('Light'))
        .forEach((l: THREE.Object3D) => scene.remove(l));
      scene.add(new THREE.AmbientLight(0xffffff, 1.8));
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      sunLight.position.set(
        Math.cos(latRad) * Math.sin(lngRad) * 1000,
        Math.sin(latRad) * 1000,
        Math.cos(latRad) * Math.cos(lngRad) * 1000
      );
      scene.add(sunLight);
      const fillLight = new THREE.DirectionalLight(0x8888ff, 0.8);
      fillLight.position.set(-1000, 500, -500);
      scene.add(fillLight);

      lightsInitializedRef.current = true;
      return true;
    };

    if (!setupLights()) {
      const timer = setInterval(() => { if (setupLights()) clearInterval(timer); }, 200);
      return () => clearInterval(timer);
    }
  }, []);

  // Aurora overlay — updates only when texture changes, disposes previous resources
  useEffect(() => {
    if (!auroraTexture) return;

    if (prevAuroraTextureRef.current && prevAuroraTextureRef.current !== auroraTexture) {
      prevAuroraTextureRef.current.dispose();
    }
    prevAuroraTextureRef.current = auroraTexture;

    const timer = setTimeout(() => {
      try {
        if (!globeRef.current) return;
        const scene = typeof globeRef.current.scene === 'function' ? globeRef.current.scene() : null;
        if (!scene) return;

        if (!scene.children.find((c: THREE.Object3D) => c.userData?.isCityLights)) {
          new THREE.TextureLoader().load('/textures/earth-night.jpg', (texture) => {
            const geo = new THREE.SphereGeometry(100.3, 64, 32);
            const mat = new THREE.MeshBasicMaterial({
              map: texture, transparent: true, opacity: 0.45,
              blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.y = -Math.PI / 2;
            mesh.renderOrder = 2;
            mesh.userData = { isCityLights: true };
            scene.add(mesh);
          });
        }

        scene.children
          .filter((c: THREE.Object3D) => c.userData?.isAurora)
          .forEach((c: THREE.Object3D) => {
            const m = c as THREE.Mesh;
            m.geometry.dispose();
            (m.material as THREE.Material).dispose();
            scene.remove(c);
          });

        const layers = [
          { radius: 102.0, opacity: 0.6 },
          { radius: 104.0, opacity: 0.35 },
          { radius: 106.5, opacity: 0.15 },
        ];
        layers.forEach(({ radius, opacity }) => {
          const geo = new THREE.SphereGeometry(radius, 128, 64);
          const mat = new THREE.MeshBasicMaterial({
            map: auroraTexture, transparent: true, opacity,
            blending: THREE.AdditiveBlending, side: THREE.FrontSide,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.rotation.y = -Math.PI / 2;
          mesh.userData = { isAurora: true };
          scene.add(mesh);
        });
      } catch (err) {
        logError('Aurora overlay update failed', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [auroraTexture]);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 90, lng: 0, altitude: 2 }, 1000);
    }
  }, [auroraData]);

  return (
    <>
      {isGlobeLoading && auroraData.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin mb-4" />
          <div className="text-[#10b981] font-bold tracking-widest text-sm uppercase animate-pulse">{t('aurora.loadingModel')}</div>
        </div>
      ) : (
        <ErrorBoundary fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Sparkles className="w-10 h-10 text-[#10b981]/50" />
            <p className="text-[#94a3b8] text-sm">{t('aurora.globeUnavailable')}<br />{t('aurora.globeAuroraLoading')}</p>
          </div>
        }>
          <Globe
            ref={globeRef}
            width={globeWidth}
            height={Math.max(320, Math.round(globeWidth * 0.75))}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="/textures/earth-blue-marble.jpg"
            atmosphereColor={theme === 'light' ? 'rgba(100,160,255,0.4)' : 'rgba(0,180,60,0.15)'}
            atmosphereAltitude={0.15}
          />
        </ErrorBoundary>
      )}
    </>
  );
}

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import GlobeOrig from 'react-globe.gl';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Globe = GlobeOrig as any;
import * as THREE from 'three';
import * as solar from 'solar-calculator';
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
  userLat?: number | null;
  userLng?: number | null;
}

const DAY_NIGHT_SHADER = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #define PI 3.141592653589793
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec2 sunPosition;
    uniform vec2 globeRotation;
    varying vec3 vNormal;
    varying vec2 vUv;

    float toRad(in float a) { return a * PI / 180.0; }

    vec3 Polar2Cartesian(in vec2 c) {
      float theta = toRad(90.0 - c.x);
      float phi = toRad(90.0 - c.y);
      return vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
    }

    void main() {
      float invLon = toRad(globeRotation.x);
      float invLat = -toRad(globeRotation.y);
      mat3 rotX = mat3(1,0,0, 0,cos(invLat),-sin(invLat), 0,sin(invLat),cos(invLat));
      mat3 rotY = mat3(cos(invLon),0,sin(invLon), 0,1,0, -sin(invLon),0,cos(invLon));
      vec3 rotatedSunDir = rotX * rotY * Polar2Cartesian(sunPosition);
      float intensity = dot(normalize(vNormal), normalize(rotatedSunDir));
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv);
      float blendFactor = smoothstep(-0.1, 0.1, intensity);
      gl_FragColor = mix(nightColor, dayColor, blendFactor);
    }
  `
};

function sunPosAt(dt: number): [number, number] {
  const day = new Date(+dt).setUTCHours(0, 0, 0, 0);
  const t = solar.century(new Date(dt));
  const longitude = (day - dt) / 864e5 * 360 - 180;
  return [longitude - solar.equationOfTime(t) / 4, solar.declination(t)];
}

export default function AuroraGlobe({ globeWidth, isGlobeLoading, auroraData, theme, userLat, userLng }: Props) {
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const prevAuroraTextureRef = useRef<THREE.CanvasTexture | null>(null);

  const [globeMaterial, setGlobeMaterial] = useState<THREE.ShaderMaterial | null>(null);

  // Load day/night textures and build shader material
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    Promise.all([
      loader.loadAsync('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg'),
      loader.loadAsync('/textures/earth-night.jpg'),
    ]).then(([dayTexture, nightTexture]) => {
      setGlobeMaterial(new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: dayTexture },
          nightTexture: { value: nightTexture },
          sunPosition: { value: new THREE.Vector2() },
          globeRotation: { value: new THREE.Vector2() },
        },
        vertexShader: DAY_NIGHT_SHADER.vertexShader,
        fragmentShader: DAY_NIGHT_SHADER.fragmentShader,
      }));
    }).catch(err => logError('Globe texture load failed', err));
  }, []);

  // Update sun position every minute
  useEffect(() => {
    if (!globeMaterial) return;
    const update = () => {
      const [lng, lat] = sunPosAt(Date.now());
      globeMaterial.uniforms.sunPosition.value.set(lng, lat);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [globeMaterial]);

  const handleZoom = useCallback(({ lng, lat }: { lng: number; lat: number }) => {
    globeMaterial?.uniforms.globeRotation.value.set(lng, lat);
  }, [globeMaterial]);

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

  // Aurora overlay
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
    if (!globeRef.current) return;
    if (userLat !== null && userLat !== undefined && userLng !== null && userLng !== undefined) {
      globeRef.current.pointOfView({ lat: userLat, lng: userLng, altitude: 2 }, 1000);
    } else {
      globeRef.current.pointOfView({ lat: 70, lng: 0, altitude: 2 }, 1000);
    }
  }, [auroraData, userLat, userLng]);

  const bgColor = theme === 'light' ? 'rgba(200,204,216,1)' : 'rgba(0,0,0,0)';

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
            backgroundColor={bgColor}
            globeMaterial={globeMaterial || undefined}
            globeImageUrl={globeMaterial ? undefined : '/textures/earth-blue-marble.jpg'}
            atmosphereColor={theme === 'light' ? 'rgba(100,160,255,0.4)' : 'rgba(0,180,60,0.15)'}
            atmosphereAltitude={0.15}
            onZoom={handleZoom}
            htmlElementsData={userLat != null && userLng != null ? [{ lat: userLat, lng: userLng }] : []}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude={0.05}
            htmlElement={() => {
              const wrapper = document.createElement('div');
              wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;transform:translateY(-100%);pointer-events:none;';
              const pin = document.createElement('div');
              pin.style.cssText = 'width:18px;height:18px;background:#10b981;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 0 14px rgba(16,185,129,0.9),0 0 4px rgba(0,0,0,0.4);';
              const stem = document.createElement('div');
              stem.style.cssText = 'width:2.5px;height:10px;background:white;border-radius:2px;box-shadow:0 0 4px rgba(0,0,0,0.4);margin-top:1px;';
              wrapper.appendChild(pin);
              wrapper.appendChild(stem);
              return wrapper;
            }}
          />
        </ErrorBoundary>
      )}
    </>
  );
}

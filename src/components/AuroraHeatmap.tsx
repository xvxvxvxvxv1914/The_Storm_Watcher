import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { calcAuroraVisibility } from '../utils/auroraVisibility';

const CANVAS_W = 720;
const CANVAS_H = 360;

function kpToColor(vis: number): [number, number, number, number] {
  if (vis <= 0) return [0, 0, 0, 0];
  const alpha = Math.min(200, Math.round(40 + vis * 1.6));
  if (vis < 25) return [16, 185, 129, alpha];   // emerald
  if (vis < 55) return [100, 220, 80, alpha];    // yellow-green
  if (vis < 80) return [220, 255, 50, alpha];    // bright yellow
  return [255, 255, 200, alpha];                 // near-white
}

function buildImageUrl(kp: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(CANVAS_W, CANVAS_H);
  const d = img.data;

  for (let y = 0; y < CANVAS_H; y++) {
    const lat = 90 - (y / CANVAS_H) * 180;
    for (let x = 0; x < CANVAS_W; x++) {
      const lon = (x / CANVAS_W) * 360 - 180;
      const vis = calcAuroraVisibility(lat, lon, kp);
      const [r, g, b, a] = kpToColor(vis);
      const i = (y * CANVAS_W + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

function HeatOverlay({ kp }: { kp: number }) {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  useEffect(() => {
    const url = buildImageUrl(kp);
    const bounds: L.LatLngBoundsExpression = [[-90, -180], [90, 180]];

    if (overlayRef.current) {
      overlayRef.current.setUrl(url);
    } else {
      overlayRef.current = L.imageOverlay(url, bounds, { opacity: 0.75, interactive: false });
      overlayRef.current.addTo(map);
    }

    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map, kp]);

  return null;
}

interface Props {
  kp: number;
}

export default function AuroraHeatmap({ kp }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 380 }}>
      <MapContainer
        center={[55, 10]}
        zoom={2}
        minZoom={1}
        maxZoom={6}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
        worldCopyJump={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        <HeatOverlay kp={kp} />
      </MapContainer>
    </div>
  );
}

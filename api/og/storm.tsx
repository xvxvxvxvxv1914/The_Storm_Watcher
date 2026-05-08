import { ImageResponse } from '@vercel/og';
import type { VercelRequest } from '@vercel/node';

export const config = { runtime: 'edge' };

const LEVEL_COLORS: Record<string, string> = {
  '1': '#10b981',
  '2': '#eab308',
  '3': '#f97316',
  '4': '#ef4444',
  '5': '#dc2626',
};

const LEVEL_LABELS: Record<string, string> = {
  '1': 'G1 — Minor Storm',
  '2': 'G2 — Moderate Storm',
  '3': 'G3 — Strong Storm',
  '4': 'G4 — Severe Storm',
  '5': 'G5 — Extreme Storm',
};

export default function handler(req: VercelRequest) {
  const url = new URL(req.url!, `https://${req.headers.host}`);
  const kp = url.searchParams.get('kp') ?? '7.0';
  const level = url.searchParams.get('level') ?? '3';
  const color = LEVEL_COLORS[level] ?? '#f97316';
  const label = LEVEL_LABELS[level] ?? 'Geomagnetic Storm';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #000008 0%, #0a0015 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: 'absolute',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
          }}
        />

        {/* App name */}
        <div
          style={{
            fontSize: '18px',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            color: '#94a3b8',
            marginBottom: '24px',
            display: 'flex',
          }}
        >
          THE STORM WATCHER
        </div>

        {/* Kp number */}
        <div
          style={{
            fontSize: '160px',
            fontWeight: 'bold',
            color,
            lineHeight: 1,
            marginBottom: '16px',
            display: 'flex',
          }}
        >
          {parseFloat(kp).toFixed(1)}
        </div>

        {/* Kp label */}
        <div
          style={{
            fontSize: '16px',
            color: '#64748b',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            marginBottom: '28px',
            display: 'flex',
          }}
        >
          KP INDEX
        </div>

        {/* Storm badge */}
        <div
          style={{
            background: `${color}22`,
            border: `2px solid ${color}`,
            borderRadius: '100px',
            padding: '12px 36px',
            color,
            fontSize: '22px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            marginBottom: '40px',
            display: 'flex',
          }}
        >
          {label.toUpperCase()}
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: '16px',
            color: '#475569',
            letterSpacing: '2px',
            display: 'flex',
          }}
        >
          thestormwatcher.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

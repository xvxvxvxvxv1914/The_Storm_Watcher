import { ImageResponse } from '@vercel/og';
import type { VercelRequest } from '@vercel/node';

export const config = { runtime: 'edge' };

const LEVEL_COLORS: Record<string, string> = {
  '0': '#10b981',
  '1': '#10b981',
  '2': '#eab308',
  '3': '#f97316',
  '4': '#ef4444',
  '5': '#dc2626',
};

const LEVEL_LABELS: Record<string, string> = {
  '0': 'QUIET',
  '1': 'G1 MINOR',
  '2': 'G2 MODERATE',
  '3': 'G3 STRONG',
  '4': 'G4 SEVERE',
  '5': 'G5 EXTREME',
};

const STARS = [
  [80, 60], [200, 120], [350, 40], [500, 90], [650, 30], [800, 110],
  [950, 55], [1100, 80], [1150, 200], [60, 300], [300, 350], [700, 280],
  [1050, 320], [420, 580], [850, 560], [150, 500], [600, 530],
];

export default function handler(req: VercelRequest) {
  const url = new URL(req.url!, `https://${req.headers.host}`);
  const kp    = parseFloat(url.searchParams.get('kp')    ?? '7.0');
  const level = url.searchParams.get('level') ?? '3';
  const color = LEVEL_COLORS[level] ?? '#f97316';
  const badge = LEVEL_LABELS[level] ?? 'STORM';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#00000e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Stars */}
        {STARS.map(([x, y], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              display: 'flex',
            }}
          />
        ))}

        {/* Glow behind number */}
        <div
          style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: '52px',
            fontWeight: 'bold',
            color: '#f97316',
            marginBottom: '12px',
            display: 'flex',
          }}
        >
          The Storm Watcher
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '20px',
            color: '#94a3b8',
            marginBottom: '40px',
            display: 'flex',
          }}
        >
          Real-time geomagnetic storm tracking
        </div>

        {/* Kp + badge row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '48px' }}>
          <div
            style={{
              fontSize: '140px',
              fontWeight: 'bold',
              color,
              lineHeight: 1,
              display: 'flex',
            }}
          >
            {kp.toFixed(1)}
          </div>
          <div
            style={{
              background: `${color}30`,
              border: `2px solid ${color}`,
              borderRadius: '100px',
              padding: '14px 32px',
              color,
              fontSize: '24px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '22px',
              display: 'flex',
            }}
          >
            {badge}
          </div>
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            { label: 'KP INDEX', value: kp.toFixed(1) },
            { label: 'LIVE · NOAA', value: 'Real-time' },
            { label: 'thestormwatcher.com', value: '' },
          ].map((chip, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '12px',
                padding: '12px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '12px', letterSpacing: '2px', display: 'flex' }}>
                {chip.label}
              </div>
              {chip.value ? (
                <div style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', display: 'flex' }}>
                  {chip.value}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

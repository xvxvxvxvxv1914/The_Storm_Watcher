/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from '@vercel/og';
import React from 'react';

const KP_COLOR = (kp: number) =>
  kp >= 7 ? '#ef4444' : kp >= 5 ? '#f97316' : kp >= 3 ? '#eab308' : '#10b981';

const G_LEVEL = (kp: number) =>
  kp >= 9 ? 'G5' : kp >= 8 ? 'G4' : kp >= 7 ? 'G3' : kp >= 6 ? 'G2' : kp >= 5 ? 'G1' : null;

const h = React.createElement;

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url, 'https://www.thestormwatcher.com');
  const page = searchParams.get('page') ?? 'home';
  const kpRaw = parseFloat(searchParams.get('kp') ?? '0');
  const kp = isNaN(kpRaw) ? 0 : Math.min(9, Math.max(0, kpRaw));

  const pages: Record<string, { title: string; subtitle: string; accent: string }> = {
    home:      { title: 'The Storm Watcher',   subtitle: 'Real-time space weather & aurora forecasts',  accent: '#f97316' },
    aurora:    { title: 'Aurora Forecast',     subtitle: 'Live OVATION aurora visibility map',          accent: '#10b981' },
    forecast:  { title: 'Solar Forecast',      subtitle: '3-day Kp outlook · solar wind · X-ray flux',  accent: '#f97316' },
    calendar:  { title: 'Aurora Calendar',     subtitle: '3-night viewing outlook with cloud cover',    accent: '#10b981' },
    pricing:   { title: 'Storm Watcher Pro',   subtitle: 'Unlock aurora maps, alerts & more',           accent: '#7c3aed' },
    mood:      { title: 'Cosmic Mood',         subtitle: 'Track how space weather affects you',         accent: '#ec4899' },
    alerts:    { title: 'Space Weather Alerts',subtitle: 'Real-time CME, solar flare & storm alerts',   accent: '#ef4444' },
    dashboard: { title: 'Live Dashboard',      subtitle: 'Kp index, solar wind, Bz & X-ray flux',      accent: '#f97316' },
    iss:       { title: 'ISS Tracker',         subtitle: 'Live position & pass predictions near you',   accent: '#6366f1' },
    gallery:   { title: 'Aurora Gallery',      subtitle: 'Community aurora photos from around the world',accent: '#06b6d4' },
    hunt:      { title: 'Aurora Hunt',         subtitle: 'Earn badges & points for spotting auroras',   accent: '#f59e0b' },
  };

  const meta = pages[page] ?? pages['home'];
  const color = page === 'aurora' || page === 'calendar' || page === 'forecast' ? KP_COLOR(kp) : meta.accent;
  const gLevel = G_LEVEL(kp);
  const showKp = (page === 'home' || page === 'aurora' || page === 'forecast' || page === 'calendar') && kp > 0;

  return new ImageResponse(
    h('div', {
      style: {
        width: '1200px',
        height: '630px',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0f172a 50%, #0a0a1a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px',
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden',
      },
    },
      h('div', { style: { position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: `radial-gradient(circle, ${color}22 0%, transparent 70%)` } }),
      h('div', { style: { position: 'absolute', bottom: '-80px', left: '200px', width: '400px', height: '400px', borderRadius: '50%', background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` } }),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' } },
        h('div', { style: { width: '56px', height: '56px', borderRadius: '16px', background: `linear-gradient(135deg, ${color} 0%, ${color}88 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' } }, '🌌'),
        h('span', { style: { color: '#64748b', fontSize: '18px', fontWeight: 600, letterSpacing: '0.05em' } }, 'thestormwatcher.com'),
      ),
      h('div', { style: { fontSize: '72px', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.02em' } }, meta.title),
      h('div', { style: { fontSize: '28px', color: '#94a3b8', marginBottom: '40px', maxWidth: '800px' } }, meta.subtitle),
      showKp
        ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', background: `${color}18`, border: `1px solid ${color}44`, borderRadius: '12px', padding: '12px 24px' } },
              h('span', { style: { color: '#94a3b8', fontSize: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' } }, 'Kp index'),
              h('span', { style: { color, fontSize: '36px', fontWeight: 800 } }, kp.toFixed(1)),
              gLevel ? h('span', { style: { background: `${color}33`, color, fontSize: '14px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' } }, gLevel) : null,
            ),
            h('span', { style: { color: '#334155', fontSize: '16px' } }, 'Live · Updated every 3h'),
          )
        : null,
    ),
    { width: 1200, height: 630 },
  );
}

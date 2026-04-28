# The Storm Watcher ☀️🌌

Real-time space weather monitoring — Kp index, solar wind, aurora forecast and geomagnetic storm alerts.

**Live:** [thestormwatcher.com](https://thestormwatcher.com)

---

## Features

- **Live Kp Index** — Real-time geomagnetic activity from NOAA SWPC
- **Storm Score** — A single 0–100 number showing how active the geomagnetic situation is
- **Solar Wind & Bz** — Live RTSW data with interactive charts (lightweight-charts)
- **X-ray Flux** — Solar flare classification (A/B/C/M/X)
- **Aurora Forecast** — Aurora oval visualization on a 3D globe (react-globe.gl)
- **ISS Tracker** — Live ISS position + pass predictions using satellite.js (TLE propagation)
- **UV Index** — Current and hourly UV data via Open-Meteo
- **Sun Times** — Sunrise/sunset + golden hour calculator
- **Sky Visibility** — Cloud cover + precipitation scoring for tonight's viewing conditions
- **Mood Tracker** — Community mood reporting correlated with space weather events
- **Push Notifications** — Browser-based Kp threshold alerts via Web Push API
- **8 Languages** — EN, BG, ES, FR, DE, RU, ZH, JA

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 3 |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Charts | lightweight-charts, custom SVG |
| 3D Globe | react-globe.gl + Three.js |
| Mobile | Capacitor (iOS) |
| PWA | vite-plugin-pwa + Workbox |
| Monitoring | Sentry |
| Analytics | Vercel Analytics + Speed Insights |
| Hosting | Vercel |

## Data Sources

- [NOAA SWPC](https://www.swpc.noaa.gov/) — Kp index, solar wind, magnetic field, X-ray, aurora oval, alerts
- [NASA DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) — CME and solar flare events
- [Open-Meteo](https://open-meteo.com/) — UV index, sun times, cloud cover
- [WhereTheISS.at](https://wheretheiss.at/) — ISS position
- [TLE API](https://tle.ivanstanojevic.me/) — ISS TLE for pass predictions

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# TypeScript check
npm run typecheck

# Lint
npm run lint

# Run tests
npm test

# Production build
npm run build
```

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
VITE_SENTRY_DSN=your_sentry_dsn
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_DONKI_BASE_URL=your_donki_proxy_url  # for Capacitor builds
```

## iOS (Capacitor)

```bash
npm run ios:open     # Build + sync + open Xcode
npm run ios:deploy   # Deploy via script
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   └── charts/      # TimeSeriesChart, SvgBarChart, etc.
├── contexts/        # React contexts (Auth, Theme, Language, Settings)
├── hooks/           # Custom hooks (swipe, favorites, onboarding)
├── lib/             # Supabase client
├── locales/         # i18n translations (8 languages)
├── pages/           # Route pages
├── services/        # API clients (NOAA, ISS, UV, Sky, DONKI)
├── utils/           # Utility functions
└── sw.ts            # Service worker (Workbox)
```

## License

All rights reserved.

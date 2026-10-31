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
- **16 Languages** — EN, BG, DE, ES, FR, JA, KO, RU, ZH + NO, FI, SV, IS, DA, PL, UK
- **Language Settings** — Dedicated settings page with auto-detection from browser locale

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
- [GFZ Potsdam](https://www.gfz-potsdam.de/) — Kp index (primary source, NOAA as fallback)
- [NIGGG Bulgaria](http://niggg.bas.bg/) — Local magnetic field (H/F components)
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

## Free launch access

All features are currently free, including Pro/Premium tools, unlimited saved
locations, the personal aurora log and subscribed storm alerts. Signing in is
still required for personal data and push subscriptions. No new Stripe checkout
sessions can be started during this period; existing subscription management
and webhooks remain available.

The single shared switch is `FREE_ACCESS_ENABLED` in
`supabase/functions/_shared/accessPolicy.ts`. It overrides older
`VITE_PAYMENTS_ENABLED=true` deployment settings. To resume paid access, set the
switch to `false`, enable `VITE_PAYMENTS_ENABLED=true` for the website build,
then publish the website and redeploy `send-kp-alerts` together. The build
regenerates localized pricing metadata for the selected mode. No profile plans
or existing Stripe subscriptions are rewritten by this switch.

## iOS (Capacitor)

```bash
npm run ios:open     # Build + sync + open Xcode
npm run ios:deploy   # Deploy via script
```

## License

All rights reserved.

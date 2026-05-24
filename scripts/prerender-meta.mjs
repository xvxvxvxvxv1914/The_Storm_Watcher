/**
 * Post-build script: generates per-route static HTML files with correct
 * <title>, <meta name="description"> and <link rel="canonical"> injected
 * into the built index.html. Vercel serves these static files before the
 * SPA catch-all rewrite, so Googlebot receives pre-populated meta on first fetch.
 *
 * Run automatically after `vite build` via the build script in package.json.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const BASE_URL = 'https://www.thestormwatcher.com';

const routes = [
  {
    path: '/',
    title: 'The Storm Watcher — Real-Time Space Weather Dashboard',
    description: 'Monitor solar activity and aurora forecasts with our professional-grade live dashboard. Real-time Kp index, solar wind speed and geomagnetic storm alerts.',
  },
  {
    path: '/hunt',
    title: 'Aurora Hunt — The Storm Watcher',
    description: 'Report aurora sightings, earn badges and compete on the leaderboard with other aurora hunters.',
  },
  {
    path: '/about',
    title: 'About — The Storm Watcher',
    description: 'Real-time space weather monitoring and aurora forecast app.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy — The Storm Watcher',
    description: 'Privacy Policy for The Storm Watcher. Learn how we collect, use and protect your data.',
  },
  {
    path: '/terms',
    title: 'Terms of Service — The Storm Watcher',
    description: 'Read the Terms of Service for The Storm Watcher space weather monitoring application.',
  },
  {
    path: '/faq',
    title: 'Aurora FAQ — Northern Lights Guide | The Storm Watcher',
    description: 'Everything you need to know about the Northern Lights, Kp index, solar wind, and how to see the aurora. Expert answers to common space weather questions.',
  },
  {
    path: '/magnetic-effects',
    title: 'Magnetic Storms & Human Health — The Storm Watcher',
    description: 'How geomagnetic activity affects the human body — headaches, sleep, mood — and what you can do about it.',
  },
  {
    path: '/sky',
    title: 'Sky Visibility Tonight — The Storm Watcher',
    description: "Tonight's stargazing and aurora viewing conditions. Cloud cover, visibility and precipitation forecast for astronomers.",
  },
  {
    path: '/sun',
    title: 'Sunrise & Sunset Times — The Storm Watcher',
    description: 'Accurate sunrise, sunset and golden hour times for your location. Plan your photography and outdoor activities.',
  },
  {
    path: '/uv',
    title: 'UV Index — The Storm Watcher',
    description: 'Real-time UV index and sun exposure forecast for your location. Know when to apply sunscreen.',
  },
  {
    path: '/aurora',
    title: 'Aurora Forecast Tonight — Can I See the Northern Lights? | The Storm Watcher',
    description: 'Check live aurora borealis visibility for your location. Real-time OVATION model, Kp index, cloud cover checklist and 3D aurora globe.',
  },
  {
    path: '/dashboard',
    title: 'Space Weather Dashboard — Live Kp Index & Solar Wind | The Storm Watcher',
    description: 'Live space weather data: Kp index, solar wind speed, Bz component, X-ray flux and geomagnetic storm charts updated every minute.',
  },
  {
    path: '/forecast',
    title: '27-Day Geomagnetic Forecast — Space Weather Predictions | The Storm Watcher',
    description: 'Extended 27-day geomagnetic forecast with Kp predictions, Ap index, solar flux F10.7 and upcoming storm probability.',
  },
  {
    path: '/alerts',
    title: 'Solar Storm & CME Alerts — Real-Time Space Weather Events | The Storm Watcher',
    description: 'Live alerts for geomagnetic storms, solar flares, CMEs and radiation belt events. Stay ahead of space weather with real-time NOAA DONKI notifications.',
  },
  {
    path: '/pricing',
    title: 'Pricing — The Storm Watcher Pro & Premium Plans',
    description: 'Choose your Storm Watcher plan. Free aurora monitoring or Pro/Premium with advanced alerts, aurora forecasting and 14-day free trial.',
  },
  {
    path: '/calendar',
    title: 'Aurora Calendar — Best Nights for Northern Lights | The Storm Watcher',
    description: 'See which upcoming nights have the best aurora viewing conditions. 3-night geomagnetic outlook with moon phase and cloud cover data.',
  },
  {
    path: '/gallery',
    title: 'Aurora Photo Gallery — Community Northern Lights Photos | The Storm Watcher',
    description: 'Browse stunning aurora borealis photos shared by the Storm Watcher community from around the world.',
  },
  {
    path: '/iss',
    title: 'ISS Tracker — Live International Space Station Position | The Storm Watcher',
    description: 'Track the International Space Station in real time. Live ISS position, altitude, speed and upcoming passes over your location.',
  },
  {
    path: '/mood',
    title: 'Cosmic Mood Pulse — How Does Space Weather Affect You? | The Storm Watcher',
    description: 'Track how solar storms and geomagnetic activity affect your mood and wellbeing. Join the community and share how you feel today.',
  },
  {
    path: '/livestream',
    title: 'Aurora Livestream — Live Northern Lights Cameras | The Storm Watcher',
    description: 'Watch live aurora cameras from Norway, Iceland and Finland. Real-time northern lights streams updated 24/7.',
  },
];

const baseHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');

for (const route of routes) {
  const canonical = `${BASE_URL}${route.path}`;
  const escapedTitle = route.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedDesc = route.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let html = baseHtml
    // Replace default title
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${escapedTitle}</title>`
    )
    // Replace default description
    .replace(
      /<meta name="description" content="[^"]*"/,
      `<meta name="description" content="${escapedDesc}"`
    )
    // Replace OG title
    .replace(
      /<meta property="og:title" content="[^"]*"/,
      `<meta property="og:title" content="${escapedTitle}"`
    )
    // Replace OG description
    .replace(
      /<meta property="og:description" content="[^"]*"/,
      `<meta property="og:description" content="${escapedDesc}"`
    )
    // Replace OG URL
    .replace(
      /<meta property="og:url" content="[^"]*"/,
      `<meta property="og:url" content="${canonical}"`
    )
    // Replace Twitter title
    .replace(
      /<meta name="twitter:title" content="[^"]*"/,
      `<meta name="twitter:title" content="${escapedTitle}"`
    )
    // Replace Twitter description
    .replace(
      /<meta name="twitter:description" content="[^"]*"/,
      `<meta name="twitter:description" content="${escapedDesc}"`
    )
    // Replace or insert canonical (index.html already has one for /)
    .replace(
      /<link rel="canonical" href="[^"]*"/,
      `<link rel="canonical" href="${canonical}"`
    );

  // If no canonical existed in the template (shouldn't happen after our fix), insert one
  if (!html.includes(`<link rel="canonical"`)) {
    html = html.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n  </head>`);
  }

  if (route.path === '/') {
    writeFileSync(join(distDir, 'index.html'), html, 'utf-8');
    console.log(`✓ /  →  dist/index.html`);
  } else {
    const dir = join(distDir, route.path.slice(1));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html, 'utf-8');
    console.log(`✓ ${route.path}  →  dist${route.path}/index.html`);
  }
}

console.log(`\nPrerender complete — ${routes.length} routes.`);

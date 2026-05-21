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

/**
 * Post-build script: generates per-route static HTML files with translated
 * <title>, <meta>, <link rel="canonical"> and hreflang alternate links.
 *
 * Output:
 *   dist/[route]/index.html          → English (default)
 *   dist/[lang]/[route]/index.html   → 15 translated variants
 *
 * Vercel serves static files before the SPA catch-all rewrite, so crawlers
 * get pre-populated translated meta on first fetch.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { META, ROUTES, LANG_CODES } from './meta-translations.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const BASE_URL = 'https://www.thestormwatcher.com';

const baseHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');
const langs = Object.keys(LANG_CODES);

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHreflangBlock(routePath) {
  const lines = [
    `  <link rel="alternate" hreflang="x-default" href="${BASE_URL}${routePath}" />`,
    `  <link rel="alternate" hreflang="en" href="${BASE_URL}${routePath}" />`,
  ];
  for (const lang of langs) {
    if (lang === 'en') continue;
    const hreflang = LANG_CODES[lang];
    const url = `${BASE_URL}/${lang}${routePath === '/' ? '' : routePath}`;
    lines.push(`  <link rel="alternate" hreflang="${hreflang}" href="${url}" />`);
  }
  return lines.join('\n');
}

function buildHtml(routePath, lang, slug) {
  const meta = META[slug]?.[lang];
  if (!meta) return null;

  const canonical = lang === 'en'
    ? `${BASE_URL}${routePath}`
    : `${BASE_URL}/${lang}${routePath === '/' ? '' : routePath}`;

  const htmlLang = LANG_CODES[lang].split('-')[0];

  const hreflang = buildHreflangBlock(routePath);

  let html = baseHtml
    .replace(/<html([^>]*)lang="[^"]*"/, `<html$1lang="${htmlLang}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(meta.description)}"`)
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(meta.title)}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(meta.description)}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${canonical}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${esc(meta.title)}"`)
    .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${esc(meta.description)}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${canonical}"`);

  // Remove stale hreflang alternate tags from base template
  html = html.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*" \/>\n?/g, '');

  // Insert correct hreflang block before </head>
  html = html.replace('</head>', `${hreflang}\n</head>`);

  return html;
}

let count = 0;

for (const { path: routePath, slug } of ROUTES) {
  for (const lang of langs) {
    const html = buildHtml(routePath, lang, slug);
    if (!html) continue;

    let outPath;
    if (lang === 'en') {
      // English: dist/route/index.html (or dist/index.html for /)
      if (routePath === '/') {
        outPath = join(distDir, 'index.html');
      } else {
        const dir = join(distDir, routePath.slice(1));
        mkdirSync(dir, { recursive: true });
        outPath = join(dir, 'index.html');
      }
    } else {
      // Other languages: dist/lang/route/index.html
      const routeSeg = routePath === '/' ? '' : routePath;
      const dir = join(distDir, lang, ...routeSeg.slice(1).split('/').filter(Boolean));
      mkdirSync(dir, { recursive: true });
      outPath = join(dir, 'index.html');
    }

    writeFileSync(outPath, html, 'utf-8');
    count++;
  }
}

console.log(`\n✓ Prerender complete — ${count} HTML files generated (${ROUTES.length} routes × ${langs.length} languages).`);

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
import { build } from 'esbuild';
import { META, ROUTES, LANG_CODES } from './meta-translations.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const BASE_URL = 'https://www.thestormwatcher.com';

const baseHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');
const langs = Object.keys(LANG_CODES);

/**
 * Loads src/data/blog (TypeScript) by bundling it with esbuild in-memory.
 * Blog post bodies are translated per-post via each post's `translations`
 * object — unlike app pages, whose locale files are complete — so the real
 * post data is the single source of truth for which languages exist and for
 * their translated <title>/<meta description>.
 * (scripts/blog-translations.json mirrors the coverage for the Python sitemap
 * generator; src/data/blog/blogTranslations.test.ts keeps it in sync.)
 */
async function loadBlogPosts() {
  const result = await build({
    entryPoints: [join(__dirname, '..', 'src', 'data', 'blog', 'index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    logLevel: 'silent',
  });
  const dataUrl = 'data:text/javascript;base64,'
    + Buffer.from(result.outputFiles[0].text).toString('base64');
  return (await import(dataUrl)).blogPosts;
}

const blogPosts = await loadBlogPosts();
const postByUrlSlug = new Map(blogPosts.map((p) => [p.slug, p]));

// The blog index page has English-only meta (hardcoded in src/pages/Blog.tsx),
// so its localized variants are treated as duplicates of the English page.
const EN_ONLY_ROUTES = new Set(['/blog']);

/** URL slug for blog-post routes (`/blog/what-is-kp-index` → `what-is-kp-index`), else null. */
function blogSlug(routePath) {
  return routePath.startsWith('/blog/') ? routePath.slice('/blog/'.length) : null;
}

/**
 * Languages whose page at `routePath` has real translated content.
 * App routes: all 16 (locale files are complete). Blog posts: EN + whatever
 * the post's `translations` object actually contains.
 */
function coveredLangs(routePath) {
  if (EN_ONLY_ROUTES.has(routePath)) return ['en'];
  const slug = blogSlug(routePath);
  if (slug === null) return langs;
  const post = postByUrlSlug.get(slug);
  return ['en', ...Object.keys(post?.translations ?? {})];
}

/**
 * <title>/<meta description> for a page. English (and everything non-blog)
 * comes from the hand-tuned META table; translated blog-post variants come
 * from the post's own translations so the prerendered head matches what the
 * client renders after hydration.
 */
function resolveMeta(routePath, slug, lang) {
  const post = postByUrlSlug.get(blogSlug(routePath) ?? '');
  if (post && lang !== 'en') {
    const t = post.translations?.[lang];
    return t ? { title: `${t.title} — The Storm Watcher`, description: t.description } : null;
  }
  return META[slug]?.[lang];
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHreflangBlock(routePath) {
  const covered = coveredLangs(routePath);
  // A cluster of one real page (EN only) has no alternates worth declaring.
  if (covered.length < 2) return '';
  const lines = [
    `  <link rel="alternate" hreflang="x-default" href="${BASE_URL}${routePath}" />`,
    `  <link rel="alternate" hreflang="en" href="${BASE_URL}${routePath}" />`,
  ];
  for (const lang of covered) {
    if (lang === 'en') continue;
    const hreflang = LANG_CODES[lang];
    const url = `${BASE_URL}/${lang}${routePath === '/' ? '' : routePath}`;
    lines.push(`  <link rel="alternate" hreflang="${hreflang}" href="${url}" />`);
  }
  return lines.join('\n');
}

function buildHtml(routePath, lang, slug) {
  // A language variant without real translated content serves the English body,
  // so it must canonicalize to the English URL (duplicate, not an alternate)
  // and carry no hreflang — otherwise Google sees 16 near-identical pages all
  // claiming to be distinct translations and picks its own canonical.
  const isDuplicateOfEnglish = !coveredLangs(routePath).includes(lang);

  const meta = resolveMeta(routePath, slug, isDuplicateOfEnglish ? 'en' : lang);
  if (!meta) return null;

  const canonical = lang === 'en' || isDuplicateOfEnglish
    ? `${BASE_URL}${routePath}`
    : `${BASE_URL}/${lang}${routePath === '/' ? '' : routePath}`;

  const htmlLang = isDuplicateOfEnglish ? 'en' : LANG_CODES[lang].split('-')[0];

  const hreflang = isDuplicateOfEnglish ? '' : buildHreflangBlock(routePath);

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
  if (hreflang) {
    html = html.replace('</head>', `${hreflang}\n</head>`);
  }

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

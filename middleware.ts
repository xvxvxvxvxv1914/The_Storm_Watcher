import { next } from '@vercel/functions';

// Vercel Routing Middleware (runs on the Edge, on Vercel only — not in `vite dev`).
//
// Three URL-hygiene jobs, all ending in a single-hop 301 to the canonical URL:
//
// 1. Trailing slashes: `/ru/` and `/ru` both served 200 (duplicate content — GSC
//    flagged the slash variants as "unknown to Google" / lacking a chosen
//    canonical). The canonical form everywhere (sitemap, rel=canonical, internal
//    links) has NO trailing slash, so `/ru/` → 301 → `/ru`, `/aurora/` → `/aurora`.
//
// 2. Legacy `?lang=xx` query URLs. The site moved to path-prefix i18n (English at
//    `/sky`, other locales at `/no/sky`). Old links still arrive as `/sky?lang=no`;
//    we 301 them to the canonical `/no/sky` with NO query string. (vercel.json
//    redirects can't do this — Vercel always copies the source query onto the
//    destination.)
//
// 3. Permanently-removed routes → their closest live replacement. `/viewing-window`
//    was live only briefly (May 2026) but sat in sitemap.xml for ~9 days, so Google
//    still recrawls the dead localized URLs (`/uk/viewing-window`, …) as soft-404s
//    (the SPA catch-all returns 200 + a noindex NotFound page). A 301 to the nearest
//    page gives Google a clean signal and consolidates any residual link equity.

// 15 non-English locale prefixes — mirror LANG_PREFIXES in src/utils/langUrl.ts.
const LANG_PREFIXES = new Set([
  'bg', 'de', 'es', 'fr', 'ja', 'ru', 'zh',
  'da', 'fi', 'is', 'ko', 'no', 'pl', 'sv', 'uk',
]);

// Removed route → replacement, keyed by the logical route (language prefix stripped).
// `/viewing-window` combined the Kp forecast, aurora visibility and cloud cover for
// "tonight's best hour" — `/sky` (Sky Visibility Tonight) is the closest live page.
const REMOVED_ROUTES = new Map<string, string>([
  ['/viewing-window', '/sky'],
]);

export const config = {
  // Page routes only — skip API, static assets, the DONKI proxy and any file with
  // an extension (sitemap.xml, robots.txt, *.js, images, …).
  matcher: ['/((?!api|assets|donki|.*\\.).*)'],
};

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');

  // Strip trailing slashes (but never the root `/` itself).
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '') || '/';
  }

  // Remap permanently-removed routes, preserving any language prefix
  // (`/uk/viewing-window` → `/uk/sky`, `/viewing-window` → `/sky`).
  const firstSeg = pathname.split('/')[1];
  const routePrefix = LANG_PREFIXES.has(firstSeg) ? `/${firstSeg}` : '';
  const logicalRoute = routePrefix ? pathname.slice(routePrefix.length) || '/' : pathname;
  const replacement = REMOVED_ROUTES.get(logicalRoute);
  if (replacement) {
    pathname = `${routePrefix}${replacement === '/' ? '' : replacement}` || '/';
  }

  // Already canonical → let the request continue untouched.
  if (lang === null && pathname === url.pathname) return next();

  // Drop the lang param; preserve any other query params (legacy URLs rarely have them).
  url.searchParams.delete('lang');

  // Prepend the path prefix only for supported locales that aren't already prefixed.
  // (Already-prefixed URLs like /no/sky?lang=no, or unsupported langs, just lose the query.)
  if (lang !== null) {
    const firstSegment = pathname.split('/')[1];
    if (LANG_PREFIXES.has(lang) && !LANG_PREFIXES.has(firstSegment)) {
      pathname = pathname === '/' ? `/${lang}` : `/${lang}${pathname}`;
    }
  }

  const query = url.searchParams.toString();
  const location = pathname + (query ? `?${query}` : '');

  // 301 Moved Permanently — same-origin relative Location (keeps www on www, and
  // leaves the existing apex→www redirect untouched).
  return new Response(null, {
    status: 301,
    headers: { Location: location },
  });
}

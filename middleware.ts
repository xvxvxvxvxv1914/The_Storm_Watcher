import { next } from '@vercel/functions';

// Vercel Routing Middleware (runs on the Edge, on Vercel only — not in `vite dev`).
//
// Purpose: clean up legacy `?lang=xx` query URLs. The site moved to path-prefix
// i18n (English at `/sky`, other locales at `/no/sky`). Old links still arrive as
// `/sky?lang=no`; we 301 them to the canonical `/no/sky` with NO query string.
//
// This replaces the old vercel.json redirect, which could only forward the query
// (Vercel always copies the source query onto a redirect destination), leaving the
// `?lang=` param on the final URL.

// 15 non-English locale prefixes — mirror LANG_PREFIXES in src/utils/langUrl.ts.
const LANG_PREFIXES = new Set([
  'bg', 'de', 'es', 'fr', 'ja', 'ru', 'zh',
  'da', 'fi', 'is', 'ko', 'no', 'pl', 'sv', 'uk',
]);

export const config = {
  // Page routes only — skip API, static assets, the DONKI proxy and any file with
  // an extension (sitemap.xml, robots.txt, *.js, images, …).
  matcher: ['/((?!api|assets|donki|.*\\.).*)'],
};

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');

  // No legacy lang param → let the request continue untouched.
  if (lang === null) return next();

  // Drop the lang param; preserve any other query params (legacy URLs rarely have them).
  url.searchParams.delete('lang');

  // Prepend the path prefix only for supported locales that aren't already prefixed.
  // (Already-prefixed URLs like /no/sky?lang=no, or unsupported langs, just lose the query.)
  const firstSegment = url.pathname.split('/')[1];
  if (LANG_PREFIXES.has(lang) && !LANG_PREFIXES.has(firstSegment)) {
    url.pathname = url.pathname === '/' ? `/${lang}` : `/${lang}${url.pathname}`;
  }

  const query = url.searchParams.toString();
  const location = url.pathname + (query ? `?${query}` : '');

  // 301 Moved Permanently — same-origin relative Location (keeps www on www, and
  // leaves the existing apex→www redirect untouched).
  return new Response(null, {
    status: 301,
    headers: { Location: location },
  });
}

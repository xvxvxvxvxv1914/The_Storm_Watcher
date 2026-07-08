// Single source of truth for language-prefixed URL handling.
//
// SEO model: English lives at the root (`/sky`); the other 15 locales live under
// a path prefix (`/de/sky`). The prerender step (scripts/prerender-meta.mjs) and
// sitemap (scripts/generate_sitemap.py) already emit this structure — these
// helpers keep the live SPA (Router basename, language detection, canonical /
// hreflang, language switcher) consistent with it.

// 15 non-English locale codes that appear as a URL path prefix. Must stay in
// sync with `languages` in src/contexts/LanguageContext.tsx.
export const LANG_PREFIXES = [
  'bg', 'es', 'fr', 'de', 'ru', 'zh', 'ja', 'no',
  'fi', 'sv', 'is', 'da', 'pl', 'uk', 'ko',
] as const;

// All supported UI languages (English + the prefixed locales).
export const ALL_LANGS = ['en', ...LANG_PREFIXES] as const;

// hreflang code overrides where the URL prefix differs from the BCP-47 tag.
// Mirrors LANG_CODES in scripts/meta-translations.mjs.
const HREFLANG_CODES: Record<string, string> = { zh: 'zh-Hans' };

export const hreflangCode = (lang: string): string => HREFLANG_CODES[lang] ?? lang;

const PREFIX_SET = new Set<string>(LANG_PREFIXES);

/** Returns the locale code if `pathname`'s first segment is a known prefix, else null. */
export const langFromPath = (pathname: string): string | null => {
  const seg = pathname.split('/')[1];
  return seg && PREFIX_SET.has(seg) ? seg : null;
};

/**
 * Router basename for the current URL: `/de` when under a language prefix,
 * otherwise undefined (English root / native app). Computed once at startup.
 */
export const langBasename = (pathname: string): string | undefined => {
  const lang = langFromPath(pathname);
  return lang ? `/${lang}` : undefined;
};

/** Strips a leading language prefix, returning the logical route (always starts with `/`). */
export const stripLangPrefix = (pathname: string): string => {
  const lang = langFromPath(pathname);
  if (!lang) return pathname || '/';
  const rest = pathname.slice(lang.length + 1); // drop `/de`
  return rest === '' ? '/' : rest;
};

/**
 * Builds the absolute-on-site path for a route in a given language.
 * `localizedPath('de', '/sky')` → `/de/sky`; `localizedPath('en', '/sky')` → `/sky`.
 */
export const localizedPath = (lang: string, routePath: string): string => {
  const path = routePath === '/' ? '' : routePath;
  return lang === 'en' ? (path || '/') : `/${lang}${path}`;
};

/**
 * Target URL for switching to `lang` while staying on the current route.
 * Reads the live location, strips any existing prefix, preserves query/hash.
 * The switcher navigates here with a full load so the Router basename, the
 * prerendered HTML and the locale chunk all line up.
 */
export const switchLangUrl = (lang: string): string => {
  const route = stripLangPrefix(window.location.pathname);
  return localizedPath(lang, route) + window.location.search + window.location.hash;
};

/**
 * Persist the language choice before navigating to a localized URL. Persisting
 * first ensures the English root (no prefix) shows English on reload instead of
 * falling back to the previous saved language.
 */
export const persistLanguage = (lang: string): void => {
  try { localStorage.setItem('language', lang); } catch { /* storage may be blocked */ }
};

/**
 * Switch the UI language: persist the choice, then full-navigate to the localized
 * URL of the current route. Prefer a real `<a href={switchLangUrl(lang)}>` with an
 * onClick that calls persistLanguage — crawlable and middle-click friendly — and
 * keep this only for places where an anchor isn't possible.
 */
export const navigateToLang = (lang: string): void => {
  persistLanguage(lang);
  window.location.assign(switchLangUrl(lang));
};

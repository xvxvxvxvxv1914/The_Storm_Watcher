/**
 * Translated <title>/<meta description> per route, one file per language under
 * `./pageMeta/` (generated — see scripts/generate-page-meta.mjs).
 *
 * The same text is baked into the prerendered HTML. Without this, React replaced
 * it with the English title each page passes to PageMeta as soon as it mounted.
 * Each language is its own on-demand chunk, like `faqContent.ts`.
 */

import { useEffect, useReducer } from 'react';

export type PageMetaText = { title: string; description: string };
export type PageMetaTable = Record<string, PageMetaText>;

const loaders: Record<string, () => Promise<{ default: PageMetaTable }>> = {
  bg: () => import('./pageMeta/bg'),
  de: () => import('./pageMeta/de'),
  es: () => import('./pageMeta/es'),
  fr: () => import('./pageMeta/fr'),
  ru: () => import('./pageMeta/ru'),
  no: () => import('./pageMeta/no'),
  sv: () => import('./pageMeta/sv'),
  da: () => import('./pageMeta/da'),
  fi: () => import('./pageMeta/fi'),
  is: () => import('./pageMeta/is'),
  pl: () => import('./pageMeta/pl'),
  uk: () => import('./pageMeta/uk'),
  ko: () => import('./pageMeta/ko'),
  zh: () => import('./pageMeta/zh'),
  ja: () => import('./pageMeta/ja'),
};

export const PAGE_META_LANGS = Object.keys(loaders);

const tables = new Map<string, PageMetaTable>();

export const loadPageMeta = async (lang: string): Promise<PageMetaTable> => {
  const cached = tables.get(lang);
  if (cached) return cached;
  const table = (await loaders[lang]()).default;
  tables.set(lang, table);
  return table;
};

/**
 * The translated title/description for `path`:
 * - `null`      — nothing to translate (English, or a route without an entry):
 *                 use the page's own text.
 * - `undefined` — the language's table is still loading: render no title yet,
 *                 so the prerendered one stays instead of flashing English.
 */
export function useTranslatedPageMeta(lang: string, path: string): PageMetaText | null | undefined {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const hasLoader = lang in loaders;
  const table = tables.get(lang);

  useEffect(() => {
    if (!hasLoader || tables.has(lang)) return;
    let live = true;
    loadPageMeta(lang).then(
      () => { if (live) rerender(); },
      // A failed chunk only costs the translated title: fall back to the page's
      // own text rather than leaving the tab without one.
      () => { tables.set(lang, {}); if (live) rerender(); },
    );
    return () => { live = false; };
  }, [lang, hasLoader]);

  if (!hasLoader) return null;
  if (!table) return undefined;
  return table[path] ?? null;
}

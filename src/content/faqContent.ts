/**
 * FAQ long-form content, one file per language under `./faq/`.
 *
 * It used to be a single `Record<lang, FaqLangContent>` literal, which meant the
 * /faq chunk carried all 16 translations (176 kB) to every visitor so it could
 * render one. The per-language files are dynamically imported — Vite statically
 * analyses the template below, so each becomes its own chunk fetched on demand,
 * the same way `LanguageContext` loads `src/locales/`.
 *
 * Items are positionally indexed (see `faqCategories` in src/pages/FAQ.tsx) —
 * adding or reordering a question means touching the same index in all 16 files.
 */

export type FaqItemText = { question: string; answer: string };

export type FaqLangContent = {
  subtitle: string;
  categories: Record<string, string>;
  items: FaqItemText[];
};

const loaders: Record<string, () => Promise<{ default: FaqLangContent }>> = {
  en: () => import('./faq/en'),
  bg: () => import('./faq/bg'),
  de: () => import('./faq/de'),
  es: () => import('./faq/es'),
  fr: () => import('./faq/fr'),
  ru: () => import('./faq/ru'),
  no: () => import('./faq/no'),
  sv: () => import('./faq/sv'),
  da: () => import('./faq/da'),
  fi: () => import('./faq/fi'),
  is: () => import('./faq/is'),
  pl: () => import('./faq/pl'),
  uk: () => import('./faq/uk'),
  ko: () => import('./faq/ko'),
  zh: () => import('./faq/zh'),
  ja: () => import('./faq/ja'),
};

// Promises, not values: two callers during the same tick share one import.
const cache = new Map<string, Promise<FaqLangContent>>();

/** Loads one language's FAQ content, falling back to English. */
export const loadFaq = (lang: string): Promise<FaqLangContent> => {
  const key = lang in loaders ? lang : 'en';
  let pending = cache.get(key);
  if (!pending) {
    pending = loaders[key]().then(mod => mod.default);
    cache.set(key, pending);
  }
  return pending;
};

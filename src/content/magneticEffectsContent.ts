/**
 * "Magnetic Storms & Human Health" long-form content, one file per language
 * under `./magnetic/`.
 *
 * Split for the same reason as `faqContent.ts`: the page needs one translation,
 * but a single combined literal shipped all 16 (90 kB) in the route chunk.
 *
 * Sections are positionally indexed (see `sectionMeta` in
 * src/pages/MagneticEffects.tsx) — adding or reordering one means touching the
 * same index in all 16 files.
 */

export type SectionText = { heading: string; body: string };

export type MagneticLangContent = {
  title: string;
  subtitle: string;
  sections: SectionText[];
  sources: string;
};

const loaders: Record<string, () => Promise<{ default: MagneticLangContent }>> = {
  en: () => import('./magnetic/en'),
  bg: () => import('./magnetic/bg'),
  de: () => import('./magnetic/de'),
  es: () => import('./magnetic/es'),
  fr: () => import('./magnetic/fr'),
  ru: () => import('./magnetic/ru'),
  no: () => import('./magnetic/no'),
  sv: () => import('./magnetic/sv'),
  da: () => import('./magnetic/da'),
  fi: () => import('./magnetic/fi'),
  is: () => import('./magnetic/is'),
  pl: () => import('./magnetic/pl'),
  uk: () => import('./magnetic/uk'),
  ko: () => import('./magnetic/ko'),
  zh: () => import('./magnetic/zh'),
  ja: () => import('./magnetic/ja'),
};

// Promises, not values: two callers during the same tick share one import.
const cache = new Map<string, Promise<MagneticLangContent>>();

/** Loads one language's content, falling back to English. */
export const loadMagnetic = (lang: string): Promise<MagneticLangContent> => {
  const key = lang in loaders ? lang : 'en';
  let pending = cache.get(key);
  if (!pending) {
    pending = loaders[key]().then(mod => mod.default);
    cache.set(key, pending);
  }
  return pending;
};

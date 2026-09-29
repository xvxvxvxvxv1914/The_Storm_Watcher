// Types for the generator, so src/content/pageMeta.test.ts can import it to check
// the committed src/content/pageMeta/*.ts against meta-translations.mjs.
export const PAGE_META_LANGS: string[];
export function pageMetaFor(lang: string): Record<string, { title: string; description: string }>;
export function pageMetaSource(lang: string): string;

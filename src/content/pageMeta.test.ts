import { describe, it, expect } from 'vitest';

import { loadPageMeta, PAGE_META_LANGS } from './pageMeta';
import { pageMetaFor, PAGE_META_LANGS as GENERATED_LANGS } from '../../scripts/generate-page-meta.mjs';

/**
 * src/content/pageMeta/*.ts are generated from scripts/meta-translations.mjs, the
 * table the prerender uses. If they drift, a page's title changes the moment React
 * mounts — the bug these files exist to fix. Compared as data, not bytes, so a
 * CRLF checkout cannot fail it.
 */
describe('translated page meta', () => {
  it('has a loader for every generated language', () => {
    expect([...PAGE_META_LANGS].sort()).toEqual([...GENERATED_LANGS].sort());
  });

  it.each(GENERATED_LANGS)('%s matches meta-translations.mjs (run `node scripts/generate-page-meta.mjs`)', async (lang) => {
    expect(await loadPageMeta(lang)).toEqual(pageMetaFor(lang));
  });

  it('translates the pages the audit found in English', async () => {
    const bg = await loadPageMeta('bg');
    for (const path of ['/', '/dashboard', '/forecast', '/aurora', '/pricing']) {
      expect(bg[path]?.title, path).toMatch(/[А-Яа-я]/);
    }
  });
});

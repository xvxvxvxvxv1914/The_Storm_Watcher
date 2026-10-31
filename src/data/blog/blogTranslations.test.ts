import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { blogPosts } from './index';

// scripts/blog-translations.json is the build-time source of truth for which
// languages each blog post is actually translated into. It drives:
//   - scripts/prerender-meta.mjs  (hreflang + canonical on prerendered HTML)
//   - scripts/generate_sitemap.py (which localized blog URLs enter the sitemap)
// This test keeps it in lockstep with the real `translations` objects in
// src/data/blog/posts/*.ts — update the JSON when adding a translation.
const coverage: Record<string, string[]> = JSON.parse(
  readFileSync(join(__dirname, '../../../scripts/blog-translations.json'), 'utf-8'),
);

describe('scripts/blog-translations.json', () => {
  it('covers exactly the existing blog posts', () => {
    const slugs = blogPosts.map((p) => p.slug).sort();
    expect(Object.keys(coverage).sort()).toEqual(slugs);
  });

  it.each(blogPosts.map((p) => [p.slug, p] as const))(
    '%s lists exactly the languages with real translations',
    (slug, post) => {
      const actual = Object.keys(post.translations ?? {}).sort();
      expect((coverage[slug] ?? []).slice().sort()).toEqual(actual);
    },
  );

  // Every consumer reads an entry here as "this language has the article":
  // `content: []` passed the coverage check above and shipped 28 sitemap URLs
  // with a translated title, a self-canonical and no article under them. A
  // language without a body must have no entry, so it falls back to English.
  it.each(blogPosts.map((p) => [p.slug, p] as const))(
    '%s has a body for every translation',
    (slug, post) => {
      const titleOnly = Object.entries(post.translations ?? {})
        .filter(([, t]) => t.content.length === 0)
        .map(([lang]) => lang);
      expect(titleOnly, `${slug} has translations without a body`).toEqual([]);
    },
  );
});

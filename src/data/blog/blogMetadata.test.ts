import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { blogPosts } from './index';
import { blogMeta } from './metadata';
import { blogSlugs } from './loadPost';
import { buildMetadataSource } from '../../../scripts/generate-blog-metadata.mjs';

/**
 * metadata.ts is generated and committed so nothing has to run before `vite dev`.
 * That only works if drift fails loudly — editing a post's title without
 * regenerating would leave the list page showing the old one.
 */
describe('blog metadata', () => {
  it('matches the post files (run `node scripts/generate-blog-metadata.mjs`)', async () => {
    const expected = await buildMetadataSource();
    const actual = readFileSync(join(__dirname, 'metadata.ts'), 'utf-8');
    expect(actual).toBe(expected);
  });

  it('covers every post', () => {
    expect(blogMeta.map(p => p.slug).sort()).toEqual(blogPosts.map(p => p.slug).sort());
  });

  it('carries no article bodies', () => {
    for (const post of blogMeta) {
      expect(post, `${post.slug} still has content`).not.toHaveProperty('content');
      for (const [lang, t] of Object.entries(post.translations ?? {})) {
        expect(t, `${post.slug}/${lang} still has content`).not.toHaveProperty('content');
      }
    }
  });

  // A missing loader entry is invisible until someone opens that article and
  // gets redirected to /blog — the slugs are not always the filename.
  it('has a lazy loader for every published slug', () => {
    expect(blogSlugs.sort()).toEqual(blogPosts.map(p => p.slug).sort());
  });

  it('keeps the same translation languages as the post files', () => {
    for (const post of blogPosts) {
      const meta = blogMeta.find(p => p.slug === post.slug);
      expect(Object.keys(meta?.translations ?? {}).sort())
        .toEqual(Object.keys(post.translations ?? {}).sort());
    }
  });
});

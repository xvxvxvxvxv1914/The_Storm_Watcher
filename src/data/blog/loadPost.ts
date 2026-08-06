import type { BlogPost, BlogPostMeta } from './types';
import { blogMeta } from './metadata';

/**
 * Per-post lazy loading and the metadata-only helpers the list pages use.
 *
 * Deliberately does NOT import `./index` — that module statically imports all ten
 * posts, and anything reaching it pulls all ten article bodies (152 kB) back into
 * the chunk. `index.ts` is for build-time consumers (the prerender script, the
 * sitemap coverage test) that pay no download cost.
 */

// Slug → module. Vite statically analyses these so each post becomes its own
// chunk. Slugs are not always the filename (`what-is-iss-how-to-track` lives in
// `what-is-iss.ts`), so the map is explicit; blogMetadata.test.ts checks that
// every published slug has an entry.
const loaders: Record<string, () => Promise<{ default: BlogPost }>> = {
  'aurora-forecast-explained': () => import('./posts/aurora-forecast-explained'),
  'best-places-aurora-europe': () => import('./posts/best-places-aurora-europe'),
  'g1-to-g5-storm-levels': () => import('./posts/g1-to-g5-storm-levels'),
  'how-to-see-northern-lights': () => import('./posts/how-to-see-northern-lights'),
  'space-weather-effects-on-earth': () => import('./posts/space-weather-effects-on-earth'),
  'what-is-geomagnetic-storm': () => import('./posts/what-is-geomagnetic-storm'),
  'what-is-iss-how-to-track': () => import('./posts/what-is-iss'),
  'what-is-kp-index': () => import('./posts/what-is-kp-index'),
  'what-is-solar-flare': () => import('./posts/what-is-solar-flare'),
  'what-is-solar-wind': () => import('./posts/what-is-solar-wind'),
};

export const blogSlugs = Object.keys(loaders);

const cache = new Map<string, Promise<BlogPost>>();

/**
 * Loads one post and applies the requested translation, falling back to English
 * when the post has no translation for that language. Resolves to null for an
 * unknown slug so the caller can render its 404.
 */
export const loadPost = (slug: string, lang: string): Promise<BlogPost | null> => {
  const loader = loaders[slug];
  if (!loader) return Promise.resolve(null);

  let pending = cache.get(slug);
  if (!pending) {
    pending = loader().then(mod => mod.default);
    cache.set(slug, pending);
  }

  return pending.then((post) => {
    const t = post.translations?.[lang];
    return t ? { ...post, title: t.title, description: t.description, content: t.content } : post;
  });
};

/** The list page's posts, titles and descriptions in the requested language. */
export const getLocalizedBlogMeta = (lang: string): BlogPostMeta[] =>
  blogMeta.map((post) => {
    const t = post.translations?.[lang];
    return t ? { ...post, title: t.title, description: t.description } : post;
  });

/** Whether a post has a real translation — drives the hreflang/canonical choice. */
export const hasTranslation = (slug: string, lang: string): boolean =>
  lang === 'en' || Boolean(blogMeta.find(p => p.slug === slug)?.translations?.[lang]);

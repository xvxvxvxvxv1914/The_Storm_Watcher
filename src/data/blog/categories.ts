import type { BlogPost } from './types';

// Kept out of index.ts: that module statically imports every post, so a page
// importing a label from it would drag all ten article bodies along.
export const CATEGORY_LABELS: Record<BlogPost['category'], string> = {
  'space-weather': 'Space Weather',
  'aurora': 'Aurora',
  'solar': 'Solar Activity',
  'guide': 'Guide',
};

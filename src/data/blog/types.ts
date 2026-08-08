export interface BlogTranslation {
  title: string;
  description: string;
  content: BlogSection[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: number;
  category: 'space-weather' | 'aurora' | 'solar' | 'guide';
  coverEmoji: string;
  content: BlogSection[];
  translations?: Record<string, BlogTranslation>;
}

/**
 * A post without its body — everything the list page renders. Article bodies are
 * 89% of the post data, so they load per post instead (see loadPost.ts).
 * Generated into metadata.ts by scripts/generate-blog-metadata.mjs.
 */
export type BlogPostMeta = Omit<BlogPost, 'content' | 'translations'> & {
  translations?: Record<string, Omit<BlogTranslation, 'content'>>;
};

export interface BlogSection {
  type: 'paragraph' | 'heading' | 'list' | 'callout';
  text?: string;
  items?: string[];
  level?: 2 | 3;
  variant?: 'info' | 'warning' | 'tip';
}

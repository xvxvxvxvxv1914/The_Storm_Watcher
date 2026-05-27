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

export interface BlogSection {
  type: 'paragraph' | 'heading' | 'list' | 'callout';
  text?: string;
  items?: string[];
  level?: 2 | 3;
  variant?: 'info' | 'warning' | 'tip';
}

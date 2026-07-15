import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../contexts/LanguageContext';
import { localizedPath } from '../utils/langUrl';

const BASE_URL = 'https://www.thestormwatcher.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

const PAGE_SLUGS: Record<string, string> = {
  '/': 'home',
  '/aurora': 'aurora',
  '/forecast': 'forecast',
  '/calendar': 'calendar',
  '/pricing': 'pricing',
  '/mood': 'mood',
  '/alerts': 'alerts',
  '/dashboard': 'dashboard',
  '/iss': 'iss',
  '/gallery': 'gallery',
  '/hunt': 'hunt',
  '/aurora-map': 'aurora',
  '/livestream': 'livestream',
};

interface Props {
  title: string;
  description: string;
  path: string;
  image?: string;
  ogKp?: number;
  noindex?: boolean;
  /**
   * Overrides the canonical (and og:url) with a non-localized path. Used by
   * pages whose current-language variant serves untranslated (English) content
   * — e.g. a blog post without a translation canonicalizes to `/blog/<slug>`
   * instead of `/de/blog/<slug>`, matching the prerendered HTML.
   */
  canonicalPath?: string;
  children?: React.ReactNode;
}

export default function PageMeta({ title, description, path, image, ogKp, noindex, canonicalPath, children }: Props) {
  const { language } = useLanguage();
  // Self-referencing canonical per locale: `/de/sky` canonicals to itself, not to
  // the English `/sky`. Crawlers (no saved language) resolve `language` to the URL
  // prefix, so this matches the prerendered HTML.
  const url = `${BASE_URL}${canonicalPath ?? localizedPath(language, path)}`;
  const slug = PAGE_SLUGS[path];
  const ogImage = image
    ?? (slug
      ? `${BASE_URL}/api/og?page=${slug}${ogKp !== undefined ? `&kp=${ogKp.toFixed(1)}` : ''}`
      : DEFAULT_IMAGE);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {children}
    </Helmet>
  );
}

import { Helmet } from 'react-helmet-async';

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
  children?: React.ReactNode;
}

export default function PageMeta({ title, description, path, image, ogKp, noindex, children }: Props) {
  const url = `${BASE_URL}${path}`;
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

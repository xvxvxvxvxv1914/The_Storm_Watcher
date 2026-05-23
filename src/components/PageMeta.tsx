import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://www.thestormwatcher.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.webp`;

interface Props {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  children?: React.ReactNode;
}

export default function PageMeta({ title, description, path, image = DEFAULT_IMAGE, noindex, children }: Props) {
  const url = `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/webp" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {children}
    </Helmet>
  );
}

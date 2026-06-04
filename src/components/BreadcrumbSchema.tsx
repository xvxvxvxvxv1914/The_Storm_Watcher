import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://www.thestormwatcher.com';

interface Crumb {
  name: string;
  path: string;
}

interface Props {
  crumbs: Crumb[];
}

export default function BreadcrumbSchema({ crumbs }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${BASE_URL}${c.path}`,
    })),
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

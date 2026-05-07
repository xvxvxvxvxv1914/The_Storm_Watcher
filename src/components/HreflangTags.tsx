import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const BASE = 'https://thestormwatcher.com';
const LANGS = ['en', 'bg', 'es', 'fr', 'de', 'ru', 'zh', 'ja'];

const HreflangTags = () => {
  const { pathname } = useLocation();
  const url = `${BASE}${pathname === '/' ? '' : pathname}`;

  return (
    <Helmet>
      {LANGS.map(lang => (
        <link key={lang} rel="alternate" hreflang={lang} href={url} />
      ))}
      <link rel="alternate" hreflang="x-default" href={url} />
    </Helmet>
  );
};

export default HreflangTags;

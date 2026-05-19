import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const BASE = 'https://www.thestormwatcher.com';
// SPA — no locale subpaths; all hreflang point to the same canonical URL.
// When locale routing is added, update href to `${BASE}/${lang}${pathname}`.
const LANGS = ['en', 'no', 'fi', 'sv', 'is', 'de', 'da', 'fr', 'pl', 'uk', 'ja', 'ko'];

const HreflangTags = () => {
  const { pathname } = useLocation();
  const url = `${BASE}${pathname === '/' ? '' : pathname}`;

  return (
    <Helmet>
      {LANGS.map(lang => (
        <link key={lang} rel="alternate" hrefLang={lang} href={url} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={url} />
    </Helmet>
  );
};

export default HreflangTags;

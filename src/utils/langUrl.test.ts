import { describe, it, expect } from 'vitest';
import {
  langFromPath,
  langBasename,
  stripLangPrefix,
  localizedPath,
  languageRedirectPath,
} from './langUrl';

describe('langFromPath', () => {
  it('returns the locale for a prefixed path', () => {
    expect(langFromPath('/de/sky')).toBe('de');
    expect(langFromPath('/no')).toBe('no');
  });
  it('returns null for the English root and unknown prefixes', () => {
    expect(langFromPath('/sky')).toBeNull();
    expect(langFromPath('/')).toBeNull();
    expect(langFromPath('/en/sky')).toBeNull(); // en is not a prefix
    expect(langFromPath('/desky')).toBeNull();  // not a path segment boundary
  });
});

describe('langBasename', () => {
  it('is the prefix path under a locale, undefined otherwise', () => {
    expect(langBasename('/de/sky')).toBe('/de');
    expect(langBasename('/sky')).toBeUndefined();
    expect(langBasename('/')).toBeUndefined();
  });
});

describe('stripLangPrefix', () => {
  it('drops a leading locale prefix', () => {
    expect(stripLangPrefix('/de/sky')).toBe('/sky');
    expect(stripLangPrefix('/de')).toBe('/');
    expect(stripLangPrefix('/de/blog/what-is-kp-index')).toBe('/blog/what-is-kp-index');
  });
  it('leaves non-prefixed paths untouched', () => {
    expect(stripLangPrefix('/sky')).toBe('/sky');
    expect(stripLangPrefix('/')).toBe('/');
  });
});

describe('localizedPath', () => {
  it('prefixes non-English locales and keeps English at root', () => {
    expect(localizedPath('de', '/sky')).toBe('/de/sky');
    expect(localizedPath('en', '/sky')).toBe('/sky');
    expect(localizedPath('de', '/')).toBe('/de');
    expect(localizedPath('en', '/')).toBe('/');
  });
  it('round-trips with stripLangPrefix', () => {
    for (const route of ['/', '/sky', '/blog/what-is-kp-index']) {
      expect(stripLangPrefix(localizedPath('de', route))).toBe(route);
    }
  });
});

describe('languageRedirectPath', () => {
  it('moves an unprefixed URL to the visitor language', () => {
    expect(languageRedirectPath('/faq', null, 'bg-BG')).toBe('/bg/faq');
    expect(languageRedirectPath('/', null, 'de-DE')).toBe('/de');
    expect(languageRedirectPath('/faq', 'bg', 'en-US')).toBe('/bg/faq'); // saved wins
  });
  it('never redirects an already prefixed URL', () => {
    expect(languageRedirectPath('/bg/faq', null, 'bg-BG')).toBeNull();
    expect(languageRedirectPath('/de/sky', 'bg', 'bg-BG')).toBeNull();
  });
  it('a saved en is an explicit choice and beats the browser language', () => {
    expect(languageRedirectPath('/faq', 'en', 'bg-BG')).toBeNull();
  });
  it('stays put for English and unsupported languages', () => {
    expect(languageRedirectPath('/faq', null, 'en-GB')).toBeNull();
    expect(languageRedirectPath('/faq', null, 'pt-BR')).toBeNull(); // unsupported
    expect(languageRedirectPath('/faq', 'garbage', 'bg-BG')).toBeNull();
  });
});

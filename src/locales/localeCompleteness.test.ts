import { describe, it, expect } from 'vitest';
import en from './en';
import bg from './bg';
import de from './de';
import es from './es';
import fr from './fr';
import ja from './ja';
import ru from './ru';
import zh from './zh';
import da from './da';
import fi from './fi';
import is from './is';
import ko from './ko';
import no from './no';
import pl from './pl';
import sv from './sv';
import uk from './uk';

const LOCALES: Record<string, Record<string, string>> = {
  bg, de, es, fr, ja, ru, zh, da, fi, is, ko, no, pl, sv, uk,
};

const enKeys = Object.keys(en);

// Every locale must cover ≥80% of en.ts keys.
describe('locale completeness — all 16 locales vs en', () => {
  for (const [lang, locale] of Object.entries(LOCALES)) {
    const localeKeys = new Set(Object.keys(locale));

    it(`${lang}: at least 80% of en keys present`, () => {
      const covered = enKeys.filter(k => localeKeys.has(k)).length;
      const ratio = covered / enKeys.length;
      expect(ratio, `${lang} coverage ${Math.round(ratio * 100)}% < 80%`).toBeGreaterThanOrEqual(0.8);
    });

    it(`${lang}: no empty string values`, () => {
      for (const [key, value] of Object.entries(locale)) {
        expect(value, `${lang}["${key}"] is empty`).not.toBe('');
      }
    });
  }

  it('critical UI keys translated in all locales', () => {
    const critical = [
      'nav.aurora', 'nav.dashboard', 'nav.forecast', 'nav.alerts',
      'aurora.title', 'dashboard.title',
      'mood.submit', 'mood.thankYou',
      'storm.quiet', 'storm.g1', 'storm.g2', 'storm.g3plus',
      'alerts.type.geoStorm', 'alerts.type.solarFlare',
      'alerts.hero.calm', 'alerts.filter.all',
    ];
    for (const [lang, locale] of Object.entries(LOCALES)) {
      const localeKeys = new Set(Object.keys(locale));
      for (const key of critical) {
        expect(localeKeys.has(key), `${lang} missing critical key: "${key}"`).toBe(true);
      }
    }
  });

  it('no value in en is an empty string', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en["${key}"] is empty`).not.toBe('');
    }
  });
});

import { describe, it, expect } from 'vitest';
import en from './en';
import bg from './bg';

// bg.ts must cover every key in en.ts — missing keys fall back to en at runtime,
// but tracking them here prevents silent omissions from accumulating.
describe('locale completeness: bg vs en', () => {
  const enKeys = Object.keys(en);
  const bgKeys = new Set(Object.keys(bg));

  it('bg has at least 80% of en keys (regression guard)', () => {
    const covered = enKeys.filter(k => bgKeys.has(k)).length;
    const ratio = covered / enKeys.length;
    expect(ratio).toBeGreaterThanOrEqual(0.8);
  });

  it('critical UI keys are translated in bg', () => {
    const critical = [
      'nav.aurora', 'nav.dashboard', 'nav.forecast', 'nav.alerts', 'nav.settings',
      'aurora.title', 'dashboard.title',
      'mood.submit', 'mood.thankYou', 'mood.error',
      'storm.quiet', 'storm.g1', 'storm.g2', 'storm.g3plus',
    ];
    for (const key of critical) {
      expect(bgKeys.has(key), `bg missing critical key: "${key}"`).toBe(true);
    }
  });

  it('no value in en is an empty string', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en["${key}"] is empty`).not.toBe('');
    }
  });

  it('no value in bg is an empty string', () => {
    for (const [key, value] of Object.entries(bg)) {
      expect(value, `bg["${key}"] is empty`).not.toBe('');
    }
  });
});

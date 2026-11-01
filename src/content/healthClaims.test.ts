import { describe, it, expect } from 'vitest';
import type { MagneticLangContent } from './magneticEffectsContent';

/**
 * The Magnetic Effects page, the NIGGG card and the Mood facts used to state
 * health effects as fact in all 16 languages — "people with pacemakers should be
 * careful", "postpone surgeries", "pregnant women limit time outdoors", an
 * unsourced "27%" (audit 2026-10-31). They are now hedged and carry a disclaimer.
 *
 * English is checked by phrase, because that is where the wording is written.
 * The other 15 are checked by structure: a phrase list in 16 languages would only
 * ever catch the translation somebody remembered to list.
 */

const locales = import.meta.glob<Record<string, string>>('../locales/??.ts', { eager: true, import: 'default' });
const magnetic = import.meta.glob<MagneticLangContent>('./magnetic/??.ts', { eager: true, import: 'default' });

const byLang = <T,>(files: Record<string, T>) =>
  Object.fromEntries(Object.entries(files).map(([path, v]) => [path.match(/\/(\w\w)\.ts$/)![1], v])) as Record<string, T>;

const LOCALES = byLang(locales);
const MAGNETIC = byLang(magnetic);
const LANGS = Object.keys(LOCALES).sort();

const HEALTH_KEYS = [
  'niggg.storm.humanEffect', 'niggg.disturbed.humanEffect',
  'mood.fact.headaches', 'mood.fact.sleep', 'mood.fact.heartRate',
  'mood.didYouKnowText', 'mood.aboutText1',
  'effects.kpSevere', 'effects.kpStorm', 'effects.kpUnsettled',
  'effects.disclaimer',
];

const FORBIDDEN_EN = [
  /postpone/i, /surger/i, /pregnan/i, /should be careful/i, /storm intuition/i,
  /suppress/i, /has been shown to/i, /avoid intense/i, /keep your medication/i, /\d+\s?%/,
];

const enText = (): string[] => {
  const mag = MAGNETIC.en;
  return [
    mag.title, mag.subtitle, mag.sources,
    ...mag.sections.flatMap(s => [s.heading, s.body]),
    ...HEALTH_KEYS.map(k => LOCALES.en[k]),
  ];
};

describe('health wording — English source', () => {
  it('has all 16 languages loaded', () => {
    expect(LANGS).toHaveLength(16);
    expect(Object.keys(MAGNETIC).sort()).toEqual(LANGS);
  });

  it.each(FORBIDDEN_EN.map(re => [String(re), re] as const))('never says %s', (_name, re) => {
    const hits = enText().filter(t => re.test(t));
    expect(hits, `still matches: ${hits.map(h => h.slice(0, 80)).join(' | ')}`).toEqual([]);
  });

  it('mentions pacemakers only to say there is no evidence of an effect', () => {
    const sentences = enText().flatMap(t => t.split(/(?<=[.!?])\s+/)).filter(s => /pacemaker/i.test(s));
    for (const s of sentences) expect(s, s).toMatch(/no evidence/i);
  });
});

describe('health wording — every language', () => {
  it.each(LANGS)('%s: the unsourced "storm intuition" fact is gone', lang => {
    expect(LOCALES[lang]).not.toHaveProperty('mood.fact.intuition');
  });

  it.each(LANGS)('%s: the Mood facts carry no statistics', lang => {
    const facts = Object.entries(LOCALES[lang]).filter(([k]) => k.startsWith('mood.fact.'));
    expect(facts.length).toBeGreaterThan(0);
    for (const [k, v] of facts) expect(v, k).not.toMatch(/\d\s?%|%\s?\d/);
  });

  it.each(LANGS.filter(l => l !== 'en'))('%s: the disclaimer and the rewritten sections are translated, not copied from English', lang => {
    expect(LOCALES[lang]['effects.disclaimer']?.trim()).toBeTruthy();
    expect(LOCALES[lang]['effects.disclaimer']).not.toBe(LOCALES.en['effects.disclaimer']);
    // Section 1 (what a storm is) is untouched; 2-6 are the health sections.
    MAGNETIC[lang].sections.slice(1).forEach((s, i) => {
      expect(s.body, `${lang} section ${i + 2}`).not.toBe(MAGNETIC.en.sections[i + 1].body);
      expect(s.heading, `${lang} section ${i + 2}`).not.toBe(MAGNETIC.en.sections[i + 1].heading);
    });
  });

  it.each(LANGS)('%s: no health section is a bullet list of advice', lang => {
    // The old advice ("avoid exertion", "postpone surgeries") lived in • lists.
    MAGNETIC[lang].sections.slice(1).forEach((s, i) => {
      expect(s.body, `${lang} section ${i + 2}`).not.toContain('•');
    });
  });
});

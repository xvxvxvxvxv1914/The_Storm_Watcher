import { describe, it, expect } from 'vitest';

import faqEn from './faq/en';
import faqBg from './faq/bg';
import faqDe from './faq/de';
import faqEs from './faq/es';
import faqFr from './faq/fr';
import faqRu from './faq/ru';
import faqNo from './faq/no';
import faqSv from './faq/sv';
import faqDa from './faq/da';
import faqFi from './faq/fi';
import faqIs from './faq/is';
import faqPl from './faq/pl';
import faqUk from './faq/uk';
import faqKo from './faq/ko';
import faqZh from './faq/zh';
import faqJa from './faq/ja';

import magEn from './magnetic/en';
import magBg from './magnetic/bg';
import magDe from './magnetic/de';
import magEs from './magnetic/es';
import magFr from './magnetic/fr';
import magRu from './magnetic/ru';
import magNo from './magnetic/no';
import magSv from './magnetic/sv';
import magDa from './magnetic/da';
import magFi from './magnetic/fi';
import magIs from './magnetic/is';
import magPl from './magnetic/pl';
import magUk from './magnetic/uk';
import magKo from './magnetic/ko';
import magZh from './magnetic/zh';
import magJa from './magnetic/ja';

/**
 * Both content sets are consumed *positionally* — FAQ answers are mapped to
 * categories by index (`faqCategories` in src/pages/FAQ.tsx) and magnetic
 * sections to icons by index (`sectionMeta` in src/pages/MagneticEffects.tsx).
 * Since the translations live in 32 separate files, nothing else stops one from
 * drifting out of alignment; adding a question to en.ts alone would silently
 * shift every category label on the other 15 pages.
 */

const FAQ = { bg: faqBg, de: faqDe, es: faqEs, fr: faqFr, ru: faqRu, no: faqNo, sv: faqSv, da: faqDa, fi: faqFi, is: faqIs, pl: faqPl, uk: faqUk, ko: faqKo, zh: faqZh, ja: faqJa };
const MAG = { bg: magBg, de: magDe, es: magEs, fr: magFr, ru: magRu, no: magNo, sv: magSv, da: magDa, fi: magFi, is: magIs, pl: magPl, uk: magUk, ko: magKo, zh: magZh, ja: magJa };

// Length of the positional arrays in the pages. Bump these together with the
// page arrays when adding an entry — the failure is the reminder.
const FAQ_ITEM_COUNT = 22;
const MAGNETIC_SECTION_COUNT = 6;

describe('FAQ content — all 16 languages', () => {
  it(`en has ${FAQ_ITEM_COUNT} items (matches faqCategories in FAQ.tsx)`, () => {
    expect(faqEn.items).toHaveLength(FAQ_ITEM_COUNT);
  });

  const enCategoryKeys = Object.keys(faqEn.categories).sort();

  for (const [lang, content] of Object.entries(FAQ)) {
    it(`${lang}: same item count as en`, () => {
      expect(content.items).toHaveLength(faqEn.items.length);
    });

    it(`${lang}: same category keys as en`, () => {
      expect(Object.keys(content.categories).sort()).toEqual(enCategoryKeys);
    });

    it(`${lang}: no empty question, answer or subtitle`, () => {
      expect(content.subtitle.trim()).not.toBe('');
      content.items.forEach((item, i) => {
        expect(item.question.trim(), `${lang} item ${i} question is empty`).not.toBe('');
        expect(item.answer.trim(), `${lang} item ${i} answer is empty`).not.toBe('');
      });
    });
  }
});

describe('Magnetic effects content — all 16 languages', () => {
  it(`en has ${MAGNETIC_SECTION_COUNT} sections (matches sectionMeta in MagneticEffects.tsx)`, () => {
    expect(magEn.sections).toHaveLength(MAGNETIC_SECTION_COUNT);
  });

  for (const [lang, content] of Object.entries(MAG)) {
    it(`${lang}: same section count as en`, () => {
      expect(content.sections).toHaveLength(magEn.sections.length);
    });

    it(`${lang}: no empty heading, body, title or sources`, () => {
      expect(content.title.trim()).not.toBe('');
      expect(content.subtitle.trim()).not.toBe('');
      expect(content.sources.trim()).not.toBe('');
      content.sections.forEach((section, i) => {
        expect(section.heading.trim(), `${lang} section ${i} heading is empty`).not.toBe('');
        expect(section.body.trim(), `${lang} section ${i} body is empty`).not.toBe('');
      });
    });
  }
});

import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'what-is-solar-flare',
  title: 'What is a Solar Flare?',
  description: 'Solar flares are the most energetic explosions in our solar system. Learn what causes them, how they\'re classified, and whether they pose a danger to Earth.',
  date: '2025-06-07',
  readingTime: 5,
  category: 'solar',
  coverEmoji: '☀️',
  content: [
    {
      type: 'paragraph',
      text: 'A solar flare is a sudden, intense burst of radiation from the Sun\'s surface. In a matter of minutes, a powerful flare can release as much energy as a billion hydrogen bombs — all from a region smaller than Earth. These explosions are among the most energetic events in our solar system.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What Causes Solar Flares?',
    },
    {
      type: 'paragraph',
      text: 'Flares occur in active regions — areas where the Sun\'s magnetic field becomes intensely concentrated and twisted. When magnetic field lines cross and reconnect in a process called magnetic reconnection, the stored magnetic energy is explosively converted into kinetic energy, thermal energy, and radiation. The result is a brilliant flash of light across nearly the entire electromagnetic spectrum.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How Are Flares Classified?',
    },
    {
      type: 'paragraph',
      text: 'Solar flares are classified by their X-ray brightness in three main categories: C, M, and X. Each step up represents a 10-fold increase in energy output.',
    },
    {
      type: 'list',
      items: [
        'C-class: Minor flares, no significant effect on Earth. Occur frequently.',
        'M-class: Moderate flares. Can cause brief radio blackouts on the sunlit side of Earth. May produce minor radiation storms.',
        'X-class: Major flares. Strong radio blackouts, possible radiation storms, and often accompanied by coronal mass ejections. X10+ flares are rare but can be catastrophic.',
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'The largest flare ever recorded was the X28 event in November 2003 — so strong it saturated the measuring instruments. The actual intensity was estimated to be even higher.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Flares vs. CMEs: What\'s the Difference?',
    },
    {
      type: 'paragraph',
      text: 'A solar flare and a coronal mass ejection (CME) are related but distinct events. The flare is pure radiation — electromagnetic energy that travels at the speed of light and reaches Earth in about 8 minutes. A CME is a physical cloud of magnetized plasma that takes 1–3 days to reach Earth. Most major flares are accompanied by a CME, but not all CMEs produce visible flares.',
    },
    {
      type: 'paragraph',
      text: 'For aurora hunters, the CME matters more than the flare — it\'s the CME that triggers geomagnetic storms. A flare without a CME produces no aurora.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What Happens When a Flare Hits Earth?',
    },
    {
      type: 'list',
      items: [
        'Radio blackouts: X-ray radiation ionises the upper atmosphere, absorbing HF radio signals on the sunlit side of Earth',
        'GPS errors: Increased ionospheric ionisation degrades GPS accuracy by metres to tens of metres',
        'Radiation dose increase: Aircrew and passengers on polar routes receive elevated radiation doses',
        'Aurora (if accompanied by a CME): 1–3 days later, not from the flare itself',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'Are Solar Flares Dangerous?',
    },
    {
      type: 'paragraph',
      text: 'For most people on the ground, solar flares pose no direct danger — Earth\'s atmosphere and magnetic field absorb the radiation. The risks are primarily to satellites, power infrastructure, and aviation. However, astronauts in space need to shelter in radiation-hardened modules during major flare events.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'The Storm Watcher tracks NOAA\'s DONKI system for real-time solar flare and CME alerts. When a significant CME is directed toward Earth, you\'ll get notified 1–3 days before the aurora arrives.',
    },
  ],
};

export default post;

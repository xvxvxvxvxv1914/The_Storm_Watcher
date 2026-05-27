import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'how-to-see-northern-lights',
  title: 'How to See the Northern Lights: A Practical Guide',
  description: 'Everything you need to know to see the aurora borealis — best locations, ideal conditions, timing, and gear. Stop missing the lights.',
  date: '2025-06-03',
  readingTime: 7,
  category: 'aurora',
  coverEmoji: '🌌',
  content: [
    {
      type: 'paragraph',
      text: 'Seeing the northern lights for the first time is a life-changing experience. But too many people travel thousands of kilometres and miss them entirely — not because of bad luck, but because of a few avoidable mistakes. This guide will make sure you\'re in the right place, at the right time, under the right conditions.',
    },
    {
      type: 'heading',
      level: 2,
      text: '1. Go to the Right Latitude',
    },
    {
      type: 'paragraph',
      text: 'Aurora is most reliably visible between 65° and 72° north latitude — the "auroral oval." This band runs through northern Norway (Tromsø), Iceland (Reykjavik), northern Finland (Rovaniemi), northern Sweden (Abisko), and northern Canada (Whitehorse, Yellowknife).',
    },
    {
      type: 'paragraph',
      text: 'During strong storms (Kp 5+), the oval expands southward, bringing aurora to Scotland, the Baltic states, and even central Europe. But if you\'re specifically travelling to see aurora, don\'t rely on storms — go to Scandinavia.',
    },
    {
      type: 'heading',
      level: 2,
      text: '2. Choose the Right Season',
    },
    {
      type: 'list',
      items: [
        'Best months: September, October, February, March (equinox effect boosts activity)',
        'Avoid: June and July — nights are too short or non-existent at high latitudes (midnight sun)',
        'December and January: Long dark nights but very cold; aurora is frequent but often blocked by clouds',
        'Equinox bonus: Earth\'s magnetic field is more susceptible around the March and September equinoxes, producing more storms on average',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '3. Check the Forecast — Seriously',
    },
    {
      type: 'paragraph',
      text: 'The single biggest mistake aurora hunters make is not checking the forecast. Kp 2 on a cloudy night is worthless. Kp 6 with a clear sky is unforgettable. You need two things to align: geomagnetic activity AND clear skies.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'The Storm Watcher combines Kp forecasts with cloud cover data for your exact location. One glance tells you whether tonight is worth going outside.',
    },
    {
      type: 'heading',
      level: 2,
      text: '4. Get Away from Light Pollution',
    },
    {
      type: 'paragraph',
      text: 'Even a faint aurora can be spectacular in a dark sky. The same display is invisible from a city centre. Drive 30–60 minutes from any town, find a flat horizon looking north, and turn off all nearby lights. Your eyes need 20 minutes to fully dark-adapt.',
    },
    {
      type: 'heading',
      level: 2,
      text: '5. Know What You\'re Looking For',
    },
    {
      type: 'paragraph',
      text: 'Weak aurora looks like a faint greenish smudge on the northern horizon — almost like a cloud that glows slightly. Many first-timers walk right past it. As activity increases, it develops into visible rays, curtains, and dancing arcs. At peak activity, the entire sky can be filled with rapidly moving green, purple, and red light.',
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'Your camera sees aurora much better than your eyes. Even a faint display will photograph beautifully with a 5–10 second exposure at ISO 1600. Don\'t give up just because it looks dull to your naked eye.',
    },
    {
      type: 'heading',
      level: 2,
      text: '6. What Gear Do You Need?',
    },
    {
      type: 'list',
      items: [
        'Warm layered clothing — temperatures at aurora latitudes drop to -20°C in winter',
        'Smartphone with a good night mode (modern iPhones and Androids shoot aurora well)',
        'A tripod or flat surface for longer exposures',
        'The Storm Watcher app for live Kp alerts',
        'Patience — aurora doesn\'t run on a schedule',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '7. The Solar Cycle Advantage',
    },
    {
      type: 'paragraph',
      text: 'We are currently near Solar Cycle 25\'s peak (solar maximum), which is expected around 2025. This is the best time in a decade to see aurora — geomagnetic storm frequency is at its highest, and G4–G5 events that bring aurora to central Europe are happening multiple times per year.',
    },
  ],
};

export default post;

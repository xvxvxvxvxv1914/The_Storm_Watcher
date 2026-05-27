import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'g1-to-g5-storm-levels',
  title: 'G1 to G5: Understanding Geomagnetic Storm Levels',
  description: 'NOAA\'s G-scale classifies geomagnetic storms from G1 (minor) to G5 (extreme). Here\'s exactly what each level means for aurora, technology, and daily life.',
  date: '2025-06-05',
  readingTime: 5,
  category: 'space-weather',
  coverEmoji: '⚡',
  content: [
    {
      type: 'paragraph',
      text: 'NOAA uses a five-level scale — G1 through G5 — to classify the severity of geomagnetic storms. Each level has specific thresholds, predictable aurora visibility ranges, and real-world impacts on technology. Here\'s everything you need to know.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G1 — Minor Storm (Kp 5)',
    },
    {
      type: 'paragraph',
      text: 'G1 storms are the most common, occurring roughly 1,700 times per 11-year solar cycle. They cause minor fluctuations in power grids and have a small impact on satellite operations. Aurora is visible from northern Scandinavia, Iceland, and northern Canada.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G2 — Moderate Storm (Kp 6)',
    },
    {
      type: 'paragraph',
      text: 'G2 storms occur about 600 times per solar cycle. High-latitude power systems may experience voltage alarms, and some HF radio propagation is affected. Aurora extends down to roughly 55°N — visible from Scotland, southern Scandinavia, and the northern Baltic states.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G3 — Strong Storm (Kp 7)',
    },
    {
      type: 'paragraph',
      text: 'G3 storms happen about 200 times per solar cycle. Voltage corrections may be required in power systems, satellite drag increases, and GPS accuracy degrades. Aurora is visible at 50°N — northern France, Germany, Poland, and the northern United States.',
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'A G3 storm in October 2024 produced aurora visible across central Europe, including reports from Spain and Italy. These events are becoming more frequent as we approach solar maximum.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G4 — Severe Storm (Kp 8)',
    },
    {
      type: 'paragraph',
      text: 'G4 storms occur only about 100 times per solar cycle. Widespread power grid voltage control issues, possible blackouts in some areas, satellite navigation errors, and surface charging on spacecraft. Aurora is visible down to 45°N — covering most of Europe and the continental United States.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G5 — Extreme Storm (Kp 9)',
    },
    {
      type: 'paragraph',
      text: 'G5 storms are rare — only about 4 per solar cycle. At this level, power grid systems can experience complete collapse, transformers may be permanently damaged, satellite navigation and HF radio fail across large areas, and aurora can be seen as far south as the tropics.',
    },
    {
      type: 'callout',
      variant: 'warning',
      text: 'The most extreme G5 event on record was the Carrington Event of 1859, which induced currents so powerful that telegraph operators received electric shocks and papers ignited spontaneously. A similar event today would cause trillions in damage.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Aurora Visibility by Storm Level',
    },
    {
      type: 'list',
      items: [
        'G1: Above 65°N (northern Lapland, northern Iceland)',
        'G2: Above 55°N (Scotland, southern Scandinavia)',
        'G3: Above 50°N (northern France, Poland, central Canada)',
        'G4: Above 45°N (most of Europe, northern USA)',
        'G5: Above 40°N (Mediterranean, southern USA, northern China)',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'How to Get Alerted',
    },
    {
      type: 'paragraph',
      text: 'The Storm Watcher monitors the Kp index in real time and sends push notifications the moment a storm begins. You can set your own Kp threshold — get alerted at G1 if you\'re in northern Norway, or only at G3 if you\'re in central Europe.',
    },
  ],
};

export default post;

import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'what-is-kp-index',
  title: 'What is the Kp Index? A Complete Guide',
  description: 'The Kp index is the most important number in space weather. Learn what it means, how it\'s measured, and why it matters for aurora visibility.',
  date: '2025-06-01',
  readingTime: 6,
  category: 'space-weather',
  coverEmoji: '📊',
  content: [
    {
      type: 'paragraph',
      text: 'If you\'ve ever looked up aurora forecasts, you\'ve seen a number called the "Kp index." It\'s the single most important metric in space weather — a global snapshot of how disturbed Earth\'s magnetic field is at any given moment.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What Does Kp Mean?',
    },
    {
      type: 'paragraph',
      text: 'Kp stands for "Planetarische Kennziffer" — German for "planetary index." It was developed by German scientist Julius Bartels in 1949. The index ranges from 0 to 9, where 0 means Earth\'s magnetic field is completely quiet and 9 means an extreme geomagnetic storm is occurring.',
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'The "K" in Kp comes from the German word "Kennziffer" (index number), and the "p" stands for "planetary" — meaning it represents conditions across the entire planet, not just one location.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'The Kp Scale Explained',
    },
    {
      type: 'list',
      items: [
        'Kp 0–1: Quiet. No aurora visible except at the poles.',
        'Kp 2–3: Unsettled. Aurora possible above 65°N latitude.',
        'Kp 4: Active. Aurora visible above 60°N (northern Scandinavia, Iceland).',
        'Kp 5 (G1): Minor storm. Aurora may reach 55°N (Scotland, southern Scandinavia).',
        'Kp 6 (G2): Moderate storm. Aurora visible down to 50°N (northern Germany, southern England).',
        'Kp 7 (G3): Strong storm. Aurora reaches 45°N (northern France, central Europe).',
        'Kp 8 (G4): Severe storm. Aurora visible across most of Europe.',
        'Kp 9 (G5): Extreme storm. Aurora seen as far south as the Mediterranean.',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'How Is Kp Measured?',
    },
    {
      type: 'paragraph',
      text: 'The Kp index is calculated from magnetometer readings at 13 geomagnetic observatories located between 44° and 60° geographic latitude. Each station measures variations in Earth\'s magnetic field over 3-hour intervals. These individual K-indices are then averaged and standardized to produce the global Kp value.',
    },
    {
      type: 'paragraph',
      text: 'The measurements are updated every 3 hours by NOAA\'s Space Weather Prediction Center (SWPC). However, estimated real-time Kp values (called "Kp estimated") are available every minute, giving aurora hunters a near-live view of current conditions.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Kp vs. G-Scale: What\'s the Difference?',
    },
    {
      type: 'paragraph',
      text: 'You\'ll often see both "Kp 5" and "G1" used interchangeably. The G-scale (G1–G5) is NOAA\'s public-friendly version of the Kp index, designed to communicate storm severity to the general public. The mapping is straightforward:',
    },
    {
      type: 'list',
      items: [
        'Kp 5 = G1 (Minor storm)',
        'Kp 6 = G2 (Moderate storm)',
        'Kp 7 = G3 (Strong storm)',
        'Kp 8 = G4 (Severe storm)',
        'Kp 9 = G5 (Extreme storm)',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'Why Does Kp Matter for Aurora Visibility?',
    },
    {
      type: 'paragraph',
      text: 'The Kp index directly determines how far from the poles the aurora oval expands. During quiet conditions (Kp 1–2), the aurora is confined to a narrow band around the Arctic and Antarctic circles. As Kp rises, this oval pushes toward the equator, making the northern lights visible at progressively lower latitudes.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'Rule of thumb: subtract your latitude from 90 to get the minimum Kp needed to see aurora overhead. At 55°N (Edinburgh), you need roughly Kp 5 or higher for a good display.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How to Track Kp in Real Time',
    },
    {
      type: 'paragraph',
      text: 'The Storm Watcher provides live Kp index updates, 3-day forecasts, and instant push notifications when Kp crosses your personal threshold. Set your alert level once and never miss a storm — whether you\'re in Finland or France.',
    },
  ],
};

export default post;

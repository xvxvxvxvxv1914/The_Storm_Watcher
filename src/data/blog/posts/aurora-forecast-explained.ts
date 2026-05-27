import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'aurora-forecast-explained',
  title: 'Aurora Forecast Explained: How to Read Space Weather Data',
  description: 'Aurora forecasts are full of jargon — Kp, Bz, solar wind speed, OVATION. This guide explains each number and how to interpret them together.',
  date: '2025-06-08',
  readingTime: 6,
  category: 'guide',
  coverEmoji: '🔭',
  content: [
    {
      type: 'paragraph',
      text: 'Reading an aurora forecast for the first time can feel like learning a new language. Kp indices, Bz values, solar wind speeds, OVATION probabilities — it\'s a lot. This guide breaks down each piece of data and shows you how to combine them into a simple yes/no answer: will there be aurora tonight?',
    },
    {
      type: 'heading',
      level: 2,
      text: 'The Four Key Numbers',
    },
    {
      type: 'heading',
      level: 3,
      text: '1. Kp Index (0–9)',
    },
    {
      type: 'paragraph',
      text: 'The Kp index is your headline number. It tells you how active Earth\'s magnetic field is globally right now. Kp 0–2 = quiet. Kp 3–4 = active. Kp 5+ = storm. At your latitude, look up the minimum Kp needed for aurora overhead — typically Kp 3 for 65°N, Kp 5 for 55°N, Kp 7 for 45°N.',
    },
    {
      type: 'heading',
      level: 3,
      text: '2. Bz (Magnetic Field Orientation)',
    },
    {
      type: 'paragraph',
      text: 'Bz is arguably more important than Kp in real time. It measures the north-south component of the interplanetary magnetic field. When Bz goes negative (southward), it couples with Earth\'s field and drives geomagnetic activity. The more negative, the stronger the effect.',
    },
    {
      type: 'list',
      items: [
        'Bz > 0 (northward): Magnetic shield intact, aurora suppressed',
        'Bz -5 to -10: Mild coupling, Kp likely to rise',
        'Bz -10 to -20: Strong coupling, expect Kp 5–7',
        'Bz < -20: Extreme coupling, G3–G5 storm territory',
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '3. Solar Wind Speed (km/s)',
    },
    {
      type: 'paragraph',
      text: 'Solar wind speed amplifies everything. Fast wind (600+ km/s) compresses the magnetosphere harder and increases coupling efficiency. A modest Bz of -8 with 700 km/s wind will drive more activity than Bz -8 with 400 km/s wind. Normal background speed is 350–450 km/s.',
    },
    {
      type: 'heading',
      level: 3,
      text: '4. OVATION Aurora Probability',
    },
    {
      type: 'paragraph',
      text: 'OVATION is NOAA\'s model that converts solar wind data into a probability map of aurora intensity at each latitude. It updates every minute and shows where aurora is most likely in the next 30–90 minutes. A probability above 20% at your location is worth going outside for.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How to Read Them Together',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'Green light checklist: Kp ≥ your threshold AND Bz negative AND wind speed rising AND OVATION probability > 10% at your latitude AND sky clear. All five? Go outside now.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'The 3-Day Forecast vs. Real-Time Data',
    },
    {
      type: 'paragraph',
      text: 'The 3-day forecast is useful for planning — if NOAA predicts a G2 storm in 48 hours, book your trip to dark skies. But the 3-day forecast is based on observed CME activity, not the actual solar wind data. It can be off by 12+ hours. Once you\'re within 1 hour of potential aurora, switch to real-time Kp and Bz data.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Cloud Cover: The Overlooked Variable',
    },
    {
      type: 'paragraph',
      text: 'A Kp 8 storm behind thick cloud cover is invisible. Always check local cloud cover alongside space weather data. The Storm Watcher combines both: live Kp and solar wind data alongside cloud percentage for your exact location, so you know whether to drive to clearer skies.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'When to Trust the Forecast',
    },
    {
      type: 'list',
      items: [
        '3 days out: Only trust G3+ predictions based on confirmed Earth-directed CMEs',
        '24 hours out: G1–G2 predictions become more reliable as solar wind approaches',
        '1 hour out: Real-time Bz and Kp are your most reliable indicators',
        'Right now: OVATION probability gives the best 30-minute outlook',
      ],
    },
  ],
};

export default post;

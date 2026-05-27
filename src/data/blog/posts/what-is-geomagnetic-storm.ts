import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'what-is-geomagnetic-storm',
  title: 'What is a Geomagnetic Storm?',
  description: 'Geomagnetic storms are disturbances in Earth\'s magnetic field caused by solar activity. Learn how they form, their effects, and how to prepare.',
  date: '2025-06-02',
  readingTime: 5,
  category: 'space-weather',
  coverEmoji: '🌍',
  content: [
    {
      type: 'paragraph',
      text: 'A geomagnetic storm is a temporary but intense disturbance of Earth\'s magnetosphere — the protective magnetic bubble surrounding our planet. These storms are triggered by solar activity and can last anywhere from a few hours to several days.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What Causes a Geomagnetic Storm?',
    },
    {
      type: 'paragraph',
      text: 'The Sun constantly emits a stream of charged particles called the solar wind. Usually, Earth\'s magnetic field deflects this stream harmlessly around the planet. However, when the Sun releases a powerful burst of energy — through a solar flare or a coronal mass ejection (CME) — a much denser, faster cloud of plasma slams into Earth\'s magnetosphere.',
    },
    {
      type: 'paragraph',
      text: 'If the magnetic field of this solar cloud points southward (opposite to Earth\'s northward field), it reconnects with Earth\'s field in a process called magnetic reconnection. This dumps enormous energy into the magnetosphere, triggering the storm.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'The Three Phases of a Storm',
    },
    {
      type: 'list',
      items: [
        'Sudden commencement: The solar wind shock wave arrives, causing a sudden jump in magnetic field strength. This can happen within minutes of CME arrival.',
        'Main phase: The storm intensifies as energy pours into the ring current — a belt of charged particles circling Earth. Kp rises rapidly, sometimes reaching G4 or G5.',
        'Recovery phase: Earth\'s magnetic field slowly returns to normal over 1–3 days as the excess energy dissipates.',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'Storm Intensity: The G-Scale',
    },
    {
      type: 'paragraph',
      text: 'NOAA classifies geomagnetic storms on a five-level G-scale, from G1 (minor) to G5 (extreme). G1 storms occur roughly 1,700 times per solar cycle. G5 storms — like the famous Carrington Event of 1859 or the May 2024 storm — happen only a few times per century.',
    },
    {
      type: 'callout',
      variant: 'warning',
      text: 'The May 2024 storm reached G5 — the highest level — and produced aurora visible across southern Europe, the United States, and even parts of Mexico. It was the strongest storm in 20 years.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Real-World Effects of Geomagnetic Storms',
    },
    {
      type: 'list',
      items: [
        'Aurora borealis / australis visible at unusually low latitudes',
        'Disruption to HF radio communications and GPS accuracy',
        'Induced currents in power grids (major storms can cause blackouts)',
        'Increased drag on satellites in low Earth orbit',
        'Pipeline corrosion from geomagnetically induced currents',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'Can We Predict Geomagnetic Storms?',
    },
    {
      type: 'paragraph',
      text: 'With current technology, we can predict storms 1–3 days in advance when a CME is observed leaving the Sun. The exact intensity and timing become clearer only when the solar wind reaches the DSCOVR satellite, about 1.5 million km from Earth — giving roughly 15–60 minutes of advance warning.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'The Storm Watcher monitors real-time solar wind data from NOAA and sends instant alerts the moment a storm begins. Enable notifications to get warned before the aurora peaks.',
    },
  ],
};

export default post;

import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'what-is-solar-wind',
  title: 'What is Solar Wind and Why Does It Matter?',
  description: 'Solar wind is a constant stream of particles from the Sun that drives space weather on Earth. Learn how it works and what the numbers mean.',
  date: '2025-06-04',
  readingTime: 5,
  category: 'solar',
  coverEmoji: '💨',
  content: [
    {
      type: 'paragraph',
      text: 'The Sun isn\'t just a ball of light — it\'s constantly exhaling. A continuous stream of charged particles flows outward from the Sun in all directions at speeds of 400–800 km/s. This is the solar wind, and it shapes the space environment of every planet in our solar system, including Earth.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What Is Solar Wind Made Of?',
    },
    {
      type: 'paragraph',
      text: 'Solar wind is a plasma — a mix of electrons, protons, and alpha particles (helium nuclei) that have escaped the Sun\'s corona. The corona is the Sun\'s outermost atmospheric layer, and it\'s so hot (over 1 million °C) that particles achieve escape velocity and stream outward into space.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Key Solar Wind Parameters',
    },
    {
      type: 'list',
      items: [
        'Speed (km/s): Typical values range from 300–800 km/s. Faster wind compresses Earth\'s magnetosphere more strongly.',
        'Density (particles/cm³): Higher density means more particles hitting Earth\'s field. Normal is 5–10 p/cm³.',
        'Bz (magnetic field component): The most critical parameter. When Bz points south (negative), energy couples into Earth\'s magnetosphere and storms develop.',
        'Bt (total magnetic field): Overall magnetic field strength of the solar wind.',
      ],
    },
    {
      type: 'callout',
      variant: 'warning',
      text: 'Watch for negative Bz values! A strongly negative Bz (below -10 nT) sustained for hours is the clearest sign a geomagnetic storm is underway or imminent. This single parameter is more predictive of aurora than any other.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How Does Solar Wind Affect Earth?',
    },
    {
      type: 'paragraph',
      text: 'Earth\'s magnetic field acts as a shield against the solar wind, deflecting most of the stream around the planet. The region where this interaction occurs is called the magnetosphere. During quiet periods, this shield holds firm. But when an unusually fast or dense pulse of solar wind arrives — especially carrying a southward magnetic field — the shield bends and partially breaks down.',
    },
    {
      type: 'paragraph',
      text: 'This allows charged particles to funnel down along magnetic field lines near the poles, where they collide with atmospheric gases. Those collisions release energy as light — the aurora.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How Is Solar Wind Measured?',
    },
    {
      type: 'paragraph',
      text: 'NASA\'s DSCOVR satellite sits at the L1 Lagrange point — a gravitational balance point about 1.5 million km between Earth and Sun. From there, it measures solar wind in real time, giving 15–60 minutes of warning before conditions hit Earth.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'The Storm Watcher displays live solar wind speed, density, and Bz on the Dashboard. When speed exceeds 600 km/s and Bz dips below -10, that\'s your cue to look outside.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Solar Wind vs. Coronal Mass Ejection',
    },
    {
      type: 'paragraph',
      text: 'The steady solar wind is different from a coronal mass ejection (CME). The solar wind is constant background radiation. A CME is a sudden, massive eruption — a billion-tonne cloud of magnetized plasma ejected at 1,000–3,000 km/s. CMEs are what cause the most powerful geomagnetic storms.',
    },
  ],
};

export default post;

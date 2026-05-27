import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'space-weather-effects-on-earth',
  title: 'Space Weather and Its Effects on Earth',
  description: 'Space weather affects power grids, satellites, GPS, aviation, and more. Here\'s how solar activity shapes modern technology and everyday life.',
  date: '2025-06-09',
  readingTime: 6,
  category: 'space-weather',
  coverEmoji: '🛸',
  content: [
    {
      type: 'paragraph',
      text: 'Most people think of space as empty and distant. But the Sun\'s activity reaches Earth every day, quietly influencing technology we rely on — and occasionally, during major storms, causing real disruption. Space weather is not just a scientific curiosity; it\'s a genuine infrastructure risk.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Power Grids',
    },
    {
      type: 'paragraph',
      text: 'Geomagnetic storms induce electric currents in long conductive structures — including power transmission lines and pipelines. These geomagnetically induced currents (GICs) can overload transformers and cause regional blackouts. The most famous example is the 1989 Quebec blackout, when a G5 storm left 6 million people without power for 9 hours. Modern grids are more vulnerable than 1989 because they\'re more interconnected.',
    },
    {
      type: 'callout',
      variant: 'warning',
      text: 'A repeat of the 1859 Carrington Event (G5 extreme) today is estimated to cause $1–2 trillion in damage to North American power infrastructure alone, with recovery taking months to years.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Satellites',
    },
    {
      type: 'paragraph',
      text: 'Satellites face multiple threats from space weather. Increased atmospheric density from solar heating causes additional drag on low-Earth-orbit satellites, lowering their orbit faster than planned. During the May 2024 G5 storm, SpaceX reported concerns about its Starlink constellation. High-energy particles can also damage solar panels and electronic components over time.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'GPS and Navigation',
    },
    {
      type: 'paragraph',
      text: 'GPS accuracy depends on radio signals passing through the ionosphere — the electrically charged upper atmosphere. Solar activity increases ionospheric disturbance, causing signals to bend, scatter, and arrive late. During major storms, GPS errors can reach 10–50 metres for civilian receivers. Aviation, surveying, and precision agriculture all suffer.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Aviation',
    },
    {
      type: 'paragraph',
      text: 'Polar routes — the great circle flights between Europe and North America or Asia — pass through regions of intense space weather effects. During major solar events, airlines reroute flights away from polar regions to avoid HF radio blackouts (which affect safety communications), radiation exposure to crew and passengers, and GPS degradation. Rerouting adds fuel cost and flight time.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'HF Radio Communications',
    },
    {
      type: 'paragraph',
      text: 'High-frequency radio waves bounce off the ionosphere to achieve long-distance communication without satellites. During solar flares and storms, the ionosphere absorbs rather than reflects these waves, causing radio blackouts that affect maritime communication, aviation, and amateur radio operators. Polar regions are hit hardest.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Pipelines',
    },
    {
      type: 'paragraph',
      text: 'Long metal pipelines — like the Trans-Alaska Pipeline — act as antennas for geomagnetically induced currents. These currents accelerate corrosion and can interfere with the cathodic protection systems designed to prevent it. The oil and gas industry actively monitors space weather for this reason.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'The Positive Side: Aurora',
    },
    {
      type: 'paragraph',
      text: 'Not all space weather effects are negative. The same energy that disrupts power grids and satellites produces one of Earth\'s most spectacular natural phenomena. The aurora borealis and aurora australis are direct visual manifestations of solar wind energy dissipating in Earth\'s upper atmosphere. During the May 2024 G5 storm, millions of people across Europe and North America witnessed aurora for the first time.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'The Storm Watcher tracks all space weather parameters in real time and sends alerts for both storm warnings and aurora opportunities — so you\'re always the first to know.',
    },
  ],
};

export default post;

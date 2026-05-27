import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'what-is-iss-how-to-track',
  title: 'What is the ISS and How to Track It',
  description: 'The International Space Station is the brightest object in the night sky after the Moon. Learn what it is, how to spot it, and how to track it in real time.',
  date: '2025-06-10',
  readingTime: 5,
  category: 'guide',
  coverEmoji: '🛰️',
  content: [
    {
      type: 'paragraph',
      text: 'On any clear night, if you know where to look and when, you can spot a bright star-like object moving steadily across the sky. No flashing lights, no sound — just a steady, bright dot travelling from horizon to horizon in about 6 minutes. That\'s the International Space Station, and it\'s the largest structure humanity has ever built in space.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What is the ISS?',
    },
    {
      type: 'paragraph',
      text: 'The International Space Station is a modular space laboratory orbiting Earth at approximately 400 km altitude. It has been continuously inhabited since November 2000, making it the longest continuous human presence in space. The station is roughly the size of a football pitch, masses 420 tonnes, and travels at 28,000 km/h — completing an orbit of Earth every 90 minutes.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Who Lives on the ISS?',
    },
    {
      type: 'paragraph',
      text: 'The ISS typically hosts 6–7 crew members from partner agencies including NASA (USA), Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada). Crew rotations happen roughly every 6 months, with astronauts arriving via SpaceX Crew Dragon or Russian Soyuz spacecraft.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Why is the ISS So Bright?',
    },
    {
      type: 'paragraph',
      text: 'The ISS is visible to the naked eye because of its enormous solar panels — 8 arrays spanning 73 metres from tip to tip. These panels reflect sunlight like a giant mirror. At its brightest, the ISS reaches magnitude -5.9, outshining Venus and second only to the Moon in the night sky.',
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'The ISS is only visible when it\'s in sunlight while your location is in darkness — typically within 1–2 hours of sunset or sunrise. In the middle of the night, it passes through Earth\'s shadow and becomes invisible.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How to Spot the ISS',
    },
    {
      type: 'list',
      items: [
        'Find the next visible pass for your location using The Storm Watcher\'s ISS tracker',
        'Go outside 5 minutes before the predicted time',
        'Face the direction shown (usually west or southwest for evening passes)',
        'Look for a bright, steady light moving faster than any aircraft',
        'It will travel all the way across the sky in 3–6 minutes',
        'No binoculars needed — naked eye is fine',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'ISS and Aurora: A Perfect Combination',
    },
    {
      type: 'paragraph',
      text: 'One of the most spectacular sights in space photography is astronauts photographing aurora from above — looking down at the same light display aurora hunters see from the ground. During geomagnetic storms, ISS crew members have an unparalleled view of the aurora oval encircling both poles.',
    },
    {
      type: 'paragraph',
      text: 'If you\'re already outside watching aurora, check if the ISS is making a pass. The two phenomena together — a geomagnetic storm painting the sky green while the ISS slides silently overhead — is an unforgettable experience.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'The Storm Watcher\'s ISS page shows real-time position and upcoming visible passes for your location, alongside current aurora probability. Plan the perfect night outside.',
    },
  ],
};

export default post;

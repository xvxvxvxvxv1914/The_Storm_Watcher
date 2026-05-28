import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://www.thestormwatcher.com';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
}

// Inline post data — avoids importing TS modules with complex types at edge runtime
const POSTS: BlogPost[] = [
  { slug: 'what-is-kp-index',            title: 'What is the Kp Index? A Complete Guide',                   description: 'The Kp index is the most important number in space weather. Learn what it means, how it\'s measured, and why it matters for aurora visibility.', date: '2026-02-15', category: 'space-weather' },
  { slug: 'what-is-geomagnetic-storm',   title: 'What is a Geomagnetic Storm?',                             description: 'Geomagnetic storms are disturbances in Earth\'s magnetosphere. Discover what causes them and how to predict them.', date: '2026-02-22', category: 'space-weather' },
  { slug: 'how-to-see-northern-lights',  title: 'How to See the Northern Lights: A Complete Guide',          description: 'Aurora watching tips, best locations, and what conditions you need for a spectacular northern lights display.', date: '2026-03-05', category: 'aurora' },
  { slug: 'what-is-solar-wind',          title: 'What is Solar Wind and Why Does It Matter?',                description: 'Solar wind is a stream of charged particles from the Sun. Learn how it drives space weather and affects Earth.', date: '2026-03-12', category: 'solar' },
  { slug: 'g1-to-g5-storm-levels',       title: 'G1 to G5: Understanding NOAA Storm Scale',                 description: 'The NOAA geomagnetic storm scale explained — from minor G1 disturbances to extreme G5 events.', date: '2026-03-20', category: 'space-weather' },
  { slug: 'best-places-aurora-europe',   title: 'Best Places to See the Aurora in Europe',                   description: 'From Norway to Iceland, discover the best European destinations for northern lights viewing.', date: '2026-03-28', category: 'aurora' },
  { slug: 'what-is-solar-flare',         title: 'What is a Solar Flare?',                                    description: 'Solar flares are intense bursts of radiation from the Sun. Learn about X, M, C class flares and their effects.', date: '2026-04-08', category: 'solar' },
  { slug: 'aurora-forecast-explained',   title: 'How Aurora Forecasts Work',                                  description: 'Behind the scenes of aurora forecasting — Kp predictions, OVATION models, and what they mean for your viewing chances.', date: '2026-04-15', category: 'aurora' },
  { slug: 'space-weather-effects-on-earth', title: 'How Space Weather Affects Earth',                        description: 'Space weather impacts power grids, satellites, GPS, and even human health. Here\'s what you need to know.', date: '2026-04-24', category: 'space-weather' },
  { slug: 'what-is-iss',                 title: 'What is the International Space Station?',                   description: 'Everything you need to know about the ISS — how to track it, when to spot it, and what happens aboard.', date: '2026-05-06', category: 'guide' },
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const lastBuildDate = new Date(POSTS[0].date).toUTCString();

  const items = POSTS.map(post => `
  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${BASE_URL}/blog/${post.slug}</link>
    <description>${escapeXml(post.description)}</description>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <guid isPermaLink="true">${BASE_URL}/blog/${post.slug}</guid>
    <category>${escapeXml(post.category)}</category>
  </item>`).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Storm Watcher Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Space weather explained — aurora forecasting, solar activity, geomagnetic storms, and more.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/og-image.webp</url>
      <title>The Storm Watcher Blog</title>
      <link>${BASE_URL}/blog</link>
    </image>
${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(rss);
}

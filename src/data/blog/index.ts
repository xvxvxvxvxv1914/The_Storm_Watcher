import type { BlogPost } from './types';
import whatIsKpIndex from './posts/what-is-kp-index';
import whatIsGeomagneticStorm from './posts/what-is-geomagnetic-storm';
import howToSeeNorthernLights from './posts/how-to-see-northern-lights';
import whatIsSolarWind from './posts/what-is-solar-wind';
import g1ToG5StormLevels from './posts/g1-to-g5-storm-levels';
import bestPlacesAuroraEurope from './posts/best-places-aurora-europe';
import whatIsSolarFlare from './posts/what-is-solar-flare';
import auroraForecastExplained from './posts/aurora-forecast-explained';
import spaceWeatherEffectsOnEarth from './posts/space-weather-effects-on-earth';
import whatIsIss from './posts/what-is-iss';

export const blogPosts: BlogPost[] = [
  whatIsKpIndex,
  whatIsGeomagneticStorm,
  howToSeeNorthernLights,
  whatIsSolarWind,
  g1ToG5StormLevels,
  bestPlacesAuroraEurope,
  whatIsSolarFlare,
  auroraForecastExplained,
  spaceWeatherEffectsOnEarth,
  whatIsIss,
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getLocalizedBlogPost(slug: string, lang: string): BlogPost | undefined {
  const post = getBlogPost(slug);
  if (!post) return undefined;
  const t = post.translations?.[lang];
  if (!t) return post;
  return { ...post, title: t.title, description: t.description, content: t.content };
}

export function getLocalizedBlogList(lang: string): BlogPost[] {
  return blogPosts.map((post) => {
    const t = post.translations?.[lang];
    if (!t) return post;
    return { ...post, title: t.title, description: t.description, content: t.content };
  });
}

export const CATEGORY_LABELS: Record<BlogPost['category'], string> = {
  'space-weather': 'Space Weather',
  'aurora': 'Aurora',
  'solar': 'Solar Activity',
  'guide': 'Guide',
};

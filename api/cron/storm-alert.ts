import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);


function getGLevel(kp: number): number {
  if (kp >= 9) return 5;
  if (kp >= 8) return 4;
  if (kp >= 7) return 3;
  if (kp >= 6) return 2;
  if (kp >= 5) return 1;
  return 0;
}

const STORM_LABELS: Record<number, string> = {
  1: 'G1 — Minor',
  2: 'G2 — Moderate',
  3: 'G3 — Strong',
  4: 'G4 — Severe',
  5: 'G5 — Extreme',
};

const STORM_EMOJIS: Record<number, string> = {
  1: '🟢',
  2: '🟡',
  3: '🟠',
  4: '🔴',
  5: '🚨',
};

function buildTweet(kp: number, level: number): string {
  const label = STORM_LABELS[level];
  const emoji = STORM_EMOJIS[level];
  const appUrl = process.env.APP_URL ?? 'www.thestormwatcher.com';

  const auroraLine = kp >= 7
    ? '\n🌌 Aurora may be visible at latitudes above 50°N tonight.'
    : '\n🌌 Aurora may be visible at high latitudes (above 60°N).';

  return `${emoji} Geomagnetic Storm — ${label} (Kp ${kp.toFixed(1)})

Earth is experiencing a geomagnetic storm right now.${auroraLine}

Track live → ${appUrl}

#SpaceWeather #SolarStorm #Aurora #Kp${Math.floor(kp)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sets Authorization: Bearer {CRON_SECRET} automatically.
  // Manual test calls can still use ?secret= query param.
  const bearerToken = req.headers.authorization?.replace('Bearer ', '');
  const querySecret = req.query.secret as string | undefined;
  if (bearerToken !== process.env.CRON_SECRET && querySecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isTest = req.query.test === 'true';

  try {
    let currentKp: number;
    let level: number;

    if (isTest) {
      currentKp = 7.3;
      level = 3;
    } else {
      // Fetch real-time 1-minute Kp estimates from NOAA
      const response = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
      const entries: { time_tag: string; kp_index: number }[] = await response.json();

      const latest = entries[entries.length - 1];
      if (!latest) {
        return res.status(200).json({ message: 'No data' });
      }

      currentKp = latest.kp_index;
      level = getGLevel(currentKp);
    }

    if (level === 0) {
      return res.status(200).json({ message: `Quiet. Kp=${currentKp.toFixed(1)}` });
    }

    // Check last post — throttle to 4 hours unless storm is escalating
    const { data: lastPost } = await supabase
      .from('storm_posts')
      .select('kp, level, posted_at')
      .order('posted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fourHoursMs = 4 * 60 * 60 * 1000;
    const recentlyPosted = lastPost && (Date.now() - new Date(lastPost.posted_at).getTime()) < fourHoursMs;
    const stormEscalated = lastPost && level > lastPost.level;

    if (!isTest && recentlyPosted && !stormEscalated) {
      return res.status(200).json({
        message: `Throttled. Last post: ${lastPost!.posted_at}`,
      });
    }

    // Post to X
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_SECRET!,
    });

    const tweetText = buildTweet(currentKp, level);
    const { data: tweet } = await client.v2.tweet(tweetText);

    await supabase.from('storm_posts').insert({ kp: currentKp, level, tweet_id: tweet.id });

    console.log(`Storm alert posted: G${level} Kp=${currentKp} id=${tweet.id}`);
    return res.status(200).json({ posted: true, tweetId: tweet.id, kp: currentKp, level });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Storm alert cron error:', message);
    return res.status(500).json({ error: message });
  }
}

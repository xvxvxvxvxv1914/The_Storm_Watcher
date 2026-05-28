import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ALLOWED_ORIGINS = [
  'https://thestormwatcher.com',
  'https://www.thestormwatcher.com',
  ...(process.env.ALLOWED_DEV_ORIGIN ? [process.env.ALLOWED_DEV_ORIGIN] : []),
];

// In-memory rate limit: max 5 requests per user per minute
const portalRateLimit = new Map<string, { count: number; resetAt: number }>();

function isPortalRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = portalRateLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    portalRateLimit.set(userId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const origin = req.headers['origin'] as string | undefined ?? '';
  const returnBase = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://thestormwatcher.com';

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (isPortalRateLimited(user.id)) return res.status(429).json({ error: 'Too many requests' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: 'No active subscription found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${returnBase}/profile`,
  });

  res.status(200).json({ url: session.url });
}

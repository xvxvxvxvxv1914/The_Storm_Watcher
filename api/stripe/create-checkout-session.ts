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
  'http://localhost:5173',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const origin = req.headers['origin'] as string | undefined ?? '';
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const appUrl = origin;

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { priceId } = req.body as { priceId: string };
  if (!priceId) return res.status(400).json({ error: 'Missing priceId' });

  const ALLOWED_PRICES = new Set([
    'price_1TSJBmLqQEtEOCx4utzZ07gf', // Pro Monthly
    'price_1TSJGvLqQEtEOCx4VGsGFSyH', // Pro Yearly
    'price_1TSJHYLqQEtEOCx43ks9UAAc', // Premium Monthly
    'price_1TSJHtLqQEtEOCx4Q1RuknHo', // Premium Yearly
  ]);

  const PRO_PRICES = new Set([
    'price_1TSJBmLqQEtEOCx4utzZ07gf', // Pro Monthly
    'price_1TSJGvLqQEtEOCx4VGsGFSyH', // Pro Yearly
  ]);
  if (!ALLOWED_PRICES.has(priceId)) return res.status(400).json({ error: 'Invalid price' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  const isProTrial = PRO_PRICES.has(priceId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?payment=success`,
    cancel_url: `${appUrl}/pricing?payment=cancelled`,
    metadata: { supabase_user_id: user.id },
    // No card required upfront for Pro trials — charged only after 14 days
    ...(isProTrial ? { payment_method_collection: 'if_required' } : {}),
    subscription_data: {
      metadata: { supabase_user_id: user.id },
      ...(isProTrial ? {
        trial_period_days: 14,
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      } : {}),
    },
  }, {
    idempotencyKey: `checkout-${user.id}-${priceId}-${Math.floor(Date.now() / 60_000)}`,
  });

  res.status(200).json({ url: session.url });
}

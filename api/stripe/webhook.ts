import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PRICE_TO_PLAN: Record<string, 'pro' | 'premium'> = {
  price_1TSJBmLqQEtEOCx4utzZ07gf: 'pro',     // Pro Monthly €3.99
  price_1TSJGvLqQEtEOCx4VGsGFSyH: 'pro',     // Pro Yearly €35.99
  price_1TSJHYLqQEtEOCx43ks9UAAc: 'premium', // Premium Monthly €7.99
  price_1TSJHtLqQEtEOCx4Q1RuknHo: 'premium', // Premium Yearly €71.99
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'] as string;
  const rawBody = await getRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Deduplicate: insert-first pattern — primary key rejects replays
  const { error: dedupError } = await supabase
    .from('stripe_processed_events')
    .insert({ event_id: event.id });
  if (dedupError) {
    // Duplicate key = already processed; any other error = still safe to ack
    return res.status(200).json({ received: true });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0]?.price.id ?? '';
      const plan = PRICE_TO_PLAN[priceId] ?? 'free';

      const { error: updateError } = await supabase.from('profiles').update({
        plan,
        subscription_id: sub.id,
        subscription_status: sub.status,
        subscription_period_end: new Date(((sub as unknown as Record<string, number>)['current_period_end'] ?? 0) * 1000).toISOString(),
      }).eq('id', userId);
      if (updateError) {
        console.error('checkout.session.completed profile update failed', updateError, { userId, plan });
        return res.status(500).json({ error: 'DB update failed' });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;

      const priceId = sub.items.data[0]?.price.id ?? '';
      const plan = (sub.status === 'active' || sub.status === 'trialing') ? (PRICE_TO_PLAN[priceId] ?? 'free') : 'free';

      const { error: updateError } = await supabase.from('profiles').update({
        plan,
        subscription_status: sub.status,
        subscription_period_end: new Date(((sub as unknown as Record<string, number>)['current_period_end'] ?? 0) * 1000).toISOString(),
      }).eq('id', userId);
      if (updateError) {
        console.error('customer.subscription.updated profile update failed', updateError, { userId, plan });
        return res.status(500).json({ error: 'DB update failed' });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;

      const { error: updateError } = await supabase.from('profiles').update({
        plan: 'free',
        subscription_id: null,
        subscription_status: 'canceled',
        subscription_period_end: null,
      }).eq('id', userId);
      if (updateError) {
        console.error('customer.subscription.deleted profile update failed', updateError, { userId });
        return res.status(500).json({ error: 'DB update failed' });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as unknown as Record<string, unknown>)['subscription'] as string | null;
      if (!subId) break;

      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;

      const { error: updateError } = await supabase.from('profiles').update({
        subscription_status: sub.status,
      }).eq('id', userId);
      if (updateError) {
        console.error('invoice.payment_failed profile update failed', updateError, { userId });
        return res.status(500).json({ error: 'DB update failed' });
      }
      break;
    }
  }

  res.status(200).json({ received: true });
}

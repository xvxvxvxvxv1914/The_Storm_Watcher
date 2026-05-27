import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../lib/resend';
import { proActivatedEmail, paymentFailedEmail, subscriptionCancelledEmail, trialEndingEmail } from '../emails/templates';

async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

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

const MAX_BODY_BYTES = 1_048_576; // 1 MB

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { reject(new Error('Payload too large')); return; }
      chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'] as string;
  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch {
    return res.status(413).json({ error: 'Payload too large' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Deduplicate: check for duplicate key (23505); on transient DB errors, continue processing
  // (our profile updates are idempotent, so double-processing a retry is safe)
  const { error: dedupError } = await supabase
    .from('stripe_processed_events')
    .insert({ event_id: event.id });
  if (dedupError) {
    if (dedupError.code === '23505') {
      return res.status(200).json({ received: true });
    }
    // Transient error — log and proceed rather than silently losing the event
    console.error('Dedup insert failed (non-fatal):', dedupError);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0]?.price.id ?? '';
      const plan = PRICE_TO_PLAN[priceId] ?? 'free';

      const periodEnd = sub.items.data[0]?.current_period_end;
      const { error: updateError } = await supabase.from('profiles').update({
        plan,
        subscription_id: sub.id,
        subscription_status: sub.status,
        subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      }).eq('id', userId);
      if (updateError) {
        console.error('checkout.session.completed profile update failed', updateError, { userId, plan });
        return res.status(500).json({ error: 'DB update failed' });
      }

      const email = await getUserEmail(userId);
      if (email) {
        sendEmail({
          to: email,
          subject: `🚀 Your ${plan === 'premium' ? 'Premium' : 'Pro'} plan is active — The Storm Watcher`,
          html: proActivatedEmail(plan),
        }).catch(err => console.error('Welcome email failed:', err));
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;

      const priceId = sub.items.data[0]?.price.id ?? '';
      const plan = (sub.status === 'active' || sub.status === 'trialing') ? (PRICE_TO_PLAN[priceId] ?? 'free') : 'free';

      const periodEnd2 = sub.items.data[0]?.current_period_end;
      const { error: updateError } = await supabase.from('profiles').update({
        plan,
        subscription_status: sub.status,
        subscription_period_end: periodEnd2 ? new Date(periodEnd2 * 1000).toISOString() : null,
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

      // If the user already has a different active subscription (upgrade flow), don't downgrade
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('subscription_id')
        .eq('id', userId)
        .single();
      if (currentProfile?.subscription_id && currentProfile.subscription_id !== sub.id) break;

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

      const email = await getUserEmail(userId);
      if (email) {
        sendEmail({
          to: email,
          subject: 'Your Storm Watcher subscription has ended',
          html: subscriptionCancelledEmail(),
        }).catch(err => console.error('Cancellation email failed:', err));
      }
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;

      const trialEnd = sub.trial_end;
      const daysLeft = trialEnd
        ? Math.ceil((trialEnd * 1000 - Date.now()) / 86_400_000)
        : 3;

      const email = await getUserEmail(userId);
      if (email) {
        sendEmail({
          to: email,
          subject: `⏰ Your Storm Watcher trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          html: trialEndingEmail(daysLeft),
        }).catch(err => console.error('Trial ending email failed:', err));
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.subscription;
      const subId = typeof subRef === 'string' ? subRef : (subRef as Stripe.Subscription | null)?.id ?? null;
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

      const email = await getUserEmail(userId);
      if (email) {
        sendEmail({
          to: email,
          subject: '⚠️ Payment failed — action required',
          html: paymentFailedEmail(),
        }).catch(err => console.error('Payment failed email error:', err));
      }
      break;
    }
  }

  res.status(200).json({ received: true });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { sendEmail } from '../lib/resend.js';

// Daily health-check for Stripe webhook delivery. On 2026-05-29 the webhook
// silently 500'd for days (ESM import crash + apex→www redirect) and no
// subscription ever activated, with nobody noticing. This cron asks Stripe
// directly for events whose webhook delivery FAILED in the last ~25h and emails
// an alert, so the next silent failure surfaces in minutes, not days.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

const LOOKBACK_SECONDS = 25 * 60 * 60; // 25h overlap so a once-daily run never misses a window

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Read the secret once and refuse outright when it is missing. Comparing against
  // process.env.CRON_SECRET directly fails OPEN: with the variable unset both sides
  // are undefined, `undefined !== undefined` is false, and an unauthenticated caller
  // walks straight through to the Stripe query and the alert email. The two Deno
  // crons (send-kp-alerts, send-weekly-digest) already guard this way.
  const cronSecret = process.env.CRON_SECRET;
  const bearerToken = req.headers.authorization?.replace('Bearer ', '');
  const querySecret = req.query.secret as string | undefined;
  if (!cronSecret || (bearerToken !== cronSecret && querySecret !== cronSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'nikolai.dobrev@icloud.com';
  const isTest = req.query.test === 'true';

  try {
    const since = Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS;

    // delivery_success:false → events where at least one webhook delivery failed.
    const failed = await stripe.events.list({
      delivery_success: false,
      created: { gte: since },
      limit: 100,
    });

    const events = failed.data;
    const shouldAlert = isTest || events.length > 0;

    if (shouldAlert) {
      // Count by event type for a readable summary.
      const byType: Record<string, number> = {};
      for (const e of events) byType[e.type] = (byType[e.type] ?? 0) + 1;
      const rows = Object.entries(byType)
        .map(([type, n]) => `<li><code>${type}</code> — ${n}</li>`)
        .join('');

      const count = events.length;
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:560px">
          <h2>⚠️ Stripe webhook deliveries failing</h2>
          <p><strong>${isTest ? '(TEST) ' : ''}${count}</strong> Stripe event(s) failed webhook delivery in the last 25h.</p>
          ${count > 0 ? `<ul>${rows}</ul>` : '<p>(test run — no real failures)</p>'}
          <p>This usually means the webhook endpoint is down, returning an error, or pointing at the wrong URL.</p>
          <p>Check: <a href="https://dashboard.stripe.com/webhooks">Stripe → Developers → Webhooks → Event deliveries</a></p>
          <p style="color:#64748b;font-size:13px">Remember: the endpoint URL must use <code>www.thestormwatcher.com</code> (apex 301-redirects and Stripe won't follow it).</p>
        </div>`;

      await sendEmail({
        to: adminEmail,
        subject: `⚠️ ${count} Stripe webhook ${count === 1 ? 'delivery' : 'deliveries'} failed (last 24h)`,
        html,
      });
    }

    return res.status(200).json({ ok: true, failedCount: events.length, alerted: shouldAlert });
  } catch (err) {
    // If the check itself errors (e.g. bad Stripe key), surface it loudly.
    const message = err instanceof Error ? err.message : String(err);
    try {
      await sendEmail({
        to: adminEmail,
        subject: '⚠️ Stripe webhook health-check ERRORED',
        html: `<p>The webhook health-check cron failed to run:</p><pre>${message}</pre>`,
      });
    } catch { /* email itself failed — nothing more we can do here */ }
    return res.status(500).json({ error: message });
  }
}

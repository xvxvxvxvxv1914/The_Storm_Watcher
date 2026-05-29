-- ============================================================
-- MANUAL SETUP — run this AFTER the steps below.
-- Do NOT run this as part of an automated migration pipeline.
-- ============================================================
--
-- Schedules a once-daily call to the Vercel webhook-health cron, which checks
-- Stripe for failed webhook deliveries and emails ADMIN_EMAIL if any are found.
-- Background: on 2026-05-29 the Stripe webhook silently 500'd for days and no
-- subscription activated — this catches the next silent failure in minutes.
--
-- PREREQUISITES:
--   1. Extensions → ensure "pg_cron" and "pg_net" are enabled (already on if
--      send-kp-alerts cron exists).
--   2. Vercel → Project → Settings → Environment Variables (Production):
--        ADMIN_EMAIL = nikolai.dobrev@icloud.com   (recipient for alerts)
--        CRON_SECRET = <same value already used by storm-alert>
--   3. Deploy main so /api/cron/webhook-health is live.
--
-- IMPORTANT: the URL uses www.thestormwatcher.com — the apex domain 301-redirects
-- and pg_net would not follow it.
--
-- Then run this SQL in Dashboard → SQL Editor, replacing the placeholder:
-- ============================================================

SELECT cron.schedule(
  'stripe-webhook-health-daily',
  '0 8 * * *',  -- every day at 08:00 UTC
  $$
  SELECT net.http_post(
    url        := 'https://www.thestormwatcher.com/api/cron/webhook-health',
    headers    := '{"Content-Type":"application/json","Authorization":"Bearer REPLACE_WITH_CRON_SECRET"}'::jsonb,
    body       := '{}'::jsonb,
    timeout_milliseconds := 15000
  ) AS request_id;
  $$
);

-- To verify the schedule was created:
-- SELECT * FROM cron.job;

-- To remove it:
-- SELECT cron.unschedule('stripe-webhook-health-daily');

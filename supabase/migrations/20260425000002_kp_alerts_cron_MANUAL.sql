-- ============================================================
-- MANUAL SETUP — run this AFTER completing the steps below.
-- Do NOT run this as part of an automated migration pipeline.
-- ============================================================
--
-- PREREQUISITES (Supabase Dashboard):
--   1. Extensions → Enable "pg_cron"
--   2. Extensions → Enable "pg_net"
--   3. Edge Functions → send-kp-alerts → Secrets → add:
--        VAPID_PUBLIC_KEY   = <your public key>
--        VAPID_PRIVATE_KEY  = <your private key>
--        CRON_SECRET        = <any random string, e.g. openssl rand -hex 32>
--   4. Deploy the function:
--        supabase functions deploy send-kp-alerts
--
-- Then run this SQL in Dashboard → SQL Editor,
-- replacing the two placeholders with real values:
-- ============================================================

SELECT cron.schedule(
  'send-kp-alerts-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url        := 'https://srzfoxlmhxyulrgkchjr.supabase.co/functions/v1/send-kp-alerts',
    headers    := '{"Content-Type":"application/json","x-cron-secret":"REPLACE_WITH_CRON_SECRET"}'::jsonb,
    body       := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) AS request_id;
  $$
);

-- To verify the schedule was created:
-- SELECT * FROM cron.job;

-- To remove it:
-- SELECT cron.unschedule('send-kp-alerts-every-5min');

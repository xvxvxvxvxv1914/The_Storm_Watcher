-- ============================================================
-- MANUAL SETUP — run this AFTER completing the steps below.
-- Do NOT run this as part of an automated migration pipeline.
-- ============================================================
--
-- NOT APPLIED as of 2026-08-07. `SELECT * FROM cron.job` holds only
-- send-kp-alerts-every-5min, so the weekly digest has never been sent even
-- though Settings offers the opt-in toggle.
--
-- The previous version of this file could not have worked if it had been run,
-- for two independent reasons — both fixed below:
--
--   1. It read the secret from `current_setting('app.cron_secret', true)`,
--      which is NULL unless that GUC is set on the database. The header would
--      have gone out empty and the function would have answered 401.
--   2. send-weekly-digest is deployed with verify_jwt = true, so the gateway
--      rejects a request carrying no Authorization header before the function
--      ever runs. send-kp-alerts works precisely because it is verify_jwt=false.
--      Deploy with --no-verify-jwt (step 3) — the function authenticates the
--      caller itself via x-cron-secret.
--
-- PREREQUISITES (Supabase Dashboard):
--   1. Extensions → Enable "pg_cron" and "pg_net"
--   2. Edge Functions → send-weekly-digest → Secrets → add:
--        RESEND_API_KEY = <Resend API key>
--        CRON_SECRET    = <same random string the other crons use>
--   3. Deploy without gateway JWT verification:
--        supabase functions deploy send-weekly-digest --no-verify-jwt
--
-- Then run this SQL in Dashboard → SQL Editor, replacing the placeholder:
-- ============================================================

SELECT cron.schedule(
  'send-weekly-digest',
  '0 8 * * 1',                       -- Mondays 08:00 UTC
  $$
  SELECT net.http_post(
    url        := 'https://srzfoxlmhxyulrgkchjr.supabase.co/functions/v1/send-weekly-digest',
    headers    := '{"Content-Type":"application/json","x-cron-secret":"REPLACE_WITH_CRON_SECRET"}'::jsonb,
    body       := '{}'::jsonb,
    timeout_milliseconds := 60000    -- sends are throttled to ~1.7/s for Resend
  ) AS request_id;
  $$
);

-- To verify the schedule was created:
-- SELECT * FROM cron.job;

-- To remove it:
-- SELECT cron.unschedule('send-weekly-digest');

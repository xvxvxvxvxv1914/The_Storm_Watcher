-- MANUAL: run in Supabase dashboard SQL editor (requires pg_cron extension)
-- Sends weekly space weather digest every Monday at 08:00 UTC

SELECT cron.schedule(
  'send-weekly-digest',
  '0 8 * * 1',
  $$
    SELECT net.http_post(
      url := 'https://srzfoxlmhxyulrgkchjr.supabase.co/functions/v1/send-weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.cron_secret', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

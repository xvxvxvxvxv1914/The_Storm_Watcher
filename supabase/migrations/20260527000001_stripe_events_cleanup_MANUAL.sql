-- Cleanup cron: delete stripe_processed_events older than 30 days.
-- MANUAL: run this in the Supabase Dashboard SQL editor — it requires pg_cron
-- which must be enabled via Supabase Dashboard → Extensions first.

-- Enable pg_cron if not already on:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'stripe-events-cleanup',           -- job name
  '0 3 * * *',                       -- daily at 03:00 UTC
  $$
    DELETE FROM stripe_processed_events
    WHERE processed_at < NOW() - INTERVAL '30 days';
  $$
);

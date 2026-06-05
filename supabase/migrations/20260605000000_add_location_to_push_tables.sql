-- Add lat/lon columns to both push tables for location-based aurora filtering.
-- Edge function uses calcAuroraVisibility(lat, lon, kp) to skip alerts
-- where aurora has 0% chance at the subscriber's saved location.
-- NULL lat/lon means location unknown → alert always sent (safe default).
ALTER TABLE public.device_push_tokens
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;

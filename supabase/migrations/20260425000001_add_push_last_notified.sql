-- Add cooldown tracking to push_subscriptions.
-- send-kp-alerts Edge Function updates this after each notification
-- and skips subscriptions where last_notified_at is within the last 2 hours.
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

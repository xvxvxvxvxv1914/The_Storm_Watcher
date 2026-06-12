-- Quiet hours for storm push notifications.
-- quiet_start/quiet_end are LOCAL hours (0-23) on the user's profile;
-- NULL means quiet hours are disabled. The window may wrap midnight
-- (e.g. 23 → 7). Each device row carries its own tz_offset_min
-- (minutes EAST of UTC, i.e. -new Date().getTimezoneOffset()) so the
-- send-kp-alerts cron can evaluate the window in device-local time.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS quiet_start smallint CHECK (quiet_start BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS quiet_end smallint CHECK (quiet_end BETWEEN 0 AND 23);

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS tz_offset_min smallint;

ALTER TABLE device_push_tokens
  ADD COLUMN IF NOT EXISTS tz_offset_min smallint;

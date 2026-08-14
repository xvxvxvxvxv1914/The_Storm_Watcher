-- push_subscriptions.threshold_kp was integer while device_push_tokens.threshold_kp
-- is real. send-kp-alerts filters both with the same `.lte('threshold_kp', currentKp)`,
-- and currentKp comes from GFZ in thirds — 2.333, 5.667. PostgREST casts the filter
-- value to the column type, so on the web table that raised 22P02
-- (invalid input syntax for type integer: "2.333") and the query was skipped.
--
-- Measured in production: 79 failures in 24 hours, one on every run where Kp was not
-- a whole number, which is roughly two runs in three. Web push would therefore have
-- fired only at integer Kp once VITE_VAPID_PUBLIC_KEY was set — a storm at Kp 5.667
-- announced to nobody.
--
-- This is the third bug found in the same four queries, and it was hidden by the
-- second: the PGRST100 logic-tree error was raised before the value was cast, so it
-- masked this one until 20260813000000 fixed it. The old error stops at 13.08 22:40,
-- this one starts at 22:55.
--
-- real, not numeric: it matches device_push_tokens, and the point is that the two
-- mirror tables stop disagreeing. Both are read by the same code path, so a type
-- that only one of them has is a divergence waiting to be found the hard way.
alter table public.push_subscriptions
  alter column threshold_kp type real;

-- The default was written as integer 5; restate it so the column's default and type
-- are declared together rather than left to an implicit cast.
alter table public.push_subscriptions
  alter column threshold_kp set default 5;

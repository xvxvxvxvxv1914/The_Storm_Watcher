-- Bz early-warning alerts.
--
-- Kp is a retrospective 3-hour index, so a Kp-threshold alert always arrives
-- after the storm has started. A sustained southward Bz (the north-south
-- component of the IMF, measured at L1) precedes the Kp rise by roughly 15-45
-- minutes — the app already fetches and displays it, but never alerted on it.
--
-- Opt-in and off by default: this is a *forecast*, and a user who did not ask
-- for it should not start receiving pushes that say a storm may be coming.
--
-- last_bz_notified_at is deliberately separate from last_notified_at. Sharing
-- one column would let a Bz alert consume the 2-hour cooldown and swallow the
-- Kp alert for the storm it predicted — the two must be able to fire in the
-- same window.

alter table public.push_subscriptions
  add column if not exists bz_alerts_enabled boolean not null default false,
  add column if not exists bz_threshold real not null default -10,
  add column if not exists last_bz_notified_at timestamptz;

alter table public.device_push_tokens
  add column if not exists bz_alerts_enabled boolean not null default false,
  add column if not exists bz_threshold real not null default -10,
  add column if not exists last_bz_notified_at timestamptz;

-- Bz is southward (negative) when it matters; a positive threshold would never
-- fire and almost certainly means a dropped minus sign.
alter table public.push_subscriptions
  add constraint push_subscriptions_bz_threshold_negative
  check (bz_threshold < 0 and bz_threshold >= -50) not valid;

alter table public.device_push_tokens
  add constraint device_push_tokens_bz_threshold_negative
  check (bz_threshold < 0 and bz_threshold >= -50) not valid;

-- The cron filters on these, so keep the lookup cheap as the tables grow.
create index if not exists push_subscriptions_bz_enabled_idx
  on public.push_subscriptions (bz_alerts_enabled) where bz_alerts_enabled;

create index if not exists device_push_tokens_bz_enabled_idx
  on public.device_push_tokens (bz_alerts_enabled) where bz_alerts_enabled;

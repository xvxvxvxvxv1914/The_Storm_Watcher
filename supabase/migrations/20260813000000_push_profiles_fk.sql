-- Let PostgREST resolve `profiles!inner(...)` from the two push tables.
--
-- send-kp-alerts filters subscribers by plan, subscription_status and quiet
-- hours through an embedded `profiles!inner(...)`. That embed has never
-- resolved: PostgREST answers PGRST200, "no relationship found". Both tables
-- carry a foreign key to auth.users(id), and profiles.id carries one too, but
-- PostgREST will not join two tables through a third — it needs a key that
-- points directly at the table being embedded.
--
-- The visible symptom was one line per cron run, five times an hour, since the
-- feature shipped:
--   DB query failed: "failed to parse logic tree ((profiles.plan.in.(...)))"
-- (that text is a second, separate bug in the .or() filter, fixed in the
-- function itself; it merely masked this one by failing earlier.)
--
-- Consequence: every alert query in send-kp-alerts errored out, so the
-- Pro/Premium gate and quiet hours never actually ran. Invisible so far only
-- because all three push tables are empty.
--
-- Additive on purpose. The existing auth.users keys stay: they are what the
-- account-deletion cascade is documented against, and dropping a working
-- constraint to add this one buys nothing. Two foreign keys on the same column
-- is fine for the embed, because only one of them points at `profiles` and
-- auth.users is not in the exposed schema, so `profiles!inner` stays
-- unambiguous.
--
-- ON DELETE CASCADE matches the existing behaviour rather than changing it:
-- profiles.id already cascades from auth.users, so both paths agree, and a
-- subscription whose profile is gone could never be evaluated anyway — the
-- inner join would drop it.
--
-- No index is added. Both tables already have a unique index with user_id as
-- its leading column (push_subscriptions_user_id_endpoint_key,
-- device_push_tokens_user_id_token_key), which serves the key lookup.
--
-- Safe to apply: user_id is NOT NULL on both tables, both are empty at the time
-- of writing, and profiles rows are created by the on_auth_user_created trigger
-- inside the signup transaction — so a row can never be inserted for a user who
-- has no profile yet.

alter table public.push_subscriptions
  add constraint push_subscriptions_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.device_push_tokens
  add constraint device_push_tokens_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

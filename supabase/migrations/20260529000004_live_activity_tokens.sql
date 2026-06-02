/*
  # Live Activity push tokens (Phase B — push-to-update)

  Each storm Live Activity started on a device registers an APNs push token here
  so the send-kp-alerts cron can refresh the lock-screen banner while the app is
  closed. The row is deleted when the activity ends (client) or when APNs reports
  the token gone (server).

  Mirrors device_push_tokens (per-user, RLS-owned). Writes go through RLS as the
  authenticated user; the edge function reads/cleans up via service_role.
*/

create table if not exists public.live_activity_tokens (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  token          text not null unique,
  activity_id    text,
  platform       text not null default 'ios' check (platform in ('ios')),
  last_pushed_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.live_activity_tokens enable row level security;

create policy "Users read own live activity tokens"
  on public.live_activity_tokens for select
  using ((select auth.uid()) = user_id);

create policy "Users insert own live activity tokens"
  on public.live_activity_tokens for insert
  with check ((select auth.uid()) = user_id);

create policy "Users update own live activity tokens"
  on public.live_activity_tokens for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own live activity tokens"
  on public.live_activity_tokens for delete
  using ((select auth.uid()) = user_id);

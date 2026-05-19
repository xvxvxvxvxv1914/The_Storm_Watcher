create table if not exists public.user_preferences (
  id uuid primary key references auth.users(id) on delete cascade,
  locale_settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can view own preferences"
  on public.user_preferences for select
  using (auth.uid() = id);

create policy "Users can insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = id);

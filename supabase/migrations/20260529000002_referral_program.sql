/*
  # Referral program

  Double-sided: referrer earns free Pro days when a referred user becomes a
  PAYING customer; referred users get a longer trial (handled in checkout).

  - profiles.referral_code        — unique shareable code per user
  - profiles.referred_by          — who referred this user (set at signup)
  - profiles.referral_pro_until   — free Pro granted via referrals (service_role only)
  - referrals                     — one row per referred user, tracks reward status

  Reward columns are NOT client-writable: the 20260529000000 lock migration
  revoked UPDATE on profiles except (full_name, avatar_url), so these new columns
  can only be set by the SECURITY DEFINER trigger / service_role (webhook).
*/

-- 1. New profile columns
alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles(id),
  add column if not exists referral_pro_until timestamptz;

-- 2. Short, URL-safe, unambiguous code generator (no 0/O/1/I)
create or replace function public.gen_referral_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- 3. Backfill existing users
update public.profiles set referral_code = public.gen_referral_code() where referral_code is null;

-- 4. Referrals table (one row per referred user)
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade unique,
  status text not null default 'pending' check (status in ('pending', 'rewarded')),
  reward_days int,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);
create index if not exists referrals_referrer_id_idx on public.referrals(referrer_id);

-- 5. RLS: a user may read the referrals they made; writes are service_role only
alter table public.referrals enable row level security;

drop policy if exists "read own referrals" on public.referrals;
create policy "read own referrals"
  on public.referrals for select
  to authenticated
  using (referrer_id = (select auth.uid()));

-- 6. Extend signup trigger: generate code, attribute referrer, open referral row
create or replace function public.handle_new_user()
returns trigger as $$
declare
  ref_code text := nullif(trim(NEW.raw_user_meta_data->>'referred_by_code'), '');
  referrer uuid;
begin
  if ref_code is not null then
    select id into referrer from public.profiles where referral_code = upper(ref_code);
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, referral_code, referred_by)
  values (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    public.gen_referral_code(),
    referrer
  );

  -- Don't let anyone refer themselves (impossible at insert, but defensive)
  if referrer is not null and referrer <> NEW.id then
    insert into public.referrals (referrer_id, referred_id)
    values (referrer, NEW.id)
    on conflict (referred_id) do nothing;
  end if;

  return NEW;
end;
$$ language plpgsql security definer set search_path = '';

/*
  # Fix: referred_by FK should not block referrer account deletion

  20260529000002 added profiles.referred_by as a self-FK with the default
  ON DELETE NO ACTION. That means deleting a user who has referred others fails:
  the cascade from auth.users → profiles is blocked because the referred users'
  rows still point at the referrer via referred_by.

  Switch it to ON DELETE SET NULL so a referrer can delete their account; the
  referred users simply lose the (historical) attribution.
*/

alter table public.profiles
  drop constraint if exists profiles_referred_by_fkey;

alter table public.profiles
  add constraint profiles_referred_by_fkey
    foreign key (referred_by) references public.profiles(id) on delete set null;

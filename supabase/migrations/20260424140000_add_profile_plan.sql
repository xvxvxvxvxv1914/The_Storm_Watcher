/*
  # Add plan column to profiles

  1. Changes
    - Add `plan` column ('free' | 'pro' | 'premium') with default 'free'
    - Backfill existing rows to 'free'
    - Update handle_new_user() to set plan='free' for new signups

  2. Security
    - Existing UPDATE policy stays (users update own profile), BUT the client-side
      updateProfile() allowlist in AuthContext must never include `plan`.
      Plan changes must come from a server-side Stripe webhook (service_role key).
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'pro', 'premium'));

-- Ensure existing rows have a valid plan (defensive; DEFAULT already handles new rows)
UPDATE profiles SET plan = 'free' WHERE plan IS NULL;

-- Rewrite handle_new_user so new signups get plan='free' explicitly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, plan)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

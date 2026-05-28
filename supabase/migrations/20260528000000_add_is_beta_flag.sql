-- Add is_beta flag to profiles for early beta access (Premium feature).
-- Managed manually from Supabase dashboard — no client-side update path.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_beta boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_beta IS
  'Grants early access to beta features. Set manually in Supabase dashboard for Premium users.';

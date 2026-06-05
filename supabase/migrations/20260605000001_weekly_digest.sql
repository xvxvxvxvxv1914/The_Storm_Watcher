-- Add weekly digest opt-in to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weekly_digest boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.weekly_digest IS 'User opted in to receive weekly space-weather email digest';

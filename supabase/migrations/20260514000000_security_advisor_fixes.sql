-- Supabase Security Advisor fixes (2026-05-14)

-- 1. Enable RLS on storm_posts (written only by service role cron)
ALTER TABLE public.storm_posts ENABLE ROW LEVEL SECURITY;

-- 2. Fix mutable search_path on trigger function
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Revoke direct RPC execution of handle_new_user (trigger-only function)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- 4. Remove always-true INSERT policy on mood_entries
--    All writes go through submit-mood Edge Function (service role, bypasses RLS)
DROP POLICY IF EXISTS "Anyone can insert mood entries" ON public.mood_entries;

-- 5. Remove broad SELECT policy on avatars bucket (prevents listing all user files)
--    Public bucket objects remain accessible via their direct URLs
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;

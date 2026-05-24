-- Fix Supabase Security Advisor issues (5 → 1 remaining — leaked password requires Pro plan)

-- 1. storm_posts: internal table (Vercel cron only). Explicit deny silences advisor.
CREATE POLICY "No public access"
  ON public.storm_posts
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false);

-- 2. stripe_processed_events: Stripe webhook idempotency table. service_role only.
CREATE POLICY "No public access"
  ON public.stripe_processed_events
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false);

-- 3. aurora-gallery: drop broad SELECT policy — public bucket CDN access needs no RLS.
--    Gallery reads photo_url from aurora_sightings table, not from storage.list().
DROP POLICY IF EXISTS "Public read aurora gallery" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read aurora gallery" ON storage.objects;

-- 4. avatars: drop broad SELECT — replace with user-scoped listing.
--    Other users' avatars are accessed via public CDN URL directly.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

CREATE POLICY "Users read own avatar folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

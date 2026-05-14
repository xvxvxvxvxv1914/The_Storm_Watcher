-- Fix auth_rls_initplan performance warnings (2026-05-14)
-- Wraps auth.uid() in (select auth.uid()) so Postgres evaluates it once per
-- query instead of once per row, eliminating the InitPlan re-evaluation overhead.

-- profiles
DROP POLICY "Users can read own profile" ON public.profiles;
DROP POLICY "Users can insert own profile" ON public.profiles;
DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- push_subscriptions
DROP POLICY "Users read own push subscriptions" ON public.push_subscriptions;
DROP POLICY "Users insert own push subscriptions" ON public.push_subscriptions;
DROP POLICY "Users update own push subscriptions" ON public.push_subscriptions;
DROP POLICY "Users delete own push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users read own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING ((select auth.uid()) = user_id);

-- favorite_locations
DROP POLICY "Users read own favorite locations" ON public.favorite_locations;
DROP POLICY "Users insert own favorite locations" ON public.favorite_locations;
DROP POLICY "Users delete own favorite locations" ON public.favorite_locations;

CREATE POLICY "Users read own favorite locations"
  ON public.favorite_locations FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users insert own favorite locations"
  ON public.favorite_locations FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users delete own favorite locations"
  ON public.favorite_locations FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Remove unused index on mood_entries
DROP INDEX IF EXISTS public.idx_mood_entries_mood_type;

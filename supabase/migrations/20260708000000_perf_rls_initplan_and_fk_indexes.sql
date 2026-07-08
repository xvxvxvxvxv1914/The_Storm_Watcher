-- Perf: wrap auth.uid() in a scalar subquery so Postgres evaluates it once per
-- query instead of once per row (Supabase linter 0003_auth_rls_initplan).
-- Applied to production 2026-07-08 via MCP apply_migration.
ALTER POLICY "Users manage own push tokens" ON public.device_push_tokens
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own preferences" ON public.user_preferences
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users can update own preferences" ON public.user_preferences
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can view own preferences" ON public.user_preferences
  USING ((select auth.uid()) = id);

-- Perf: covering indexes for foreign keys flagged by linter 0001_unindexed_foreign_keys.
CREATE INDEX IF NOT EXISTS aurora_photos_user_id_idx ON public.aurora_photos (user_id);
CREATE INDEX IF NOT EXISTS contact_messages_user_id_idx ON public.contact_messages (user_id);
CREATE INDEX IF NOT EXISTS live_activity_tokens_user_id_idx ON public.live_activity_tokens (user_id);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by);

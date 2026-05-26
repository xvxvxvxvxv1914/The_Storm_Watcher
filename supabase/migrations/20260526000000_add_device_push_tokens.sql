-- Native push notification tokens for iOS (APNs) and Android (FCM).
-- Separate from push_subscriptions which holds Web Push (VAPID) subscriptions.
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  threshold_kp REAL NOT NULL DEFAULT 5,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own device tokens"
  ON public.device_push_tokens FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users insert own device tokens"
  ON public.device_push_tokens FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users update own device tokens"
  ON public.device_push_tokens FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users delete own device tokens"
  ON public.device_push_tokens FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- Index for edge function lookups (iterate tokens by Kp threshold)
CREATE INDEX device_push_tokens_threshold_idx
  ON public.device_push_tokens (threshold_kp);

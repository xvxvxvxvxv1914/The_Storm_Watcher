-- CRITICAL SECURITY FIX (2026-05-29)
--
-- Problem: the "Users can update own profile" RLS policy is row-level only.
-- Postgres RLS does NOT restrict which COLUMNS an authenticated user may write,
-- so any logged-in user could bypass the app-layer allowlist and self-grant a
-- paid plan straight from the browser console:
--
--   await supabase.from('profiles')
--     .update({ plan: 'premium', is_beta: true })
--     .eq('id', myUserId)
--
-- This completely defeats the Stripe paywall.
--
-- Fix: use Postgres column-level privileges. Revoke the blanket UPDATE grant
-- and re-grant UPDATE only on the columns the client is allowed to change.
-- Plan / subscription / beta columns can then only be written by the
-- service_role key (Stripe webhook + verify-iap Edge Function), which bypasses
-- both RLS and these column grants.

-- Drop the implicit full-table UPDATE privilege Supabase grants by default.
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

-- Re-grant UPDATE only on user-editable columns.
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- Note: the BEFORE UPDATE trigger still sets updated_at — column-level UPDATE
-- privileges are only checked against columns named in the UPDATE statement,
-- not columns mutated by triggers, so no grant on updated_at is required.
--
-- The existing row-level policy ("Users can update own profile") still applies
-- on top of these grants, so a user can only edit their OWN name/avatar.

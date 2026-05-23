-- Fix: hunter_leaderboard view ran as postgres (superuser) which bypasses RLS.
-- security_invoker = true forces execution with the calling user's privileges,
-- so RLS on aurora_sightings is properly enforced (requires PG15+, running PG17).

CREATE OR REPLACE VIEW public.hunter_leaderboard
  WITH (security_invoker = true) AS
SELECT
  user_id,
  max(display_name)  AS display_name,
  count(*)           AS sightings_count
FROM aurora_sightings
GROUP BY user_id
ORDER BY count(*) DESC
LIMIT 50;

-- Least-privilege cleanup: views without INSTEAD OF triggers are read-only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON public.hunter_leaderboard FROM anon, authenticated;

GRANT SELECT ON public.hunter_leaderboard TO anon, authenticated;

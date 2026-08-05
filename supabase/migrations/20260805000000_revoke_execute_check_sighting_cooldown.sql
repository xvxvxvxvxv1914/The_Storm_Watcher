-- check_sighting_cooldown() returns `trigger`: the only thing that can ever run it
-- is the BEFORE INSERT trigger on aurora_sightings, and Postgres checks EXECUTE
-- when the trigger is created, not when it fires. The default PUBLIC grant
-- therefore buys nothing and only exposes the SECURITY DEFINER function on
-- /rest/v1/rpc — flagged by the Supabase linter (0028/0029).
--
-- handle_new_user(), the other SECURITY DEFINER trigger function in this schema,
-- already carries no anon/authenticated grant and fires on every signup; this
-- brings the two in line.
REVOKE EXECUTE ON FUNCTION public.check_sighting_cooldown() FROM PUBLIC, anon, authenticated;

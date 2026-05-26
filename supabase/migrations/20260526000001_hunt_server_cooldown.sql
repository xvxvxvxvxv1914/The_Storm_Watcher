-- C3: Server-side cooldown for aurora sightings.
-- Prevents users from bypassing the 1-hour cooldown by clearing localStorage.
-- The function checks whether the user has a sighting within the last hour
-- and raises an exception if so. The INSERT policy references this function.

CREATE OR REPLACE FUNCTION public.check_sighting_cooldown()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  last_ts TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO last_ts
  FROM public.aurora_sightings
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_ts IS NOT NULL AND now() - last_ts < INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'cooldown: one aurora sighting per hour allowed'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then (re)create
DROP TRIGGER IF EXISTS enforce_sighting_cooldown ON public.aurora_sightings;

CREATE TRIGGER enforce_sighting_cooldown
  BEFORE INSERT ON public.aurora_sightings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_sighting_cooldown();

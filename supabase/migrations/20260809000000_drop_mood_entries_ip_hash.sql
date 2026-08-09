/*
  # Drop the dead ip_hash column from mood_entries

  Declared "for rate limiting" in 20260405111246_create_mood_tracking.sql but
  never written by anything — submit-mood (the only writer since the RLS INSERT
  policy was removed in 20260514000000) does not populate it, and 0 of the
  existing rows carried a value when this ran.

  Keeping it advertised a protection that does not exist, and populating it
  would start collecting a new personal identifier (a hashed IP) that the
  Privacy page does not mention. Decision 2026-08-09: the mood feed stays
  pseudonymous (user_session_id only) and accepts that its daily limit is
  client-enforced.

  Applied to production 2026-08-09 via MCP (drop_mood_entries_ip_hash).
*/
ALTER TABLE mood_entries DROP COLUMN IF EXISTS ip_hash;

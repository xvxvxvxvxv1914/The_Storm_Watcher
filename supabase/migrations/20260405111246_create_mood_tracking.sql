/*
  # Create mood tracking system

  1. New Tables
    - `mood_entries`
      - `id` (uuid, primary key)
      - `user_session_id` (text) - anonymous session identifier
      - `mood_type` (text) - type of mood (great, good, okay, bad, terrible)
      - `symptoms` (text array) - optional symptoms (headache, dizzy, anxious, etc)
      - `kp_index` (numeric) - Kp index at time of entry
      - `created_at` (timestamp)
      - `ip_hash` (text) - hashed IP for rate limiting

  2. Security
    - Enable RLS on `mood_entries` table
    - Add policy for anyone to insert entries
    - Add policy for anyone to read aggregated data
*/

CREATE TABLE IF NOT EXISTS mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session_id text NOT NULL,
  mood_type text NOT NULL CHECK (mood_type IN ('great', 'good', 'okay', 'bad', 'terrible')),
  symptoms text[] DEFAULT '{}',
  kp_index numeric,
  created_at timestamptz DEFAULT now(),
  ip_hash text
);

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert mood entries"
  ON mood_entries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read mood entries"
  ON mood_entries
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_mood_type ON mood_entries(mood_type);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_session ON mood_entries(user_session_id);

CREATE TABLE IF NOT EXISTS favorite_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lat, lon)
);

ALTER TABLE favorite_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own favorite locations"
  ON favorite_locations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own favorite locations"
  ON favorite_locations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own favorite locations"
  ON favorite_locations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users update own favorite locations"
  ON favorite_locations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

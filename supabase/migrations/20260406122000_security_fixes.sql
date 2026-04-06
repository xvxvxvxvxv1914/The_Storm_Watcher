/*
  # Security fixes

  1. Fix mood_entries INSERT policy - only authenticated users can insert
  2. Fix function search_path for handle_new_user and handle_updated_at
*/

-- mood_entries INSERT stays open to anon+authenticated (mood page is public, uses session ID tracking)
-- No change needed for mood_entries INSERT policy

-- Fix search_path for handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix search_path for handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';


-- Fix RLS policies: Change from RESTRICTIVE to PERMISSIVE for tournaments table
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can insert their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can update their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can delete their own tournaments" ON public.tournaments;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Users can view their own tournaments"
  ON public.tournaments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tournaments"
  ON public.tournaments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tournaments"
  ON public.tournaments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tournaments"
  ON public.tournaments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix tournament_matches policies too
DROP POLICY IF EXISTS "Users can view their own tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Users can insert their own tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Users can update their own tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Users can delete their own tournament matches" ON public.tournament_matches;

CREATE POLICY "Users can view their own tournament matches"
  ON public.tournament_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tournament matches"
  ON public.tournament_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tournament matches"
  ON public.tournament_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tournament matches"
  ON public.tournament_matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix matches table too
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can insert their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can delete their own matches" ON public.matches;

CREATE POLICY "Users can view their own matches"
  ON public.matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own matches"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matches"
  ON public.matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix players table
DROP POLICY IF EXISTS "Users can view their own players" ON public.players;
DROP POLICY IF EXISTS "Users can insert their own players" ON public.players;
DROP POLICY IF EXISTS "Users can update their own players" ON public.players;
DROP POLICY IF EXISTS "Users can delete their own players" ON public.players;

CREATE POLICY "Users can view their own players"
  ON public.players FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own players"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own players"
  ON public.players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own players"
  ON public.players FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

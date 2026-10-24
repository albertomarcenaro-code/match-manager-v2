
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for all tables

-- tournaments
DROP POLICY IF EXISTS "Users can view own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can insert own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can update own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can delete own tournaments" ON public.tournaments;

CREATE POLICY "Users can view own tournaments" ON public.tournaments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tournaments" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tournaments" ON public.tournaments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tournaments" ON public.tournaments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- matches
DROP POLICY IF EXISTS "Users can view own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can insert own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can delete own matches" ON public.matches;

CREATE POLICY "Users can view own matches" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own matches" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own matches" ON public.matches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- players
DROP POLICY IF EXISTS "Users can view own players" ON public.players;
DROP POLICY IF EXISTS "Users can insert own players" ON public.players;
DROP POLICY IF EXISTS "Users can update own players" ON public.players;
DROP POLICY IF EXISTS "Users can delete own players" ON public.players;

CREATE POLICY "Users can view own players" ON public.players FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own players" ON public.players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own players" ON public.players FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own players" ON public.players FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- saved_teams
DROP POLICY IF EXISTS "Users can view own saved teams" ON public.saved_teams;
DROP POLICY IF EXISTS "Users can insert own saved teams" ON public.saved_teams;
DROP POLICY IF EXISTS "Users can update own saved teams" ON public.saved_teams;
DROP POLICY IF EXISTS "Users can delete own saved teams" ON public.saved_teams;

CREATE POLICY "Users can view own saved teams" ON public.saved_teams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved teams" ON public.saved_teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved teams" ON public.saved_teams FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved teams" ON public.saved_teams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- tournament_matches
DROP POLICY IF EXISTS "Users can view own tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Users can insert own tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Users can update own tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Users can delete own tournament matches" ON public.tournament_matches;

CREATE POLICY "Users can view own tournament matches" ON public.tournament_matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tournament matches" ON public.tournament_matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tournament matches" ON public.tournament_matches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tournament matches" ON public.tournament_matches FOR DELETE TO authenticated USING (auth.uid() = user_id);

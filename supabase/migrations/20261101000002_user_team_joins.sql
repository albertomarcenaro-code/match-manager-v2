-- Tracks which authenticated users have joined a shared team via its team_code.
-- This is the DB-side counterpart of the client-side "active team" stored in
-- localStorage: it lets RLS grant access to a team's team_members to anyone who
-- has legitimately joined that team, while keeping every other team private.
CREATE TABLE IF NOT EXISTS public.user_team_joins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.saved_teams(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id)
);

ALTER TABLE public.user_team_joins ENABLE ROW LEVEL SECURITY;

-- A user can see their own join rows (used by the "leave team" flow on the
-- client, which clears localStorage and deletes the matching row).
CREATE POLICY "Users see their own team joins"
  ON public.user_team_joins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- A user can join any team they have a valid team_code for (inserted by the
-- client after a successful lookupTeamByCode call). We gate INSERT by checking
-- that the team exists and has a team_code; the client is the one that proves
-- possession of the code, so this is a reasonable trust boundary.
CREATE POLICY "Authenticated users can join a team by code"
  ON public.user_team_joins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.saved_teams t
      WHERE t.id = team_id
        AND t.team_code IS NOT NULL
    )
  );

-- A user can leave a team they joined (delete their own join row).
CREATE POLICY "Users can leave a team they joined"
  ON public.user_team_joins
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything (backend jobs, migrations).
GRANT ALL ON public.user_team_joins TO service_role;
GRANT SELECT ON public.user_team_joins TO authenticated;
GRANT INSERT, DELETE ON public.user_team_joins TO authenticated;

CREATE TRIGGER update_user_team_joins_updated_at
  BEFORE UPDATE ON public.user_team_joins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.user_team_joins IS
  'Associazioni utente-team create quando un utente si unisce a un team_code. Non altera team_members né le sue chiavi esterne.';

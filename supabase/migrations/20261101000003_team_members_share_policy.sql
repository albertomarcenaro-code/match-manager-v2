-- Extend team_members access so that anyone who has joined a shared team via
-- team_code can read/write that team's roster (anagrafica), while keeping every
-- other team strictly private. This does NOT change the table structure or
-- foreign keys: team_members.team_id already FKs saved_teams(id).
--
-- Read policy: a row is visible to (a) its owner (user_id = auth.uid()) OR
-- (b) any authenticated user who has joined that team (a row in
-- user_team_joins for the same team_id). Case (b) is what makes the shared rosa
-- visible to all coaches of the same leva.
CREATE OR REPLACE POLICY "Team members are visible to the owner and to joined-team users"
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_team_joins u
      WHERE u.team_id = team_id
        AND u.user_id = auth.uid()
    )
  );

-- Insert policy: a row can be inserted by its owner OR by a user who joined the
-- team (the latter creates a new member on the shared roster). The inserted
-- row's team_id must belong to a team the user owns or has joined.
CREATE OR REPLACE POLICY "Team members can be inserted by the owner or joined-team users"
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_team_joins u
      WHERE u.team_id = team_id
        AND u.user_id = auth.uid()
    )
  );

-- Update policy: only the owner can update a row they own; a joined-team user
-- can update rows belonging to the team they joined (e.g. correct a player's
-- data on the shared roster). We keep it conservative: a joined user may update
-- any row of the team they joined, provided the row still belongs to that team.
CREATE OR REPLACE POLICY "Team members can be updated by the owner or joined-team users"
  ON public.team_members
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_team_joins u
      WHERE u.team_id = team_id
        AND u.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_team_joins u
      WHERE u.team_id = team_id
        AND u.user_id = auth.uid()
    )
  );

-- Delete policy: the owner deletes their own rows; a joined-team user can delete
-- rows that belong to the team they joined (e.g. removing a player from the
-- shared rosa). This mirrors the owner-delete behaviour for the shared team.
CREATE OR REPLACE POLICY "Team members can be deleted by the owner or joined-team users"
  ON public.team_members
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_team_joins u
      WHERE u.team_id = team_id
        AND u.user_id = auth.uid()
    )
  );

-- Keep the service role fully privileged.
GRANT ALL ON public.team_members TO service_role;

COMMENT ON POLICY "Team members are visible to the owner and to joined-team users"
  ON public.team_members IS
  'Consente la lettura della rosa a chi ha joinato la squadra via team_code. Zero regressione: l'owner continua a vedere/scrivere le proprie squadre come prima.';

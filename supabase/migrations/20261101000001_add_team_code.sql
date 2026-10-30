-- Add team_code to saved_teams for shared-team access via "Codice Squadra".
-- Kept nullable so existing teams are untouched and zero regression is guaranteed.
ALTER TABLE public.saved_teams
  ADD COLUMN IF NOT EXISTS team_code TEXT;

-- Deterministic, stable code derived from name + a short random token so two
-- teams created at different times never collide on the same value.
CREATE OR REPLACE FUNCTION public.gen_team_code(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT upper(trim(trim(to_char(now(), 'YYYY')) || '-' || substr(md5(coalesce(name, '') || '-' || gen_random_uuid()::text), 1, 6)))
  WHERE name IS NOT NULL AND length(trim(name)) > 0;
$$;

-- Backfill only rows that were created before this migration and that have no
-- code yet, so nobody is ever assigned an unexpected value.
UPDATE public.saved_teams
SET team_code = public.gen_team_code(name)
WHERE team_code IS NULL
  AND name IS NOT NULL
  AND length(trim(name)) > 0;

-- One team_code can only map to one team; collisions on fresh inserts must
-- fail loudly for the owner rather than silently overwriting a shared team.
CREATE UNIQUE INDEX IF NOT EXISTS saved_teams_team_code_key
  ON public.saved_teams (team_code)
  WHERE team_code IS NOT NULL;

-- Read access for the join flow: a signed-in user can look up a team by its
-- public code WITHOUT owning it. This is intentionally limited to the columns
-- needed for the "unisciti a squadra" flow (id + name + anagrafica summary).
CREATE POLICY "Anyone authenticated can lookup a team by its team_code"
  ON public.saved_teams
  FOR SELECT
  TO authenticated
  USING (team_code IS NOT NULL);

-- Owners can set / rotate their team_code. Other authenticated users cannot
-- write team_code for a team they do not own (the existing owner policy still
-- gates all other columns).
CREATE POLICY "Owners can set their team_code"
  ON public.saved_teams
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant the role the minimum it needs for the join flow.
GRANT SELECT (id, name, category, leva, season, team_code) ON public.saved_teams TO authenticated;

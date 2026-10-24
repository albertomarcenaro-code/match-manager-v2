
-- 1) Extend team_members with team_id and jersey_number
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.saved_teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS jersey_number INTEGER;

-- 2) For each user with orphan team_members, create/attach an "Anagrafica Federale" saved_team
DO $$
DECLARE
  u RECORD;
  tid UUID;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.team_members WHERE team_id IS NULL LOOP
    SELECT id INTO tid FROM public.saved_teams
      WHERE user_id = u.user_id AND lower(trim(name)) = 'anagrafica federale' LIMIT 1;
    IF tid IS NULL THEN
      INSERT INTO public.saved_teams (user_id, name, category, players)
      VALUES (u.user_id, 'Anagrafica Federale', '', '[]'::jsonb)
      RETURNING id INTO tid;
    END IF;
    UPDATE public.team_members SET team_id = tid WHERE user_id = u.user_id AND team_id IS NULL;
  END LOOP;
END $$;

-- 3) Migrate saved_teams.players JSON into team_members (skip duplicates by lower(full_name))
DO $$
DECLARE
  t RECORD;
  p JSONB;
  pname TEXT;
  pnum INTEGER;
BEGIN
  FOR t IN SELECT id, user_id, players FROM public.saved_teams WHERE jsonb_typeof(players) = 'array' LOOP
    FOR p IN SELECT * FROM jsonb_array_elements(t.players) LOOP
      pname := trim(coalesce(p->>'name',''));
      IF pname = '' THEN CONTINUE; END IF;
      pnum := CASE WHEN p->>'number' ~ '^\d+$' THEN (p->>'number')::int ELSE NULL END;
      IF NOT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = t.id AND lower(trim(full_name)) = lower(pname)
      ) THEN
        INSERT INTO public.team_members (user_id, team_id, full_name, role, jersey_number)
        VALUES (t.user_id, t.id, pname, 'Giocatore', pnum);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 4) Enforce team_id NOT NULL now that backfill is complete
ALTER TABLE public.team_members ALTER COLUMN team_id SET NOT NULL;

-- 5) Rework unique indexes: scope by team_id instead of user_id
DROP INDEX IF EXISTS public.team_members_user_fiscal_code_idx;
DROP INDEX IF EXISTS public.team_members_user_name_idx;

CREATE UNIQUE INDEX team_members_team_fiscal_code_idx
  ON public.team_members (team_id, lower(fiscal_code))
  WHERE fiscal_code IS NOT NULL AND fiscal_code <> '';

CREATE UNIQUE INDEX team_members_team_name_idx
  ON public.team_members (team_id, lower(trim(full_name)))
  WHERE fiscal_code IS NULL OR fiscal_code = '';

CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);

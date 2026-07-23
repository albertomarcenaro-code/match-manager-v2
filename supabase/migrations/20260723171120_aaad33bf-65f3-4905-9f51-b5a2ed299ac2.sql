
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS tournament_label text,
  ADD COLUMN IF NOT EXISTS group_name text,
  ADD COLUMN IF NOT EXISTS leva text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS venue text,
  ADD COLUMN IF NOT EXISTS match_time text,
  ADD COLUMN IF NOT EXISTS is_home_team boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS lineup_selection jsonb;

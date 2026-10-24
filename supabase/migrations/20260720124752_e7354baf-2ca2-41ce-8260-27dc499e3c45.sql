
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  figc_number TEXT,
  fiscal_code TEXT,
  role TEXT NOT NULL DEFAULT 'Giocatore',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX team_members_user_fiscal_code_idx
  ON public.team_members (user_id, lower(fiscal_code))
  WHERE fiscal_code IS NOT NULL AND fiscal_code <> '';

CREATE UNIQUE INDEX team_members_user_name_idx
  ON public.team_members (user_id, lower(trim(full_name)))
  WHERE fiscal_code IS NULL OR fiscal_code = '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own team members"
  ON public.team_members FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

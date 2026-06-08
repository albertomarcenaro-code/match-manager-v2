CREATE TABLE public.tournament_jersey_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id text NOT NULL,
  player_name text NOT NULL,
  jersey_number integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX idx_tjn_tournament ON public.tournament_jersey_numbers(tournament_id);
CREATE INDEX idx_tjn_user ON public.tournament_jersey_numbers(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_jersey_numbers TO authenticated;
GRANT ALL ON public.tournament_jersey_numbers TO service_role;

ALTER TABLE public.tournament_jersey_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tournament jerseys"
  ON public.tournament_jersey_numbers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tjn_updated_at
  BEFORE UPDATE ON public.tournament_jersey_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

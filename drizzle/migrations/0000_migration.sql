CREATE TABLE public.tournament_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  figc text NOT NULL DEFAULT '',
  selected boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tournament_staff_unique_name
  ON public.tournament_staff (tournament_id, lower(trim(name)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_staff TO authenticated;
GRANT ALL ON public.tournament_staff TO service_role;

ALTER TABLE public.tournament_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournament_staff_select ON public.tournament_staff
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY tournament_staff_insert ON public.tournament_staff
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY tournament_staff_update ON public.tournament_staff
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY tournament_staff_delete ON public.tournament_staff
  FOR DELETE TO authenticated USING (user_id = auth.uid());
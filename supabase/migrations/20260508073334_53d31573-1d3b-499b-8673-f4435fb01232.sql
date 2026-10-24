-- Enable public read access for live spectator pages
CREATE POLICY "Public can view matches for live"
ON public.matches FOR SELECT
TO anon
USING (true);

CREATE POLICY "Public can view tournament_matches for live"
ON public.tournament_matches FOR SELECT
TO anon
USING (true);

CREATE POLICY "Public can view tournaments for live"
ON public.tournaments FOR SELECT
TO anon
USING (true);

-- Realtime configuration
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.tournament_matches REPLICA IDENTITY FULL;
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
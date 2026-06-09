-- 1) Restrictive deny policy for anon on tournament_jersey_numbers
CREATE POLICY "Deny anon access to tournament_jersey_numbers"
ON public.tournament_jersey_numbers
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Also revoke any default table privileges from anon as a defense in depth
REVOKE ALL ON public.tournament_jersey_numbers FROM anon;

-- 2) Remove tournament_matches from realtime publication (no client subscribes to it;
--    keeping it in the publication risks cross-user event leakage on postgres_changes)
ALTER PUBLICATION supabase_realtime DROP TABLE public.tournament_matches;

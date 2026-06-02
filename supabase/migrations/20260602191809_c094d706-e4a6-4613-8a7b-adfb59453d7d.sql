-- 1) invitation_codes: remove broad public read; provide a safe validator RPC instead
DROP POLICY IF EXISTS "Anyone can validate invitation codes" ON public.invitation_codes;
REVOKE SELECT ON public.invitation_codes FROM anon;
REVOKE SELECT ON public.invitation_codes FROM authenticated;

CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invitation_codes
    WHERE code = p_code
      AND is_active = true
      AND current_uses < max_uses
  );
$$;

REVOKE EXECUTE ON FUNCTION public.validate_invitation_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invitation_code(text) TO anon;

-- 2) tournament_matches: no client code reads this anonymously; drop public read
DROP POLICY IF EXISTS "Public can view tournament_matches for live" ON public.tournament_matches;
REVOKE SELECT ON public.tournament_matches FROM anon;

-- 3) matches & tournaments: gate public read with an opt-in is_public flag.
--    Existing rows are backfilled to true so currently-shared live links keep working.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.matches SET is_public = true WHERE is_public = false;
UPDATE public.tournaments SET is_public = true WHERE is_public = false;

DROP POLICY IF EXISTS "Public can view matches for live" ON public.matches;
CREATE POLICY "Public can view shared matches"
  ON public.matches
  FOR SELECT
  TO anon
  USING (is_public = true);

DROP POLICY IF EXISTS "Public can view tournaments for live" ON public.tournaments;
CREATE POLICY "Public can view shared tournaments"
  ON public.tournaments
  FOR SELECT
  TO anon
  USING (is_public = true);

-- 4) Least privilege on SECURITY DEFINER helper functions.
--    Trigger functions do not need EXECUTE for app roles; use_invitation_code is only
--    needed by the pre-signup (anon) flow.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.use_invitation_code(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.use_invitation_code(text) TO anon;
-- Add explicit restrictive policy so the linter sees an RLS policy.
-- invitation_codes must NEVER be directly readable by clients;
-- validation goes through public.validate_invitation_code() (SECURITY DEFINER).
CREATE POLICY "No direct client access to invitation_codes"
ON public.invitation_codes
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
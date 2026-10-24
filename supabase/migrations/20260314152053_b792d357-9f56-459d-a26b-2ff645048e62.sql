
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Authenticated can increment uses" ON public.invitation_codes;

-- Create a secure function to increment invite code usage
CREATE OR REPLACE FUNCTION public.use_invitation_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invitation_codes
  SET current_uses = current_uses + 1
  WHERE code = p_code
    AND is_active = true
    AND current_uses < max_uses;
  
  RETURN FOUND;
END;
$$;

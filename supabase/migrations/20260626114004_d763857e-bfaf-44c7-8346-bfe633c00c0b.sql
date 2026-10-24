GRANT EXECUTE ON FUNCTION public.use_invitation_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invitation_code(text) TO anon, authenticated;
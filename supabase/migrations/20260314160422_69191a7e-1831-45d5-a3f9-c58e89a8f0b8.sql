-- Sync existing auth users with profiles (idempotent)
INSERT INTO public.profiles (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Ensure production invitation code exists
INSERT INTO public.invitation_codes (code, max_uses, current_uses, is_active)
VALUES ('Primi20', 100, 0, true)
ON CONFLICT (code) DO NOTHING;

-- Remove seeded test code from all environments
DELETE FROM public.invitation_codes
WHERE code = 'BETA2026';
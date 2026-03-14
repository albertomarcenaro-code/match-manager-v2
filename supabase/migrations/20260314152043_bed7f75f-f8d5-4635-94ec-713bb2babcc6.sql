
-- 1. Create invitation_codes table
CREATE TABLE public.invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  max_uses integer NOT NULL DEFAULT 100,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to SELECT for validation during signup
CREATE POLICY "Anyone can validate invitation codes"
  ON public.invitation_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated can update (for incrementing uses)
CREATE POLICY "Authenticated can increment uses"
  ON public.invitation_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS sports_club text,
  ADD COLUMN IF NOT EXISTS category text;

-- 3. Insert a default invitation code for testing
INSERT INTO public.invitation_codes (code, max_uses, current_uses)
VALUES ('BETA2026', 100, 0);

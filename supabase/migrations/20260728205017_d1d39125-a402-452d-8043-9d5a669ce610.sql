ALTER TABLE public.saved_teams
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS fiscal_code text,
  ADD COLUMN IF NOT EXISTS sdi_code text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS logo_url text;

DROP INDEX IF EXISTS public.saved_teams_user_name_unique;

DROP POLICY IF EXISTS "Users can view own team logos" ON storage.objects;
CREATE POLICY "Users can view own team logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'team-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload own team logos" ON storage.objects;
CREATE POLICY "Users can upload own team logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'team-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own team logos" ON storage.objects;
CREATE POLICY "Users can update own team logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'team-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own team logos" ON storage.objects;
CREATE POLICY "Users can delete own team logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'team-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
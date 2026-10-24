DROP POLICY IF EXISTS "Users manage own team members" ON public.team_members;
CREATE POLICY "Users manage own team members" ON public.team_members
FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
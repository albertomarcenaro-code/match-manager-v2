-- Add UPDATE policy for matches table
CREATE POLICY "Users can update their own matches"
ON public.matches
FOR UPDATE
USING (auth.uid() = user_id);
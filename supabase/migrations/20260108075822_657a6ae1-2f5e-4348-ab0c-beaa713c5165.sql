-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament_matches table
CREATE TABLE public.tournament_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  player_stats JSONB NOT NULL DEFAULT '[]',
  events JSONB NOT NULL DEFAULT '[]',
  period_scores JSONB NOT NULL DEFAULT '[]',
  match_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Tournament policies
CREATE POLICY "Users can view their own tournaments" ON public.tournaments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tournaments" ON public.tournaments FOR DELETE USING (auth.uid() = user_id);

-- Tournament matches policies
CREATE POLICY "Users can view their own tournament matches" ON public.tournament_matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tournament matches" ON public.tournament_matches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tournament matches" ON public.tournament_matches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tournament matches" ON public.tournament_matches FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
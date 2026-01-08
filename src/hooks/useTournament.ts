import { useState, useCallback, useEffect } from 'react';
import { TournamentState, TournamentPlayer, TournamentMatch, TournamentPlayerMatchStats } from '@/types/tournament';
import { MatchEvent, PeriodScore } from '@/types/match';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

const TOURNAMENT_STORAGE_KEY = 'tournament-state';

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyTournament = (): TournamentState => ({
  id: generateId(),
  name: '',
  teamName: '',
  players: [],
  matches: [],
  isActive: false,
  createdAt: new Date().toISOString(),
});

const loadFromLocalStorage = (): TournamentState | null => {
  try {
    const saved = localStorage.getItem(TOURNAMENT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && 'isActive' in parsed) {
        return parsed;
      }
    }
    return null;
  } catch (e) {
    console.error('Failed to load tournament from localStorage:', e);
    return null;
  }
};

const saveToLocalStorage = (state: TournamentState) => {
  try {
    localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save tournament to localStorage:', e);
  }
};

export function useTournament() {
  const { user, isGuest } = useAuth();
  const [tournament, setTournament] = useState<TournamentState>(() => {
    return loadFromLocalStorage() || createEmptyTournament();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [dbTournamentId, setDbTournamentId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isGuest) {
      loadFromDatabase();
    }
  }, [user, isGuest]);

  useEffect(() => {
    if (tournament.id) {
      saveToLocalStorage(tournament);
    }
  }, [tournament]);

  const loadFromDatabase = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (tournamentError) throw tournamentError;

      if (tournamentData) {
        setDbTournamentId(tournamentData.id);
        
        const { data: matchesData, error: matchesError } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentData.id)
          .order('match_date', { ascending: true });

        if (matchesError) throw matchesError;

        const players = (tournamentData.players as unknown as TournamentPlayer[]) || [];
        const matches: TournamentMatch[] = (matchesData || []).map(m => ({
          id: m.id,
          date: m.match_date,
          homeTeamName: m.home_team_name,
          awayTeamName: m.away_team_name,
          homeScore: m.home_score,
          awayScore: m.away_score,
          playerStats: (m.player_stats as unknown as TournamentPlayerMatchStats[]) || [],
          events: (m.events as unknown as MatchEvent[]) || [],
          periodScores: (m.period_scores as unknown as PeriodScore[]) || [],
        }));

        const loadedTournament: TournamentState = {
          id: tournamentData.id,
          name: tournamentData.name,
          teamName: tournamentData.team_name,
          players,
          matches,
          isActive: tournamentData.is_active,
          createdAt: tournamentData.created_at,
        };

        setTournament(loadedTournament);
        saveToLocalStorage(loadedTournament);
      }
    } catch (error) {
      console.error('Failed to load tournament from database:', error);
      const local = loadFromLocalStorage();
      if (local) setTournament(local);
    } finally {
      setIsLoading(false);
    }
  };

  const startTournament = useCallback(async (name: string, teamName: string, players: { name: string; number: number | null }[]) => {
    const tournamentPlayers: TournamentPlayer[] = players.map(p => ({
      id: generateId(),
      name: p.name,
      number: p.number,
      totalGoals: 0,
      totalMinutes: 0,
      totalYellowCards: 0,
      totalRedCards: 0,
      matchesPlayed: 0,
    }));

    const newTournament: TournamentState = {
      id: generateId(),
      name,
      teamName,
      players: tournamentPlayers,
      matches: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setTournament(newTournament);
    saveToLocalStorage(newTournament);

    if (user && !isGuest) {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .insert({
            user_id: user.id,
            name,
            team_name: teamName,
            players: JSON.parse(JSON.stringify(tournamentPlayers)) as Json,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setDbTournamentId(data.id);
          setTournament(prev => ({ ...prev, id: data.id }));
        }
      } catch (error) {
        console.error('Failed to save tournament to database:', error);
      }
    }

    toast.success('Torneo avviato!');
  }, [user, isGuest]);

  const endTournament = useCallback(async () => {
    if (user && !isGuest && dbTournamentId) {
      try {
        await supabase
          .from('tournaments')
          .update({ is_active: false })
          .eq('id', dbTournamentId);
      } catch (error) {
        console.error('Failed to end tournament in database:', error);
      }
    }

    const emptyTournament = createEmptyTournament();
    setTournament(emptyTournament);
    setDbTournamentId(null);
    localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
    toast.success('Torneo terminato');
  }, [user, isGuest, dbTournamentId]);

  const addMatchToTournament = useCallback(async (
    homeTeamName: string,
    awayTeamName: string,
    homeScore: number,
    awayScore: number,
    playerStats: TournamentPlayerMatchStats[],
    events: MatchEvent[],
    periodScores: PeriodScore[]
  ) => {
    const matchId = generateId();
    const match: TournamentMatch = {
      id: matchId,
      date: new Date().toISOString(),
      homeTeamName,
      awayTeamName,
      homeScore,
      awayScore,
      playerStats,
      events,
      periodScores,
    };

    setTournament(prev => {
      const updatedPlayers = prev.players.map(player => {
        const stats = playerStats.find(ps => ps.playerName === player.name);
        if (stats) {
          return {
            ...player,
            totalGoals: player.totalGoals + stats.goals,
            totalMinutes: player.totalMinutes + stats.minutes,
            totalYellowCards: player.totalYellowCards + stats.yellowCards,
            totalRedCards: player.totalRedCards + stats.redCards,
            matchesPlayed: player.matchesPlayed + (stats.minutes > 0 ? 1 : 0),
          };
        }
        return player;
      });

      const newState = {
        ...prev,
        players: updatedPlayers,
        matches: [...prev.matches, match],
      };

      saveToLocalStorage(newState);
      
      if (user && !isGuest && dbTournamentId) {
        supabase
          .from('tournaments')
          .update({ players: JSON.parse(JSON.stringify(updatedPlayers)) as Json })
          .eq('id', dbTournamentId)
          .then(({ error }) => {
            if (error) console.error('Failed to update tournament players:', error);
          });
      }

      return newState;
    });

    if (user && !isGuest && dbTournamentId) {
      try {
        const { data, error } = await supabase
          .from('tournament_matches')
          .insert({
            tournament_id: dbTournamentId,
            user_id: user.id,
            home_team_name: homeTeamName,
            away_team_name: awayTeamName,
            home_score: homeScore,
            away_score: awayScore,
            player_stats: JSON.parse(JSON.stringify(playerStats)) as Json,
            events: JSON.parse(JSON.stringify(events)) as Json,
            period_scores: JSON.parse(JSON.stringify(periodScores)) as Json,
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setTournament(prev => ({
            ...prev,
            matches: prev.matches.map(m => 
              m.id === matchId ? { ...m, id: data.id } : m
            ),
          }));
        }
      } catch (error) {
        console.error('Failed to save match to database:', error);
        toast.error('Partita salvata localmente');
      }
    }

    toast.success('Partita aggiunta al torneo');
  }, [user, isGuest, dbTournamentId]);

  const getTournamentPlayers = useCallback(() => {
    return tournament.players;
  }, [tournament.players]);

  const getMatchById = useCallback((matchId: string): TournamentMatch | undefined => {
    return tournament.matches.find(m => m.id === matchId);
  }, [tournament.matches]);

  return {
    tournament,
    isLoading,
    startTournament,
    endTournament,
    addMatchToTournament,
    getTournamentPlayers,
    getMatchById,
    loadFromDatabase,
  };
}

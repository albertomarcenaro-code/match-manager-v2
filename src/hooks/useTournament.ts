import { useState, useCallback, useEffect } from 'react';
import { TournamentState, TournamentPlayer, TournamentMatch, TournamentPlayerMatchStats } from '@/types/tournament';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    return saved ? JSON.parse(saved) : null;
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

  // Load from database for authenticated users
  useEffect(() => {
    if (user && !isGuest) {
      loadFromDatabase();
    }
  }, [user, isGuest]);

  // Save to localStorage whenever tournament changes
  useEffect(() => {
    if (tournament.isActive) {
      saveToLocalStorage(tournament);
    }
  }, [tournament]);

  const loadFromDatabase = async () => {
    // Tournament data is stored in localStorage for now
    // Database integration can be added later
  };

  const startTournament = useCallback((name: string, teamName: string, players: { name: string; number: number | null }[]) => {
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

    setTournament({
      id: generateId(),
      name,
      teamName,
      players: tournamentPlayers,
      matches: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    toast.success('Torneo avviato!');
  }, []);

  const endTournament = useCallback(() => {
    setTournament(prev => ({
      ...prev,
      isActive: false,
    }));
    localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
    toast.success('Torneo terminato');
  }, []);

  const addMatchToTournament = useCallback((
    homeTeamName: string,
    awayTeamName: string,
    homeScore: number,
    awayScore: number,
    playerStats: TournamentPlayerMatchStats[]
  ) => {
    const match: TournamentMatch = {
      id: generateId(),
      date: new Date().toISOString(),
      homeTeamName,
      awayTeamName,
      homeScore,
      awayScore,
      playerStats,
    };

    setTournament(prev => {
      // Update player totals
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

      return {
        ...prev,
        players: updatedPlayers,
        matches: [...prev.matches, match],
      };
    });

    toast.success('Partita aggiunta al torneo');
  }, []);

  const getTournamentPlayers = useCallback(() => {
    return tournament.players;
  }, [tournament.players]);

  return {
    tournament,
    isLoading,
    startTournament,
    endTournament,
    addMatchToTournament,
    getTournamentPlayers,
  };
}

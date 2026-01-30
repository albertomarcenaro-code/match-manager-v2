import { useState, useEffect, useCallback } from 'react';
import { MatchState, Player, TeamType, CardType } from '../types/match';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

const STORAGE_KEY = 'match_manager_state';

const initialState: MatchState = {
  homeTeam: { name: 'Casa', players: [], score: 0 },
  awayTeam: { name: 'Ospiti', players: [], score: 0 },
  events: [],
  currentPeriod: 0,
  totalPeriods: 2,
  periodDuration: 25,
  elapsedTime: 0,
  isRunning: false,
  isPaused: false,
  isMatchStarted: false,
  isMatchEnded: false,
  needsStarterSelection: true,
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useMatch = () => {
  const { id } = useParams();

  const [state, setState] = useState<MatchState>(() => {
    if (id && (id.startsWith('new-') || id.startsWith('quick-'))) {
      return initialState;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initialState, ...parsed };
      } catch (e) {
        return initialState;
      }
    }
    return initialState;
  });

  useEffect(() => {
    if (id && (id.startsWith('new-') || id.startsWith('quick-'))) {
      setState(initialState);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setHomeTeamName = (name: string) => setState(prev => ({
    ...prev, homeTeam: { ...prev.homeTeam, name }
  }));

  const setAwayTeamName = (name: string) => setState(prev => ({
    ...prev, awayTeam: { ...prev.awayTeam, name }
  }));

  const addPlayer = (name: string) => {
    const newPlayer: Player = { 
      id: generateId(), 
      name: name.toUpperCase(), 
      number: null, 
      isOnField: false, 
      isExpelled: false, 
      goals: 0, 
      cards: { yellow: 0, red: 0 } 
    };
    setState(prev => ({
      ...prev,
      homeTeam: { ...prev.homeTeam, players: [...prev.homeTeam.players, newPlayer] }
    }));
  };

  const removePlayer = useCallback((playerId: string) => {
    setState(prev => ({
      ...prev,
      homeTeam: { ...prev.homeTeam, players: prev.homeTeam.players.filter(p => p.id !== playerId) }
    }));
  }, []);

  const removeOpponentPlayer = useCallback((playerId: string) => {
    setState(prev => ({
      ...prev,
      awayTeam: { ...prev.awayTeam, players: prev.awayTeam.players.filter(p => p.id !== playerId) }
    }));
  }, []);

  const updatePlayerNumber = useCallback((playerId: string, number: number | null) => {
    setState(prev => ({
      ...prev,
      homeTeam: {
        ...prev.homeTeam,
        players: prev.homeTeam.players.map(p => p.id === playerId ? { ...p, number } : p)
      },
      awayTeam: {
        ...prev.awayTeam,
        players: prev.awayTeam.players.map(p => p.id === playerId ? { ...p, number } : p)
      }
    }));
  }, []);

  // AGGIUNTA OSPITE SINGOLO (Assicuriamo il nome)
  const addOpponentPlayer = useCallback((number: number) => {
    const newPlayer: Player = {
      id: generateId(),
      name: `OSPITE ${number}`, // <--- Forza il nome qui
      number: number,
      isOnField: false,
      isExpelled: false,
      goals: 0,
      cards: { yellow: 0, red: 0 }
    };
    setState(prev => ({
      ...prev,
      awayTeam: { ...prev.awayTeam, players: [...prev.awayTeam.players, newPlayer] }
    }));
  }, []);

  const swapTeams = useCallback(() => {
    setState(prev => ({
      ...prev,
      homeTeam: { ...prev.awayTeam },
      awayTeam: { ...prev.homeTeam }
    }));
    toast.success("Squadre scambiate");
  }, []);

  // AUTO-NUMERAZIONE (Correzione nomi generici)
  const createPlayersWithNumbers = useCallback((count: number) => {
    const newHome = Array.from({ length: count }, (_, i) => ({
      id: generateId(),
      name: `GIOCATORE ${i + 1}`,
      number: i + 1,
      isOnField: false,
      isExpelled: false,
      goals: 0,
      cards: { yellow: 0, red: 0 }
    }));
    const newAway = Array.from({ length: count }, (_, i) => ({
      id: generateId(),
      name: `OSPITE ${i + 1}`, // <--- Cambiato da AVVERSARIO a OSPITE per coerenza
      number: i + 1,
      isOnField: false,
      isExpelled: false,
      goals: 0,
      cards: { yellow: 0, red: 0 }
    }));
    setState(prev => ({
      ...prev,
      homeTeam: { ...prev.homeTeam, players: newHome },
      awayTeam: { ...prev.awayTeam, players: newAway }
    }));
    toast.success(`Generate formazioni da ${count} giocatori`);
  }, []);

  const forceStarterSelection = useCallback(() => {
    setState(prev => ({ ...prev, needsStarterSelection: true, isMatchStarted: true }));
  }, []);

  const setStarters = useCallback((playerIds: string[], isHome: boolean) => {
    setState(prev => {
      const teamKey = isHome ? 'homeTeam' : 'awayTeam';
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          players: prev[teamKey].players.map(p => ({
            ...p,
            isOnField: playerIds.includes(p.id)
          }))
        }
      };
    });
  }, []);

  const confirmStarters = useCallback(() => {
    setState(prev => ({ ...prev, needsStarterSelection: false }));
  }, []);

  const startPeriod = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentPeriod: prev.currentPeriod + 1,
      isMatchStarted: true
    }));
  }, []);

  const pauseTimer = useCallback(() => setState(prev => ({ ...prev, isRunning: false, isPaused: true })), []);
  const resumeTimer = useCallback(() => setState(prev => ({ ...prev, isRunning: true, isPaused: false })), []);

  const recordGoal = useCallback((team: TeamType, playerId: string) => {
    setState(prev => {
      const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          score: prev[teamKey].score + 1,
          players: prev[teamKey].players.map(p => p.id === playerId ? { ...p, goals: p.goals + 1 } : p)
        },
        events: [{ id: generateId(), type: 'goal', team, playerId, timestamp: prev.elapsedTime, period: prev.currentPeriod }, ...prev.events]
      };
    });
  }, []);

  const recordCard = useCallback((team: TeamType, playerId: string, type: CardType) => {
    setState(prev => {
      const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          players: prev[teamKey].players.map(p => {
            if (p.id !== playerId) return p;
            const newCards = { ...p.cards, [type]: p.cards[type] + 1 };
            return { ...p, cards: newCards, isExpelled: type === 'red' || newCards.yellow >= 2 };
          })
        },
        events: [{ id: generateId(), type: 'card', team, playerId, cardType: type, timestamp: prev.elapsedTime, period: prev.currentPeriod }, ...prev.events]
      };
    });
  }, []);

  const resetMatch = useCallback((keepTeams = false) => {
    if (keepTeams) {
      setState(prev => ({ ...initialState, homeTeam: { ...prev.homeTeam, score: 0 }, awayTeam: { ...prev.awayTeam, score: 0 } }));
    } else {
      setState(initialState);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    state, setHomeTeamName, setAwayTeamName, addPlayer, setStarters, confirmStarters,
    startPeriod, pauseTimer, resumeTimer, recordGoal, recordCard, resetMatch, 
    forceStarterSelection, updatePlayerNumber, removePlayer, addOpponentPlayer, 
    removeOpponentPlayer, createPlayersWithNumbers, swapTeams,
    bulkAddPlayers: (names: string[]) => {
      names.forEach(name => addPlayer(name));
    },
    undoLastEvent: () => {}, endPeriod: () => {}, endMatch: () => {}, recordOwnGoal: () => {}, recordSubstitution: () => {}
  };
};

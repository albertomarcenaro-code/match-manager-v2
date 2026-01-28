import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchState, MatchEvent, Player, TeamType, CardType } from '../types/match';
import { useParams } from 'react-router-dom';

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
  const { id } = useParams(); // Leggiamo l'ID dall'URL

  const [state, setState] = useState<MatchState>(() => {
    // Se l'ID indica una NUOVA partita, ignoriamo il localStorage e partiamo da zero
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

  // Effetto per resettare lo stato se l'ID cambia in "new" mentre l'app è aperta
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

  const addPlayer = (team: TeamType, player: Omit<Player, 'id' | 'isOnField' | 'isExpelled' | 'goals' | 'cards'>) => {
    const newPlayer: Player = { ...player, id: generateId(), isOnField: false, isExpelled: false, goals: 0, cards: { yellow: 0, red: 0 } };
    setState(prev => ({
      ...prev,
      [team === 'home' ? 'homeTeam' : 'awayTeam']: {
        ...prev[team === 'home' ? 'homeTeam' : 'awayTeam'],
        players: [...prev[team === 'home' ? 'homeTeam' : 'awayTeam'].players, newPlayer]
      }
    }));
  };

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
    forceStarterSelection, bulkAddPlayers: () => {}, updatePlayerNumber: () => {}, 
    removePlayer: () => {}, addOpponentPlayer: () => {}, removeOpponentPlayer: () => {},
    createPlayersWithNumbers: () => {}, swapTeams: () => {}, undoLastEvent: () => {},
    endPeriod: () => {}, endMatch: () => {}, recordOwnGoal: () => {}, recordSubstitution: () => {}
  };
};

import { useState, useCallback, useRef, useEffect } from 'react';
import { MatchState, MatchEvent, Player, OpponentPlayer, PeriodScore } from '@/types/match';

const generateId = () => Math.random().toString(36).substring(2, 9);

const STORAGE_KEY = 'match-manager-state';

const createInitialState = (): MatchState => ({
  homeTeam: {
    name: '',
    players: [],
    score: 0,
  },
  awayTeam: {
    name: '',
    players: [],
    score: 0,
  },
  events: [],
  currentPeriod: 0,
  periodDuration: 20,
  totalPeriods: 99,
  elapsedTime: 0,
  isRunning: false,
  isPaused: false,
  isMatchStarted: false,
  isMatchEnded: false,
  periodScores: [],
  needsStarterSelection: true,
});

const loadStateFromStorage = (): MatchState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as MatchState;
      if (parsed.isRunning) {
        parsed.isPaused = true;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load match state from localStorage:', e);
  }
  return null;
};

const saveStateToStorage = (state: MatchState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save match state to localStorage:', e);
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
};

export function useMatch() {
  const [state, setState] = useState<MatchState>(() => {
    const saved = loadStateFromStorage();
    return saved || createInitialState();
  });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.isMatchStarted || state.homeTeam.players.some(p => p.number !== null) || state.awayTeam.players.length > 0) {
      saveStateToStorage(state);
    }
  }, [state]);

  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          const newTime = prev.elapsedTime + 1;
          const periodSeconds = prev.periodDuration * 60;
          
          if (newTime >= periodSeconds) {
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.5);
            } catch (e) {
              console.log('Audio not supported');
            }
          }
          
          return { ...prev, elapsedTime: newTime };
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, state.isPaused]);

  const setHomeTeamName = useCallback((name: string) => {
    setState(prev => ({
      ...prev,
      homeTeam: { ...prev.homeTeam, name },
    }));
  }, []);

  const setAwayTeamName = useCallback((name: string) => {
    setState(prev => ({
      ...prev,
      awayTeam: { ...prev.awayTeam, name },
    }));
  }, []);

  const addPlayer = useCallback((name: string) => {
    const player: Player = {
      id: generateId(),
      name,
      number: null,
      isOnField: false,
      isStarter: false,
    };
    setState(prev => ({
      ...prev,
      homeTeam: {
        ...prev.homeTeam,
        players: [...prev.homeTeam.players, player],
      },
    }));
  }, []);

  const bulkAddPlayers = useCallback((names: string[]) => {
    setState(prev => {
      const newPlayers: Player[] = names.map(name => ({
        id: generateId(),
        name,
        number: null,
        isOnField: false,
        isStarter: false,
      }));
      return {
        ...prev,
        homeTeam: {
          ...prev.homeTeam,
          players: newPlayers,
        },
      };
    });
  }, []);

  const updatePlayerNumber = useCallback((playerId: string, number: number | null) => {
    setState(prev => ({
      ...prev,
      homeTeam: {
        ...prev.homeTeam,
        players: prev.homeTeam.players.map(p =>
          p.id === playerId ? { ...p, number } : p
        ),
      },
    }));
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    setState(prev => ({
      ...prev,
      homeTeam: {
        ...prev.homeTeam,
        players: prev.homeTeam.players.filter(p => p.id !== playerId),
      },
    }));
  }, []);

  const addOpponentPlayer = useCallback((number: number) => {
    const player: OpponentPlayer = {
      id: generateId(),
      number,
      isOnField: false,
    };
    setState(prev => ({
      ...prev,
      awayTeam: {
        ...prev.awayTeam,
        players: [...prev.awayTeam.players, player],
      },
    }));
  }, []);

  const removeOpponentPlayer = useCallback((playerId: string) => {
    setState(prev => ({
      ...prev,
      awayTeam: {
        ...prev.awayTeam,
        players: prev.awayTeam.players.filter(p => p.id !== playerId),
      },
    }));
  }, []);

  const setStarters = useCallback((playerIds: string[], isHome: boolean) => {
    setState(prev => {
      if (isHome) {
        return {
          ...prev,
          homeTeam: {
            ...prev.homeTeam,
            players: prev.homeTeam.players.map(p => ({
              ...p,
              isStarter: playerIds.includes(p.id),
              isOnField: playerIds.includes(p.id),
            })),
          },
        };
      } else {
        return {
          ...prev,
          awayTeam: {
            ...prev.awayTeam,
            players: prev.awayTeam.players.map(p => ({
              ...p,
              isOnField: playerIds.includes(p.id),
            })),
          },
        };
      }
    });
  }, []);

  const confirmStarters = useCallback(() => {
    setState(prev => ({
      ...prev,
      needsStarterSelection: false,
    }));
  }, []);

  const setPeriodDuration = useCallback((minutes: number) => {
    setState(prev => ({ ...prev, periodDuration: minutes }));
  }, []);

  const setTotalPeriods = useCallback((periods: number) => {
    setState(prev => ({ ...prev, totalPeriods: periods }));
  }, []);

  const addEvent = useCallback((event: Omit<MatchEvent, 'id'>) => {
    const newEvent: MatchEvent = { ...event, id: generateId() };
    setState(prev => ({
      ...prev,
      events: [...prev.events, newEvent],
    }));
  }, []);

  const undoLastEvent = useCallback(() => {
    setState(prev => {
      if (prev.events.length === 0) return prev;
      
      const lastEvent = prev.events[prev.events.length - 1];
      let newState = { ...prev, events: prev.events.slice(0, -1) };

      if (lastEvent.type === 'goal') {
        if (lastEvent.team === 'home') {
          newState.homeTeam = { ...newState.homeTeam, score: newState.homeTeam.score - 1 };
        } else {
          newState.awayTeam = { ...newState.awayTeam, score: newState.awayTeam.score - 1 };
        }
      } else if (lastEvent.type === 'own_goal') {
        if (lastEvent.team === 'home') {
          newState.awayTeam = { ...newState.awayTeam, score: newState.awayTeam.score - 1 };
        } else {
          newState.homeTeam = { ...newState.homeTeam, score: newState.homeTeam.score - 1 };
        }
      } else if (lastEvent.type === 'substitution') {
        if (lastEvent.team === 'home') {
          newState.homeTeam = {
            ...newState.homeTeam,
            players: newState.homeTeam.players.map(p => {
              if (p.id === lastEvent.playerOutId) return { ...p, isOnField: true };
              if (p.id === lastEvent.playerInId) return { ...p, isOnField: false };
              return p;
            }),
          };
        } else {
          newState.awayTeam = {
            ...newState.awayTeam,
            players: newState.awayTeam.players.map(p => {
              if (p.id === lastEvent.playerOutId) return { ...p, isOnField: true };
              if (p.id === lastEvent.playerInId) return { ...p, isOnField: false };
              return p;
            }),
          };
        }
      } else if (lastEvent.type === 'red_card') {
        if (lastEvent.team === 'home') {
          newState.homeTeam = {
            ...newState.homeTeam,
            players: newState.homeTeam.players.map(p =>
              p.id === lastEvent.playerId ? { ...p, isOnField: true, isExpelled: false } : p
            ),
          };
        } else {
          newState.awayTeam = {
            ...newState.awayTeam,
            players: newState.awayTeam.players.map(p =>
              p.id === lastEvent.playerId ? { ...p, isOnField: true, isExpelled: false } : p
            ),
          };
        }
      }

      return newState;
    });
  }, []);

  const startPeriod = useCallback(() => {
    setState(prev => {
      const newPeriod = prev.currentPeriod + 1;
      const event: MatchEvent = {
        id: generateId(),
        type: 'period_start',
        timestamp: 0,
        period: newPeriod,
        team: 'home',
        description: `Inizio ${newPeriod}° tempo`,
      };
      
      return {
        ...prev,
        currentPeriod: newPeriod,
        elapsedTime: 0,
        isRunning: true,
        isPaused: false,
        isMatchStarted: true,
        needsStarterSelection: false,
        events: [...prev.events, event],
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeTimer = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const endPeriod = useCallback(() => {
    setState(prev => {
      const previousPeriodScore = prev.periodScores.reduce(
        (acc, ps) => ({ home: acc.home + ps.homeScore, away: acc.away + ps.awayScore }),
        { home: 0, away: 0 }
      );
      
      const periodScore: PeriodScore = {
        period: prev.currentPeriod,
        homeScore: prev.homeTeam.score - previousPeriodScore.home,
        awayScore: prev.awayTeam.score - previousPeriodScore.away,
      };

      const event: MatchEvent = {
        id: generateId(),
        type: 'period_end',
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        team: 'home',
        homeScore: prev.homeTeam.score,
        awayScore: prev.awayTeam.score,
        description: `Fine ${prev.currentPeriod}° tempo - ${prev.homeTeam.name} ${prev.homeTeam.score} - ${prev.awayTeam.score} ${prev.awayTeam.name}`,
      };

      return {
        ...prev,
        isRunning: false,
        isPaused: false,
        isMatchEnded: false,
        needsStarterSelection: true,
        periodScores: [...prev.periodScores, periodScore],
        events: [...prev.events, event],
      };
    });
  }, []);

  const endMatch = useCallback(() => {
    setState(prev => {
      let newState = { ...prev };
      
      if (prev.isRunning) {
        const previousPeriodScore = prev.periodScores.reduce(
          (acc, ps) => ({ home: acc.home + ps.homeScore, away: acc.away + ps.awayScore }),
          { home: 0, away: 0 }
        );
        
        const periodScore: PeriodScore = {
          period: prev.currentPeriod,
          homeScore: prev.homeTeam.score - previousPeriodScore.home,
          awayScore: prev.awayTeam.score - previousPeriodScore.away,
        };

        const periodEndEvent: MatchEvent = {
          id: generateId(),
          type: 'period_end',
          timestamp: prev.elapsedTime,
          period: prev.currentPeriod,
          team: 'home',
          homeScore: prev.homeTeam.score,
          awayScore: prev.awayTeam.score,
          description: `Fine ${prev.currentPeriod}° tempo - ${prev.homeTeam.name} ${prev.homeTeam.score} - ${prev.awayTeam.score} ${prev.awayTeam.name}`,
        };

        newState = {
          ...newState,
          periodScores: [...prev.periodScores, periodScore],
          events: [...prev.events, periodEndEvent],
        };
      }

      return {
        ...newState,
        isRunning: false,
        isPaused: false,
        isMatchEnded: true,
        needsStarterSelection: false,
      };
    });
  }, []);

  const recordGoal = useCallback((team: 'home' | 'away', playerId: string) => {
    setState(prev => {
      let playerName = '';
      let playerNumber: number | undefined;

      if (team === 'home') {
        const player = prev.homeTeam.players.find(p => p.id === playerId);
        playerName = player?.name || '';
        playerNumber = player?.number || undefined;
      } else {
        const player = prev.awayTeam.players.find(p => p.id === playerId);
        playerNumber = player?.number;
        playerName = `#${playerNumber}`;
      }

      const event: MatchEvent = {
        id: generateId(),
        type: 'goal',
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        team,
        playerId,
        playerName,
        playerNumber,
        description: `⚽ GOL! ${playerName} (${team === 'home' ? prev.homeTeam.name : prev.awayTeam.name})`,
      };

      return {
        ...prev,
        homeTeam: team === 'home' 
          ? { ...prev.homeTeam, score: prev.homeTeam.score + 1 }
          : prev.homeTeam,
        awayTeam: team === 'away'
          ? { ...prev.awayTeam, score: prev.awayTeam.score + 1 }
          : prev.awayTeam,
        events: [...prev.events, event],
      };
    });
  }, []);

  const recordOwnGoal = useCallback((team: 'home' | 'away', playerId?: string) => {
    setState(prev => {
      let playerName = '';
      let playerNumber: number | undefined;

      if (playerId) {
        if (team === 'home') {
          const player = prev.homeTeam.players.find(p => p.id === playerId);
          playerName = player?.name || '';
          playerNumber = player?.number || undefined;
        } else {
          const player = prev.awayTeam.players.find(p => p.id === playerId);
          playerNumber = player?.number;
          playerName = `#${playerNumber}`;
        }
      }

      const event: MatchEvent = {
        id: generateId(),
        type: 'own_goal',
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        team,
        playerId,
        playerName: playerName || 'Autogol',
        playerNumber,
        description: `⚽ AUTOGOL ${playerName ? `di ${playerName}` : ''} (${team === 'home' ? prev.homeTeam.name : prev.awayTeam.name})`,
      };

      return {
        ...prev,
        homeTeam: team === 'away' 
          ? { ...prev.homeTeam, score: prev.homeTeam.score + 1 }
          : prev.homeTeam,
        awayTeam: team === 'home'
          ? { ...prev.awayTeam, score: prev.awayTeam.score + 1 }
          : prev.awayTeam,
        events: [...prev.events, event],
      };
    });
  }, []);

  const recordSubstitution = useCallback((team: 'home' | 'away', playerOutId: string, playerInId: string) => {
    setState(prev => {
      let playerOutName = '';
      let playerInName = '';
      let playerOutNumber: number | undefined;
      let playerInNumber: number | undefined;

      if (team === 'home') {
        const playerOut = prev.homeTeam.players.find(p => p.id === playerOutId);
        const playerIn = prev.homeTeam.players.find(p => p.id === playerInId);
        playerOutName = playerOut?.name || '';
        playerInName = playerIn?.name || '';
        playerOutNumber = playerOut?.number || undefined;
        playerInNumber = playerIn?.number || undefined;
      } else {
        const playerOut = prev.awayTeam.players.find(p => p.id === playerOutId);
        const playerIn = prev.awayTeam.players.find(p => p.id === playerInId);
        playerOutNumber = playerOut?.number;
        playerInNumber = playerIn?.number;
        playerOutName = `#${playerOutNumber}`;
        playerInName = `#${playerInNumber}`;
      }

      const event: MatchEvent = {
        id: generateId(),
        type: 'substitution',
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        team,
        playerOutId,
        playerInId,
        playerOutName,
        playerInName,
        playerOutNumber,
        playerInNumber,
        description: `🔄 ${playerOutName} ➡️ ${playerInName}`,
      };

      if (team === 'home') {
        return {
          ...prev,
          homeTeam: {
            ...prev.homeTeam,
            players: prev.homeTeam.players.map(p => {
              if (p.id === playerOutId) return { ...p, isOnField: false };
              if (p.id === playerInId) return { ...p, isOnField: true };
              return p;
            }),
          },
          events: [...prev.events, event],
        };
      } else {
        return {
          ...prev,
          awayTeam: {
            ...prev.awayTeam,
            players: prev.awayTeam.players.map(p => {
              if (p.id === playerOutId) return { ...p, isOnField: false };
              if (p.id === playerInId) return { ...p, isOnField: true };
              return p;
            }),
          },
          events: [...prev.events, event],
        };
      }
    });
  }, []);

  const recordCard = useCallback((team: 'home' | 'away', playerId: string, cardType: 'yellow' | 'red') => {
    setState(prev => {
      let playerName = '';
      let playerNumber: number | undefined;

      if (team === 'home') {
        const player = prev.homeTeam.players.find(p => p.id === playerId);
        playerName = player?.name || '';
        playerNumber = player?.number || undefined;
      } else {
        const player = prev.awayTeam.players.find(p => p.id === playerId);
        playerNumber = player?.number;
        playerName = `#${playerNumber}`;
      }

      const event: MatchEvent = {
        id: generateId(),
        type: cardType === 'yellow' ? 'yellow_card' : 'red_card',
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        team,
        playerId,
        playerName,
        playerNumber,
        description: `${cardType === 'yellow' ? '🟨' : '🟥'} Cartellino ${cardType === 'yellow' ? 'giallo' : 'rosso'} per ${playerName}`,
      };

      let newState = { ...prev, events: [...prev.events, event] };

      if (cardType === 'red') {
        if (team === 'home') {
          newState.homeTeam = {
            ...newState.homeTeam,
            players: newState.homeTeam.players.map(p =>
              p.id === playerId ? { ...p, isOnField: false, isExpelled: true } : p
            ),
          };
        } else {
          newState.awayTeam = {
            ...newState.awayTeam,
            players: newState.awayTeam.players.map(p =>
              p.id === playerId ? { ...p, isOnField: false, isExpelled: true } : p
            ),
          };
        }
      }

      return newState;
    });
  }, []);

  const resetMatch = useCallback(() => {
    clearStorage();
    setState(createInitialState());
  }, []);

  const forceStarterSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      needsStarterSelection: true,
    }));
  }, []);

  return {
    state,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    bulkAddPlayers,
    updatePlayerNumber,
    removePlayer,
    addOpponentPlayer,
    removeOpponentPlayer,
    setStarters,
    confirmStarters,
    setPeriodDuration,
    setTotalPeriods,
    addEvent,
    undoLastEvent,
    startPeriod,
    pauseTimer,
    resumeTimer,
    endPeriod,
    endMatch,
    recordGoal,
    recordOwnGoal,
    recordSubstitution,
    recordCard,
    resetMatch,
    forceStarterSelection,
  };
}

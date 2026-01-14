import { useState, useCallback, useRef, useEffect } from 'react';
import { MatchState, MatchEvent, Player, PeriodScore } from '@/types/match';
import { clearTimerState } from './useTimestamp';

const generateId = () => Math.random().toString(36).substring(2, 9);

const STORAGE_KEY = 'match-manager-state';
const TIMER_STATE_KEY = 'match-timer-state';

interface TimerPersistence {
  startTimestamp: number | null;
  pausedAt: number | null;
  isRunning: boolean;
  isPaused: boolean;
}

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
  periodDuration: 15, // Default 15 minuti
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
      
      // Restore timer state from timestamp-based storage
      const timerSaved = localStorage.getItem(TIMER_STATE_KEY);
      if (timerSaved) {
        const timerState: TimerPersistence = JSON.parse(timerSaved);
        
        if (timerState.isRunning && !timerState.isPaused && timerState.startTimestamp) {
          // Calculate elapsed time from timestamp
          parsed.elapsedTime = Math.floor((Date.now() - timerState.startTimestamp) / 1000);
          parsed.isRunning = true;
          parsed.isPaused = false;
        } else if (timerState.isPaused && timerState.pausedAt !== null) {
          parsed.elapsedTime = timerState.pausedAt;
          parsed.isRunning = true;
          parsed.isPaused = true;
        }
      } else if (parsed.isRunning) {
        // Fallback: if no timer state but match was running, pause it
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

const saveTimerState = (startTimestamp: number | null, pausedAt: number | null, isRunning: boolean, isPaused: boolean) => {
  try {
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
      startTimestamp,
      pausedAt,
      isRunning,
      isPaused,
    }));
  } catch (e) {
    console.error('Failed to save timer state:', e);
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TIMER_STATE_KEY);
    clearTimerState();
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
  const startTimestampRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.isMatchStarted || state.homeTeam.players.some(p => p.number !== null) || state.awayTeam.players.length > 0) {
      saveStateToStorage(state);
    }
  }, [state]);

  const audioPlayedRef = useRef<boolean>(false);

  // Reset audio played flag when period changes
  useEffect(() => {
    audioPlayedRef.current = false;
  }, [state.currentPeriod]);

  // Timestamp-based timer effect
  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      // Initialize start timestamp if not set
      if (!startTimestampRef.current) {
        startTimestampRef.current = Date.now() - (state.elapsedTime * 1000);
      }
      
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          const newTime = Math.floor((Date.now() - (startTimestampRef.current || Date.now())) / 1000);
          const periodSeconds = prev.periodDuration * 60;
          
          // Play audio alert only once when time is up
          if (newTime >= periodSeconds && !audioPlayedRef.current) {
            audioPlayedRef.current = true;
            playEndPeriodAlert();
          }
          
          return { ...prev, elapsedTime: newTime };
        });
      }, 1000);
      
      // Save timer state
      saveTimerState(startTimestampRef.current, null, true, false);
    } else if (state.isPaused) {
      pausedAtRef.current = state.elapsedTime;
      saveTimerState(startTimestampRef.current, state.elapsedTime, true, true);
    }

    if (timerRef.current && (!state.isRunning || state.isPaused)) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, state.isPaused]);

  const playEndPeriodAlert = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play a whistle-like sound (three short beeps)
      const playBeep = (startTime: number, frequency: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Three ascending beeps like a referee whistle
      playBeep(audioContext.currentTime, 800, 0.15);
      playBeep(audioContext.currentTime + 0.2, 1000, 0.15);
      playBeep(audioContext.currentTime + 0.4, 1200, 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

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
      // Deduplicate names to prevent roster duplication
      const uniqueNames = [...new Set(names)];
      const newPlayers: Player[] = uniqueNames.map(name => ({
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

  // Create players with automatic numbering (for guest mode)
  const createPlayersWithNumbers = useCallback((count: number) => {
    setState(prev => {
      const existingNumbers = new Set(prev.homeTeam.players.map(p => p.number).filter(n => n !== null));
      let nextNumber = 1;
      
      const newPlayers: Player[] = [];
      for (let i = 0; i < count; i++) {
        while (existingNumbers.has(nextNumber)) {
          nextNumber++;
        }
        newPlayers.push({
          id: generateId(),
          name: `Giocatore ${nextNumber}`,
          number: nextNumber,
          isOnField: false,
          isStarter: false,
        });
        existingNumbers.add(nextNumber);
        nextNumber++;
      }
      
      return {
        ...prev,
        homeTeam: {
          ...prev.homeTeam,
          players: [...prev.homeTeam.players, ...newPlayers],
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

  const addOpponentPlayer = useCallback((number: number, name?: string) => {
    const player: Player = {
      id: generateId(),
      name: name || `Giocatore #${number}`,
      number,
      isOnField: false,
      isStarter: false,
    };
    setState(prev => ({
      ...prev,
      awayTeam: {
        ...prev.awayTeam,
        players: [...prev.awayTeam.players, player],
      },
    }));
  }, []);

  // Add a player to home team with name and number (for bench additions during match)
  const addHomePlayerWithNumber = useCallback((name: string, number: number) => {
    const player: Player = {
      id: generateId(),
      name,
      number,
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

  // Add a player to away team with name and number (for bench additions during match)
  const addAwayPlayerWithNumber = useCallback((name: string, number: number) => {
    const player: Player = {
      id: generateId(),
      name,
      number,
      isOnField: false,
      isStarter: false,
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
      const apply = (players: Player[]) =>
        players.map(p => ({
          ...p,
          isStarter: playerIds.includes(p.id),
          isOnField: playerIds.includes(p.id),
        }));

      return isHome
        ? {
            ...prev,
            homeTeam: { ...prev.homeTeam, players: apply(prev.homeTeam.players) },
          }
        : {
            ...prev,
            awayTeam: { ...prev.awayTeam, players: apply(prev.awayTeam.players) },
          };
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

  const startPeriod = useCallback((duration?: number) => {
    // Reset timestamp for new period
    startTimestampRef.current = Date.now();
    pausedAtRef.current = null;
    audioPlayedRef.current = false;
    
    setState(prev => {
      const newPeriod = prev.currentPeriod + 1;
      const periodDuration = duration !== undefined ? duration : prev.periodDuration;
      
      const newEvents: MatchEvent[] = [];
      
      // Period start event
      const periodStartEvent: MatchEvent = {
        id: generateId(),
        type: 'period_start',
        timestamp: 0,
        period: newPeriod,
        team: 'home',
        description: `Inizio ${newPeriod}° tempo (${periodDuration} min)`,
      };
      newEvents.push(periodStartEvent);
      
      // Register player_in events for all players currently on field
      // This creates a clear record of who started each period
      prev.homeTeam.players.filter(p => p.isOnField && !p.isExpelled).forEach(p => {
        newEvents.push({
          id: generateId(),
          type: 'player_in',
          timestamp: 0,
          period: newPeriod,
          team: 'home',
          playerId: p.id,
          playerName: p.name,
          playerNumber: p.number ?? undefined,
          description: `IN: ${p.name} (#${p.number})`,
        });
      });
      
      prev.awayTeam.players.filter(p => p.isOnField && !p.isExpelled).forEach(p => {
        newEvents.push({
          id: generateId(),
          type: 'player_in',
          timestamp: 0,
          period: newPeriod,
          team: 'away',
          playerId: p.id,
          playerName: p.name || `#${p.number}`,
          playerNumber: p.number ?? undefined,
          description: `IN: ${p.name || `#${p.number}`}`,
        });
      });
      
      // Save timer state immediately
      saveTimerState(Date.now(), null, true, false);
      
      return {
        ...prev,
        currentPeriod: newPeriod,
        periodDuration,
        elapsedTime: 0,
        isRunning: true,
        isPaused: false,
        isMatchStarted: true,
        needsStarterSelection: false,
        events: [...prev.events, ...newEvents],
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    pausedAtRef.current = state.elapsedTime;
    saveTimerState(startTimestampRef.current, state.elapsedTime, true, true);
    setState(prev => ({ ...prev, isPaused: true }));
  }, [state.elapsedTime]);

  const resumeTimer = useCallback(() => {
    // Recalculate start timestamp based on paused elapsed time
    if (pausedAtRef.current !== null) {
      startTimestampRef.current = Date.now() - (pausedAtRef.current * 1000);
    }
    saveTimerState(startTimestampRef.current, null, true, false);
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

      const newEvents: MatchEvent[] = [];
      
      // Register player_out events for all players currently on field
      // This closes all intervals for this period
      prev.homeTeam.players.filter(p => p.isOnField && !p.isExpelled).forEach(p => {
        newEvents.push({
          id: generateId(),
          type: 'player_out',
          timestamp: prev.elapsedTime,
          period: prev.currentPeriod,
          team: 'home',
          playerId: p.id,
          playerName: p.name,
          playerNumber: p.number ?? undefined,
          description: `OUT: ${p.name} (#${p.number})`,
        });
      });
      
      prev.awayTeam.players.filter(p => p.isOnField && !p.isExpelled).forEach(p => {
        newEvents.push({
          id: generateId(),
          type: 'player_out',
          timestamp: prev.elapsedTime,
          period: prev.currentPeriod,
          team: 'away',
          playerId: p.id,
          playerName: p.name || `#${p.number}`,
          playerNumber: p.number ?? undefined,
          description: `OUT: ${p.name || `#${p.number}`}`,
        });
      });

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
      newEvents.push(periodEndEvent);

      return {
        ...prev,
        isRunning: false,
        isPaused: false,
        isMatchEnded: false,
        needsStarterSelection: true,
        periodScores: [...prev.periodScores, periodScore],
        events: [...prev.events, ...newEvents],
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
    // Clear all jersey numbers and reset roster state
    // Keep player names if in tournament mode (handled by caller)
    // but always reset numbers, events, and match state
    setState(prev => {
      const resetPlayers = (players: Player[]) => 
        players.map(p => ({
          ...p,
          number: null,
          isOnField: false,
          isStarter: false,
          isExpelled: false,
        }));
      
      return {
        ...createInitialState(),
        // Preserve home team names but reset numbers
        homeTeam: {
          ...createInitialState().homeTeam,
          players: resetPlayers(prev.homeTeam.players),
        },
        // Clear away team completely
        awayTeam: createInitialState().awayTeam,
      };
    });
  }, []);

  const forceStarterSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      needsStarterSelection: true,
    }));
  }, []);

  const swapTeams = useCallback(() => {
    setState(prev => {
      const temp = prev.homeTeam;
      return {
        ...prev,
        homeTeam: prev.awayTeam,
        awayTeam: temp,
      };
    });
  }, []);

  return {
    state,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    bulkAddPlayers,
    createPlayersWithNumbers,
    updatePlayerNumber,
    removePlayer,
    addOpponentPlayer,
    addHomePlayerWithNumber,
    addAwayPlayerWithNumber,
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
    swapTeams,
  };
}

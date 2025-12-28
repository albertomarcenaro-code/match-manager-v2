import { useState, useCallback, useRef, useEffect } from 'react';
import { MatchState, MatchEvent, Player, OpponentPlayer, EventType, PeriodScore } from '@/types/match';

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialState: MatchState = {
  homeTeam: {
    name: 'Athletic Club Albaro',
    players: [],
    score: 0,
  },
  awayTeam: {
    name: 'Squadra Avversaria',
    players: [],
    score: 0,
  },
  events: [],
  currentPeriod: 0,
  periodDuration: 20,
  totalPeriods: 2,
  elapsedTime: 0,
  isRunning: false,
  isPaused: false,
  isMatchStarted: false,
  isMatchEnded: false,
  periodScores: [],
  needsStarterSelection: true,
};

export function useMatch() {
  const [state, setState] = useState<MatchState>(initialState);
  const timerRef = useRef<number | null>(null);

  // Timer effect
  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          const newTime = prev.elapsedTime + 1;
          const periodSeconds = prev.periodDuration * 60;
          
          if (newTime >= periodSeconds) {
            // Play buzzer sound
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

      // Reverse the effect of the event
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
        // Reverse substitution
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
      const periodScore: PeriodScore = {
        period: prev.currentPeriod,
        homeScore: prev.homeTeam.score,
        awayScore: prev.awayTeam.score,
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

      const isLastPeriod = prev.currentPeriod >= prev.totalPeriods;

      return {
        ...prev,
        isRunning: false,
        isPaused: false,
        isMatchEnded: isLastPeriod,
        needsStarterSelection: !isLastPeriod,
        periodScores: [...prev.periodScores, periodScore],
        events: [...prev.events, event],
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

  const recordOwnGoal = useCallback((team: 'home' | 'away', playerId: string) => {
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
        type: 'own_goal',
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        team,
        playerId,
        playerName,
        playerNumber,
        description: `⚽ AUTOGOL di ${playerName} (${team === 'home' ? prev.homeTeam.name : prev.awayTeam.name})`,
      };

      // Own goal adds to opponent's score
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

  const recordSubstitution = useCallback((
    team: 'home' | 'away',
    playerOutId: string,
    playerInId: string
  ) => {
    setState(prev => {
      let playerOutName = '';
      let playerOutNumber: number | undefined;
      let playerInName = '';
      let playerInNumber: number | undefined;

      if (team === 'home') {
        const playerOut = prev.homeTeam.players.find(p => p.id === playerOutId);
        const playerIn = prev.homeTeam.players.find(p => p.id === playerInId);
        playerOutName = playerOut?.name || '';
        playerOutNumber = playerOut?.number || undefined;
        playerInName = playerIn?.name || '';
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
        playerOutName,
        playerOutNumber,
        playerInId,
        playerInName,
        playerInNumber,
        description: `🔄 Sostituzione: ${playerInName} ⬆ ${playerOutName} ⬇`,
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

  const recordCard = useCallback((
    team: 'home' | 'away',
    playerId: string,
    cardType: 'yellow' | 'red'
  ) => {
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
        description: `${cardType === 'yellow' ? '🟨' : '🟥'} Cartellino ${cardType === 'yellow' ? 'giallo' : 'rosso'} a ${playerName}`,
      };

      return {
        ...prev,
        events: [...prev.events, event],
      };
    });
  }, []);

  const resetMatch = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
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
    recordGoal,
    recordOwnGoal,
    recordSubstitution,
    recordCard,
    resetMatch,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { MatchState, Player, TeamType, CardType, MatchEvent } from '../types/match';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

const STORAGE_KEY = 'match_manager_state';

const createEmptyPlayer = (): Player => ({
  id: '',
  name: '',
  number: null,
  isOnField: false,
  isStarter: false,
  isExpelled: false,
  goals: 0,
  cards: { yellow: 0, red: 0 },
  currentEntryTime: null,
  totalSecondsPlayed: 0,
  secondsPlayedPerPeriod: {}
});

const initialState: MatchState = {
  homeTeam: { name: 'Casa', players: [], score: 0 },
  awayTeam: { name: 'Ospiti', players: [], score: 0 },
  events: [],
  currentPeriod: 0,
  totalPeriods: 2,
  periodDuration: 15, // Default to 15 minutes
  elapsedTime: 0,
  isRunning: false,
  isPaused: false,
  isMatchStarted: false,
  isMatchEnded: false,
  needsStarterSelection: true,
  periodScores: [],
  // Timestamp-delta timer system
  periodStartTimestamp: null,
  accumulatedPauseTime: 0,
  pauseStartTimestamp: null,
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
      isStarter: false,
      isExpelled: false, 
      goals: 0, 
      cards: { yellow: 0, red: 0 },
      currentEntryTime: null,
      totalSecondsPlayed: 0,
      secondsPlayedPerPeriod: {}
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

  const addOpponentPlayer = useCallback((number: number) => {
    const newPlayer: Player = {
      id: generateId(),
      name: `OSPITE ${number}`,
      number: number,
      isOnField: false,
      isStarter: false,
      isExpelled: false,
      goals: 0,
      cards: { yellow: 0, red: 0 },
      currentEntryTime: null,
      totalSecondsPlayed: 0,
      secondsPlayedPerPeriod: {}
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

  const createPlayersWithNumbers = useCallback((count: number) => {
    // Only create HOME team players - away team is handled separately
    const newHome: Player[] = Array.from({ length: count }, (_, i) => ({
      id: generateId(),
      name: `GIOCATORE ${i + 1}`,
      number: i + 1,
      isOnField: false,
      isStarter: false,
      isExpelled: false,
      goals: 0,
      cards: { yellow: 0, red: 0 },
      currentEntryTime: null,
      totalSecondsPlayed: 0,
      secondsPlayedPerPeriod: {}
    }));
    setState(prev => ({
      ...prev,
      homeTeam: { ...prev.homeTeam, players: newHome }
    }));
    toast.success(`Creati ${count} giocatori di casa con numeri progressivi`);
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
            isOnField: playerIds.includes(p.id),
            isStarter: playerIds.includes(p.id)
          }))
        }
      };
    });
  }, []);

  const confirmStarters = useCallback(() => {
    setState(prev => ({ ...prev, needsStarterSelection: false }));
  }, []);

  const startPeriod = useCallback((duration?: number) => {
    setState(prev => {
      const newPeriod = prev.currentPeriod + 1;
      const periodStartTimestamp = Date.now(); // Capture the exact start time
      const homeStarters = prev.homeTeam.players.filter(p => p.isOnField && !p.isExpelled);
      const awayStarters = prev.awayTeam.players.filter(p => p.isOnField && !p.isExpelled);
      
      // Create period start event
      const periodStartEvent: MatchEvent = {
        id: generateId(),
        type: 'period_start',
        team: 'home',
        timestamp: 0,
        period: newPeriod,
        description: `--- INIZIO ${newPeriod}° TEMPO ---`
      };

      // Create player_in events for all starters (for time tracking)
      const homePlayerInEvents: MatchEvent[] = homeStarters.map(p => ({
        id: generateId(),
        type: 'player_in' as const,
        team: 'home' as const,
        playerId: p.id,
        playerName: `${p.name} (#${p.number})`,
        playerNumber: p.number ?? undefined,
        timestamp: 0,
        period: newPeriod,
        description: `Titolare: ${p.name}`
      }));

      const awayPlayerInEvents: MatchEvent[] = awayStarters.map(p => ({
        id: generateId(),
        type: 'player_in' as const,
        team: 'away' as const,
        playerId: p.id,
        playerName: `${p.name} (#${p.number})`,
        playerNumber: p.number ?? undefined,
        timestamp: 0,
        period: newPeriod,
        description: `Titolare: ${p.name}`
      }));

      // Events are stored newest-first, so we add them in reverse order
      const newEvents = [
        ...awayPlayerInEvents.reverse(),
        ...homePlayerInEvents.reverse(),
        periodStartEvent,
        ...prev.events
      ];

      // Set currentEntryTime for all starters (playtime tracking)
      const starterIds = new Set([...homeStarters.map(p => p.id), ...awayStarters.map(p => p.id)]);
      
      const updatedHomePlayers = prev.homeTeam.players.map(p => ({
        ...p,
        currentEntryTime: starterIds.has(p.id) ? periodStartTimestamp : p.currentEntryTime
      }));
      
      const updatedAwayPlayers = prev.awayTeam.players.map(p => ({
        ...p,
        currentEntryTime: starterIds.has(p.id) ? periodStartTimestamp : p.currentEntryTime
      }));

      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        currentPeriod: newPeriod,
        isMatchStarted: true,
        periodDuration: duration ?? prev.periodDuration,
        elapsedTime: 0,
        events: newEvents,
        homeTeam: { ...prev.homeTeam, players: updatedHomePlayers },
        awayTeam: { ...prev.awayTeam, players: updatedAwayPlayers },
        // Timestamp-delta timer system
        periodStartTimestamp: periodStartTimestamp,
        accumulatedPauseTime: 0,
        pauseStartTimestamp: null,
      };
    });
  }, []);

  // Timestamp-delta timer: Calculate elapsed time from timestamps (fixes background freezing)
  const updateElapsedTime = useCallback(() => {
    setState(prev => {
      if (!prev.isRunning || prev.isPaused || prev.periodStartTimestamp === null) {
        return prev;
      }
      
      const now = Date.now();
      const totalElapsedMs = now - prev.periodStartTimestamp - prev.accumulatedPauseTime;
      const elapsedSeconds = Math.floor(totalElapsedMs / 1000);
      
      return {
        ...prev,
        elapsedTime: Math.max(0, elapsedSeconds)
      };
    });
  }, []);

  // FIXED: Pause should keep isRunning=true but set isPaused=true
  // This allows the timer to resume correctly without resetting
  const pauseTimer = useCallback(() => setState(prev => ({ 
    ...prev, 
    isPaused: true,
    pauseStartTimestamp: Date.now() // Record when pause started
  })), []);
  
  // FIXED: Resume calculates pause duration and accumulates it
  const resumeTimer = useCallback(() => setState(prev => {
    const pauseDuration = prev.pauseStartTimestamp 
      ? Date.now() - prev.pauseStartTimestamp 
      : 0;
    
    return { 
      ...prev, 
      isPaused: false,
      accumulatedPauseTime: prev.accumulatedPauseTime + pauseDuration,
      pauseStartTimestamp: null
    };
  }), []);

  const endPeriod = useCallback(() => {
    setState(prev => {
      const periodEndTimestamp = Date.now(); // Capture the exact end time
      const currentPeriod = prev.currentPeriod;
      
      // Calculate period score as delta: goals in THIS period only
      // Sum all previous period deltas to get cumulative score before this period
      const cumulativeHomeBefore = prev.periodScores.reduce((sum, ps) => sum + ps.homeScore, 0);
      const cumulativeAwayBefore = prev.periodScores.reduce((sum, ps) => sum + ps.awayScore, 0);
      
      const newPeriodScore = {
        period: currentPeriod,
        homeScore: prev.homeTeam.score - cumulativeHomeBefore,
        awayScore: prev.awayTeam.score - cumulativeAwayBefore
      };

      // Create player_out events for all players on field (close their time intervals)
      const homePlayersOnField = prev.homeTeam.players.filter(p => p.isOnField);
      const awayPlayersOnField = prev.awayTeam.players.filter(p => p.isOnField);

      const homePlayerOutEvents: MatchEvent[] = homePlayersOnField.map(p => ({
        id: generateId(),
        type: 'player_out' as const,
        team: 'home' as const,
        playerId: p.id,
        playerName: p.name,
        playerNumber: p.number ?? undefined,
        timestamp: prev.elapsedTime,
        period: currentPeriod,
        description: `Fine tempo: ${p.name}`
      }));

      const awayPlayerOutEvents: MatchEvent[] = awayPlayersOnField.map(p => ({
        id: generateId(),
        type: 'player_out' as const,
        team: 'away' as const,
        playerId: p.id,
        playerName: p.name,
        playerNumber: p.number ?? undefined,
        timestamp: prev.elapsedTime,
        period: currentPeriod,
        description: `Fine tempo: ${p.name}`
      }));

      // Create period end event
      const periodEndEvent: MatchEvent = {
        id: generateId(),
        type: 'period_end',
        team: 'home',
        timestamp: prev.elapsedTime,
        period: currentPeriod,
        homeScore: prev.homeTeam.score,
        awayScore: prev.awayTeam.score,
        description: `--- FINE ${currentPeriod}° TEMPO - Parziale: ${prev.homeTeam.score}-${prev.awayTeam.score} ---`
      };

      // Events are stored newest-first
      const newEvents = [
        periodEndEvent,
        ...homePlayerOutEvents.reverse(),
        ...awayPlayerOutEvents.reverse(),
        ...prev.events
      ];

      // Calculate and add playtime for all players on field, then reset currentEntryTime
      // Also update per-period stats
      const updatedHomePlayers = prev.homeTeam.players.map(p => {
        if (p.isOnField && p.currentEntryTime !== null) {
          const addedSeconds = Math.floor((periodEndTimestamp - p.currentEntryTime) / 1000);
          const updatedPerPeriod = { ...p.secondsPlayedPerPeriod };
          updatedPerPeriod[currentPeriod] = (updatedPerPeriod[currentPeriod] || 0) + addedSeconds;
          
          return {
            ...p,
            totalSecondsPlayed: p.totalSecondsPlayed + addedSeconds,
            secondsPlayedPerPeriod: updatedPerPeriod,
            currentEntryTime: null
          };
        }
        return { ...p, currentEntryTime: null };
      });

      const updatedAwayPlayers = prev.awayTeam.players.map(p => {
        if (p.isOnField && p.currentEntryTime !== null) {
          const addedSeconds = Math.floor((periodEndTimestamp - p.currentEntryTime) / 1000);
          const updatedPerPeriod = { ...p.secondsPlayedPerPeriod };
          updatedPerPeriod[currentPeriod] = (updatedPerPeriod[currentPeriod] || 0) + addedSeconds;
          
          return {
            ...p,
            totalSecondsPlayed: p.totalSecondsPlayed + addedSeconds,
            secondsPlayedPerPeriod: updatedPerPeriod,
            currentEntryTime: null
          };
        }
        return { ...p, currentEntryTime: null };
      });

      // FIXED: Always set needsStarterSelection = true after ANY period ends
      // This ensures user is prompted for starters before 2nd, 3rd, 4th periods etc.
      return {
        ...prev,
        isRunning: false,
        isPaused: false,
        periodScores: [...prev.periodScores, newPeriodScore],
        needsStarterSelection: true, // Always require starter selection for next period
        events: newEvents,
        homeTeam: { ...prev.homeTeam, players: updatedHomePlayers },
        awayTeam: { ...prev.awayTeam, players: updatedAwayPlayers },
        // Reset timer state for next period
        periodStartTimestamp: null,
        accumulatedPauseTime: 0,
        pauseStartTimestamp: null,
      };
    });
  }, []);

  const endMatch = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      isMatchEnded: true,
      periodStartTimestamp: null,
      accumulatedPauseTime: 0,
      pauseStartTimestamp: null,
    }));
  }, []);

  const getPlayerById = (playerId: string, team: TeamType): Player | undefined => {
    const teamData = team === 'home' ? state.homeTeam : state.awayTeam;
    return teamData.players.find(p => p.id === playerId);
  };

  const recordGoal = useCallback((team: TeamType, playerId: string) => {
    setState(prev => {
      const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      const player = prev[teamKey].players.find(p => p.id === playerId);
      const newEvent: MatchEvent = {
        id: generateId(),
        type: 'goal',
        team,
        playerId,
        playerName: player?.name,
        playerNumber: player?.number ?? undefined,
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        homeScore: team === 'home' ? prev.homeTeam.score + 1 : prev.homeTeam.score,
        awayScore: team === 'away' ? prev.awayTeam.score + 1 : prev.awayTeam.score,
        description: `⚽ Gol di ${player?.name ?? 'Giocatore'}`
      };
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          score: prev[teamKey].score + 1,
          players: prev[teamKey].players.map(p => p.id === playerId ? { ...p, goals: p.goals + 1 } : p)
        },
        events: [newEvent, ...prev.events]
      };
    });
  }, []);

  const recordOwnGoal = useCallback((team: TeamType, playerId: string) => {
    setState(prev => {
      const scoringTeamKey = team === 'home' ? 'awayTeam' : 'homeTeam';
      const ownTeamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      const player = prev[ownTeamKey].players.find(p => p.id === playerId);
      const newEvent: MatchEvent = {
        id: generateId(),
        type: 'own_goal',
        team,
        playerId,
        playerName: player?.name,
        playerNumber: player?.number ?? undefined,
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        homeScore: team === 'home' ? prev.homeTeam.score : prev.homeTeam.score + 1,
        awayScore: team === 'away' ? prev.awayTeam.score : prev.awayTeam.score + 1,
        description: `🔴 Autogol di ${player?.name ?? 'Giocatore'}`
      };
      return {
        ...prev,
        [scoringTeamKey]: {
          ...prev[scoringTeamKey],
          score: prev[scoringTeamKey].score + 1,
        },
        events: [newEvent, ...prev.events]
      };
    });
  }, []);

  const recordCard = useCallback((team: TeamType, playerId: string, cardType: CardType) => {
    setState(prev => {
      const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      const player = prev[teamKey].players.find(p => p.id === playerId);
      const eventType = cardType === 'yellow' ? 'yellow_card' : 'red_card';
      const newEvent: MatchEvent = {
        id: generateId(),
        type: eventType,
        team,
        playerId,
        playerName: player?.name,
        playerNumber: player?.number ?? undefined,
        cardType,
        timestamp: prev.elapsedTime,
        period: prev.currentPeriod,
        description: cardType === 'yellow' 
          ? `🟨 Ammonizione a ${player?.name ?? 'Giocatore'}`
          : `🟥 Espulsione di ${player?.name ?? 'Giocatore'}`
      };
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          players: prev[teamKey].players.map(p => {
            if (p.id !== playerId) return p;
            const newCards = { ...p.cards, [cardType]: p.cards[cardType] + 1 };
            return { ...p, cards: newCards, isExpelled: cardType === 'red' || newCards.yellow >= 2 };
          })
        },
        events: [newEvent, ...prev.events]
      };
    });
  }, []);

  const recordSubstitution = useCallback((team: TeamType, playerOutId: string, playerInId: string) => {
    setState(prev => {
      const substitutionTimestamp = Date.now(); // Capture exact substitution time
      const currentPeriod = prev.currentPeriod;
      const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      const playerOut = prev[teamKey].players.find(p => p.id === playerOutId);
      const playerIn = prev[teamKey].players.find(p => p.id === playerInId);
      
      // FIXED: Format substitution description with clear format
      // Format: 🔄 MIN [MM:SS]: ENTRA [Name In] (#Num) - ESCE [Name Out] (#Num)
      const mins = Math.floor(prev.elapsedTime / 60);
      const secs = prev.elapsedTime % 60;
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      const inNum = playerIn?.number !== null ? `#${playerIn?.number}` : '';
      const outNum = playerOut?.number !== null ? `#${playerOut?.number}` : '';
      
      const newEvent: MatchEvent = {
        id: generateId(),
        type: 'substitution',
        team,
        playerOutId,
        playerOutName: playerOut?.name,
        playerOutNumber: playerOut?.number ?? undefined,
        playerInId,
        playerInName: playerIn?.name,
        playerInNumber: playerIn?.number ?? undefined,
        timestamp: prev.elapsedTime,
        period: currentPeriod,
        description: `🔄 MIN ${timeStr}: ENTRA ${playerIn?.name ?? '?'} (${inNum}) - ESCE ${playerOut?.name ?? '?'} (${outNum})`
      };
      
      // Update playtime for player out and set entry time for player in
      const updatedPlayers = prev[teamKey].players.map(p => {
        if (p.id === playerOutId) {
          // Player OUT: Calculate added time and reset entry time
          const addedSeconds = p.currentEntryTime !== null 
            ? Math.floor((substitutionTimestamp - p.currentEntryTime) / 1000) 
            : 0;
          const updatedPerPeriod = { ...p.secondsPlayedPerPeriod };
          updatedPerPeriod[currentPeriod] = (updatedPerPeriod[currentPeriod] || 0) + addedSeconds;
          
          return { 
            ...p, 
            isOnField: false, 
            totalSecondsPlayed: p.totalSecondsPlayed + addedSeconds,
            secondsPlayedPerPeriod: updatedPerPeriod,
            currentEntryTime: null 
          };
        }
        if (p.id === playerInId) {
          // Player IN: Set current entry time
          return { 
            ...p, 
            isOnField: true, 
            currentEntryTime: substitutionTimestamp 
          };
        }
        return p;
      });
      
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          players: updatedPlayers
        },
        events: [newEvent, ...prev.events]
      };
    });
  }, []);

  const undoLastEvent = useCallback(() => {
    setState(prev => {
      if (prev.events.length === 0) return prev;
      const lastEvent = prev.events[0];
      const remainingEvents = prev.events.slice(1);
      
      let newState = { ...prev, events: remainingEvents };
      
      // Reverse the effect based on event type
      if (lastEvent.type === 'goal' && lastEvent.playerId) {
        const teamKey = lastEvent.team === 'home' ? 'homeTeam' : 'awayTeam';
        newState = {
          ...newState,
          [teamKey]: {
            ...newState[teamKey],
            score: newState[teamKey].score - 1,
            players: newState[teamKey].players.map(p => 
              p.id === lastEvent.playerId ? { ...p, goals: p.goals - 1 } : p
            )
          }
        };
      }
      
      return newState;
    });
    toast.success("Ultimo evento annullato");
  }, []);

  const resetMatch = useCallback((keepTeams = false) => {
    if (keepTeams) {
      setState(prev => ({
        ...initialState,
        homeTeam: { ...prev.homeTeam, score: 0, players: prev.homeTeam.players.map(p => ({ ...p, goals: 0, cards: { yellow: 0, red: 0 }, isExpelled: false, isOnField: false, isStarter: false, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {} })) },
        awayTeam: { ...prev.awayTeam, score: 0, players: prev.awayTeam.players.map(p => ({ ...p, goals: 0, cards: { yellow: 0, red: 0 }, isExpelled: false, isOnField: false, isStarter: false, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {} })) }
      }));
    } else {
      setState(initialState);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addPlayerToMatch = useCallback((team: TeamType, name: string, number: number) => {
    const newPlayer: Player = {
      id: generateId(),
      name: name.toUpperCase(),
      number,
      isOnField: false,
      isStarter: false,
      isExpelled: false,
      goals: 0,
      cards: { yellow: 0, red: 0 },
      currentEntryTime: null,
      totalSecondsPlayed: 0,
      secondsPlayedPerPeriod: {}
    };
    setState(prev => {
      const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          players: [...prev[teamKey].players, newPlayer]
        }
      };
    });
  }, []);

  return {
    state,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    setStarters,
    confirmStarters,
    startPeriod,
    pauseTimer,
    resumeTimer,
    endPeriod,
    endMatch,
    recordGoal,
    recordOwnGoal,
    recordCard,
    recordSubstitution,
    resetMatch,
    forceStarterSelection,
    updatePlayerNumber,
    removePlayer,
    addOpponentPlayer,
    removeOpponentPlayer,
    createPlayersWithNumbers,
    swapTeams,
    undoLastEvent,
    addPlayerToMatch,
    updateElapsedTime,
    bulkAddPlayers: (names: string[]) => {
      names.forEach(name => addPlayer(name));
    },
  };
};

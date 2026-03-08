import { useState, useEffect, useCallback } from 'react';
import { MatchState, Player, TeamType, CardType, MatchEvent } from '../types/match';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

// Per-match storage key for persistence across reloads
const STORAGE_KEY_PREFIX = 'match_state_';
const MATCH_LIST_KEY = 'match_list';

const getStorageKey = (matchId: string | undefined) =>
  matchId ? `${STORAGE_KEY_PREFIX}${matchId}` : 'match_manager_state';

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
  periodDuration: 15,
  elapsedTime: 0,
  isRunning: false,
  isPaused: false,
  isMatchStarted: false,
  isMatchEnded: false,
  needsStarterSelection: true,
  periodScores: [],
  periodStartTimestamp: null,
  accumulatedPauseTime: 0,
  pauseStartTimestamp: null,
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useMatch = () => {
  const { id } = useParams();
  const storageKey = getStorageKey(id);

  // FIX #1: Always try to restore from per-match storage. No more reset on "quick-"/"new-" prefixes.
  const [state, setState] = useState<MatchState>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return { ...initialState, ...JSON.parse(saved) };
      } catch (e) {
        return initialState;
      }
    }
    return initialState;
  });

  // Auto-save on every state change (per-match key)
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
    // Track match in global list for history/dashboard
    if (id) {
      try {
        const list: string[] = JSON.parse(localStorage.getItem(MATCH_LIST_KEY) || '[]');
        if (!list.includes(id)) {
          list.push(id);
          localStorage.setItem(MATCH_LIST_KEY, JSON.stringify(list));
        }
      } catch {}
    }
  }, [state, storageKey, id]);

  const setHomeTeamName = useCallback((name: string) => setState(prev => ({
    ...prev, homeTeam: { ...prev.homeTeam, name }
  })), []);

  const setAwayTeamName = useCallback((name: string) => setState(prev => ({
    ...prev, awayTeam: { ...prev.awayTeam, name }
  })), []);

  const addPlayer = useCallback((name: string) => {
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
  }, []);

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

  // NEW: Update home player name
  const updateHomePlayerName = useCallback((playerId: string, name: string) => {
    setState(prev => ({
      ...prev,
      homeTeam: {
        ...prev.homeTeam,
        players: prev.homeTeam.players.map(p => p.id === playerId ? { ...p, name } : p)
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

  // NEW: Add away player with full name and number
  const addAwayPlayerFull = useCallback((name: string, number: number | null) => {
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
    setState(prev => ({
      ...prev,
      awayTeam: { ...prev.awayTeam, players: [...prev.awayTeam.players, newPlayer] }
    }));
  }, []);

  // NEW: Update away player name
  const updateAwayPlayerName = useCallback((playerId: string, name: string) => {
    setState(prev => ({
      ...prev,
      awayTeam: {
        ...prev.awayTeam,
        players: prev.awayTeam.players.map(p => p.id === playerId ? { ...p, name } : p)
      }
    }));
  }, []);

  // NEW: Update away player number
  const updateAwayPlayerNumber = useCallback((playerId: string, number: number | null) => {
    setState(prev => ({
      ...prev,
      awayTeam: {
        ...prev.awayTeam,
        players: prev.awayTeam.players.map(p => p.id === playerId ? { ...p, number } : p)
      }
    }));
  }, []);

  // NEW: Bulk add away players
  const bulkAddAwayPlayers = useCallback((players: { name: string; number: number | null }[]) => {
    const newPlayers: Player[] = players.map(pl => ({
      id: generateId(),
      name: pl.name.toUpperCase(),
      number: pl.number,
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
      awayTeam: { ...prev.awayTeam, players: [...prev.awayTeam.players, ...newPlayers] }
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

  // FIX: Non-destructive auto-numbering
  const createPlayersWithNumbers = useCallback((count: number) => {
    setState(prev => {
      const existing = prev.homeTeam.players;
      if (existing.length > 0) {
        // Assign numbers 1..N to existing, create placeholders for extras
        const updated = existing.map((p, i) => i < count ? { ...p, number: i + 1 } : p);
        const extras: Player[] = [];
        for (let i = existing.length + 1; i <= count; i++) {
          extras.push({
            id: generateId(),
            name: `GIOCATORE CASA ${i}`,
            number: i,
            isOnField: false,
            isStarter: false,
            isExpelled: false,
            goals: 0,
            cards: { yellow: 0, red: 0 },
            currentEntryTime: null,
            totalSecondsPlayed: 0,
            secondsPlayedPerPeriod: {}
          });
        }
        return {
          ...prev,
          homeTeam: { ...prev.homeTeam, players: [...updated, ...extras] }
        };
      }
      // No existing: create all from scratch
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
      return {
        ...prev,
        homeTeam: { ...prev.homeTeam, players: newHome }
      };
    });
    toast.success(`Giocatori di casa pronti con numeri progressivi`);
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
      const periodStartTimestamp = Date.now();
      const homeStarters = prev.homeTeam.players.filter(p => p.isOnField && !p.isExpelled);
      const awayStarters = prev.awayTeam.players.filter(p => p.isOnField && !p.isExpelled);
      
      const periodStartEvent: MatchEvent = {
        id: generateId(),
        type: 'period_start',
        team: 'home',
        timestamp: 0,
        period: newPeriod,
        description: `--- INIZIO ${newPeriod}° TEMPO ---`
      };

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

      const newEvents = [
        ...awayPlayerInEvents.reverse(),
        ...homePlayerInEvents.reverse(),
        periodStartEvent,
        ...prev.events
      ];

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
        periodStartTimestamp: periodStartTimestamp,
        accumulatedPauseTime: 0,
        pauseStartTimestamp: null,
      };
    });
  }, []);

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

  const pauseTimer = useCallback(() => setState(prev => ({ 
    ...prev, 
    isPaused: true,
    pauseStartTimestamp: Date.now()
  })), []);
  
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
      const periodEndTimestamp = Date.now();
      const currentPeriod = prev.currentPeriod;
      
      const cumulativeHomeBefore = prev.periodScores.reduce((sum, ps) => sum + ps.homeScore, 0);
      const cumulativeAwayBefore = prev.periodScores.reduce((sum, ps) => sum + ps.awayScore, 0);
      
      const newPeriodScore = {
        period: currentPeriod,
        homeScore: prev.homeTeam.score - cumulativeHomeBefore,
        awayScore: prev.awayTeam.score - cumulativeAwayBefore
      };

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

      const newEvents = [
        periodEndEvent,
        ...homePlayerOutEvents.reverse(),
        ...awayPlayerOutEvents.reverse(),
        ...prev.events
      ];

      // FIX #4: Preserve isOnField status for next period starter pre-population
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
            // isOnField preserved for next period pre-population
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

      return {
        ...prev,
        isRunning: false,
        isPaused: false,
        periodScores: [...prev.periodScores, newPeriodScore],
        needsStarterSelection: true,
        events: newEvents,
        homeTeam: { ...prev.homeTeam, players: updatedHomePlayers },
        awayTeam: { ...prev.awayTeam, players: updatedAwayPlayers },
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
      const substitutionTimestamp = Date.now();
      const currentPeriod = prev.currentPeriod;
      const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      const playerOut = prev[teamKey].players.find(p => p.id === playerOutId);
      const playerIn = prev[teamKey].players.find(p => p.id === playerInId);
      
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
      
      const updatedPlayers = prev[teamKey].players.map(p => {
        if (p.id === playerOutId) {
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
      if (id) {
        localStorage.removeItem(getStorageKey(id));
      }
    }
  }, [id]);

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
    updateHomePlayerName,
    removePlayer,
    addOpponentPlayer,
    removeOpponentPlayer,
    createPlayersWithNumbers,
    swapTeams,
    undoLastEvent,
    addPlayerToMatch,
    updateElapsedTime,
    addAwayPlayerFull,
    updateAwayPlayerName,
    updateAwayPlayerNumber,
    bulkAddAwayPlayers,
    bulkAddPlayers: (names: string[]) => {
      names.forEach(name => addPlayer(name));
    },
  };
};

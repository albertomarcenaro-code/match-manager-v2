import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchState, Player, TeamType, CardType, MatchEvent, MatchMetadata, LineupSelection } from '../types/match';

import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getMatchCacheKey, resolveMatchRecovery } from '@/lib/matchCache';

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

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const emptyMetadata = (): MatchMetadata => ({
  tournamentLabel: '',
  groupName: '',
  leva: '',
  category: '',
  matchDate: todayISO(),
  matchTime: nowHHMM(),
  venue: '',
  isHomeTeam: true,
  teamId: null,
  lineupSelection: null,
  detailsConfirmed: false,
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
  metadata: emptyMetadata(),
};


const generateId = () => Math.random().toString(36).substr(2, 9);

// Events are stored newest first: everything that happened after `entryEvent`
// sits at a lower index.
// Returns when the on-field spell started by `entryEvent` ended (match-timer
// seconds of that same period) and whether the player came back afterwards.
// exitTs is null while the player never left the field again — in that case the
// seconds accrued since the entry are still pending in `currentEntryTime` and
// have never been credited to any total.
const findExitInfo = (events: MatchEvent[], entryEvent: MatchEvent, playerId: string) => {
  const entryIndex = events.findIndex(e => e.id === entryEvent.id);
  if (entryIndex < 0) return { exitTs: null, reentered: false };

  const inPeriod = (e: MatchEvent) => e.period === entryEvent.period;
  // Yellows picked up before this entry still count for the two-yellow rule.
  let yellows = events
    .slice(entryIndex + 1)
    .filter(e => inPeriod(e) && e.type === 'yellow_card' && e.playerId === playerId).length;

  for (let i = entryIndex - 1; i >= 0; i--) {
    const e = events[i];
    if (!inPeriod(e)) continue;

    let isExit = false;
    if (e.type === 'period_end') isExit = true;
    else if (e.type === 'player_out' && e.playerId === playerId) isExit = true;
    else if (e.type === 'substitution' && e.playerOutId === playerId) isExit = true;
    else if (e.type === 'red_card' && e.playerId === playerId) isExit = true;
    else if (e.type === 'yellow_card' && e.playerId === playerId) {
      yellows += 1;
      isExit = yellows >= 2;
    }

    if (isExit) {
      const after = events.slice(0, i);
      const reentered = after.some(ev => inPeriod(ev) && ev.playerId === playerId && ev.type === 'player_in') ||
        after.some(ev => inPeriod(ev) && ev.type === 'substitution' && ev.playerInId === playerId);
      return { exitTs: e.timestamp, reentered };
    }
  }
  return { exitTs: null, reentered: false };
};

// Reverses everything `ev` changed (score, cards, roster, clock, parziali) and
// removes it from the timeline. Shared by deleteEvent and undoLastEvent so the
// two can never drift apart.
const reverseEvent = (prev: MatchState, ev: MatchEvent): MatchState => {
  const next: MatchState = { ...prev, events: prev.events.filter(e => e.id !== ev.id) };

  if (ev.type === 'goal' && ev.playerId) {
    const teamKey = ev.team === 'home' ? 'homeTeam' : 'awayTeam';
    return {
      ...next,
      [teamKey]: {
        ...next[teamKey],
        score: Math.max(0, next[teamKey].score - 1),
        players: next[teamKey].players.map(p =>
          p.id === ev.playerId ? { ...p, goals: Math.max(0, p.goals - 1) } : p
        ),
      },
    };
  }

  if (ev.type === 'own_goal') {
    // The goal was counted for the OPPOSITE team.
    const scoringTeamKey = ev.team === 'home' ? 'awayTeam' : 'homeTeam';
    return {
      ...next,
      [scoringTeamKey]: {
        ...next[scoringTeamKey],
        score: Math.max(0, next[scoringTeamKey].score - 1),
      },
    };
  }

  if ((ev.type === 'yellow_card' || ev.type === 'red_card') && ev.playerId) {
    const teamKey = ev.team === 'home' ? 'homeTeam' : 'awayTeam';
    const cardKey: 'yellow' | 'red' = ev.type === 'yellow_card' ? 'yellow' : 'red';
    return {
      ...next,
      [teamKey]: {
        ...next[teamKey],
        players: next[teamKey].players.map(p => {
          if (p.id !== ev.playerId) return p;
          const newCards = { ...p.cards, [cardKey]: Math.max(0, p.cards[cardKey] - 1) };
          const stillExpelled = newCards.red > 0 || newCards.yellow >= 2;
          // Field position is deliberately left alone: the card may have been
          // given to a player already on the bench, so the coach decides with a
          // substitution whether they come back on. The seconds already credited
          // for the time actually played stay.
          return { ...p, cards: newCards, isExpelled: stillExpelled };
        }),
      },
    };
  }

  if (ev.type === 'substitution' && ev.playerOutId && ev.playerInId) {
    const teamKey = ev.team === 'home' ? 'homeTeam' : 'awayTeam';
    const team = next[teamKey];
    return {
      ...next,
      [teamKey]: {
        ...team,
        players: team.players.map(p => {
          if (p.id === ev.playerOutId) {
            // Never left: put them back on the clock. If they are already back
            // on the pitch (a later re-entry), that entry owns the clock.
            if (p.isOnField || p.currentEntryTime !== null) return p;
            return {
              ...p,
              isOnField: true,
              currentEntryTime: ev.period === prev.currentPeriod ? ev.timestamp : 0,
            };
          }
          if (p.id === ev.playerInId) {
            // Never came on: drop the seconds this entry had already credited,
            // i.e. everything from the entry until they left again. Seconds still
            // pending in currentEntryTime were never credited, so removing them
            // is just a matter of taking the player off.
            const { exitTs, reentered } = findExitInfo(prev.events, ev, p.id);
            const credited = exitTs !== null ? Math.max(0, exitTs - ev.timestamp) : 0;
            let updated: Player = { ...p, totalSecondsPlayed: Math.max(0, p.totalSecondsPlayed - credited) };
            if (credited > 0) {
              const perPeriod = { ...p.secondsPlayedPerPeriod };
              perPeriod[ev.period] = Math.max(0, (perPeriod[ev.period] || 0) - credited);
              updated = { ...updated, secondsPlayedPerPeriod: perPeriod };
            }
            if (reentered) return updated;
            return { ...updated, isOnField: false, currentEntryTime: null };
          }
          return p;
        }),
      },
    };
  }

  if (ev.type === 'period_end') {
    // Keep the parziali in sync with the events: without this the standings, the
    // cronaca and the exported PDF would report a period that no longer exists.
    // The clock is intentionally untouched — deleting the marker does not
    // restart the period.
    return { ...next, periodScores: next.periodScores.filter(ps => ps.period !== ev.period) };
  }

  // period_start / player_in / player_out carry no derived state to reverse.
  return next;
};


export const useMatch = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  const { user, isGuest } = useAuth();
  const storageKey = getMatchCacheKey(id, user?.id ?? null, isGuest);
  const dbMatchIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const readyKeyRef = useRef<string | null>(null);
  const restoredStateRef = useRef<MatchState | null>(null);
  const [recoveryError, setRecoveryError] = useState(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const isReady = !!storageKey && readyKey === storageKey;

  // Only guests restore synchronously. Account matches wait for the cloud.
  const [state, setState] = useState<MatchState>(() => {
    const saved = isGuest && storageKey ? localStorage.getItem(storageKey) : null;
    if (saved) {
      try {
        return { ...initialState, ...JSON.parse(saved) };
      } catch (e) {
        return initialState;
      }
    }
    return initialState;
  });

  // Local cache: save to localStorage on every state change (for crash recovery / tab reload)
  useEffect(() => {
    if (isReady && storageKey) localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey, isReady]);

  // On mount: if logged in, try to load match from DB (for resume across devices)
  useEffect(() => {
    let cancelled = false;
    readyKeyRef.current = null;
    setReadyKey(null);
    setRecoveryError(false);
    dbMatchIdRef.current = null;
    if (isGuest) {
      readyKeyRef.current = storageKey;
      setReadyKey(storageKey);
      return;
    }
    if (!user || !id || !storageKey) return;
    
    const loadFromDb = async () => {
      let succeeded = true;
      try {
        let cachedState: MatchState | null = null;
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) cachedState = { ...initialState, ...JSON.parse(raw) };
        } catch { /* A damaged recovery copy must not prevent cloud loading. */ }
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .eq('user_id', user.id)
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;
        
        if (data) {
          dbMatchIdRef.current = data.id;
          const md = (data.match_data as any) || {};
          const row: any = data;
          const dbMeta: Partial<MatchMetadata> = {
            tournamentLabel: row.tournament_label ?? '',
            groupName: row.group_name ?? '',
            leva: row.leva ?? '',
            category: row.category ?? '',
            matchDate: row.match_date ? new Date(row.match_date).toISOString().slice(0, 10) : todayISO(),
            matchTime: row.match_time ?? nowHHMM(),
            venue: row.venue ?? '',
            isHomeTeam: row.is_home_team ?? true,
            teamId: row.team_id ?? null,
            lineupSelection: (row.lineup_selection as LineupSelection) ?? null,
            detailsConfirmed: !!(row.tournament_label || row.venue || row.match_time || row.team_id || row.lineup_selection),
          };
          const cloudState: MatchState = {
            ...initialState,
            ...(md.fullState || {}),
            homeTeam: md.fullState?.homeTeam || { name: data.home_team_name, score: data.home_score, players: md.homeTeam?.players || [] },
            awayTeam: md.fullState?.awayTeam || { name: data.away_team_name, score: data.away_score, players: md.awayTeam?.players || [] },
            events: md.fullState?.events || md.events || [],
            periodScores: md.fullState?.periodScores || md.periodScores || [],
            isMatchEnded: data.status === 'completed' || !!md.fullState?.isMatchEnded,
            metadata: { ...emptyMetadata(), ...(md.fullState?.metadata || {}), ...dbMeta },
          };
          const restored = resolveMatchRecovery(cloudState, cachedState, initialState);
          restoredStateRef.current = restored;
          setState(restored);
          return;
        }


        // No DB match yet. If this is a tournament match and we have no local cache,
        // try to pre-populate roster + jersey numbers from the latest match in same tournament.
        const draft = resolveMatchRecovery(null, cachedState, initialState);
        restoredStateRef.current = draft;
        setState(draft);
        if (!cachedState && tournamentId) {
          const { data: prev, error: previousError } = await supabase
            .from('matches')
            .select('match_data, home_team_name, away_team_name')
            .eq('user_id', user.id)
            .eq('tournament_id', tournamentId)
            .order('match_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (previousError) throw previousError;
          if (cancelled) return;

          if (prev?.match_data) {
            const md = prev.match_data as any;
            const fs = md.fullState;
            if (fs?.homeTeam && fs?.awayTeam) {
              // Reset per-match stats but keep roster + numbers + starters
              const resetPlayer = (p: Player): Player => ({
                ...p,
                isOnField: !!p.isStarter,
                isExpelled: false,
                goals: 0,
                cards: { yellow: 0, red: 0 },
                currentEntryTime: null,
                totalSecondsPlayed: 0,
                secondsPlayedPerPeriod: {},
              });
              setState({
                ...initialState,
                homeTeam: {
                  name: fs.homeTeam.name,
                  score: 0,
                  players: (fs.homeTeam.players || []).map(resetPlayer),
                },
                awayTeam: {
                  name: fs.awayTeam.name,
                  score: 0,
                  players: (fs.awayTeam.players || []).map(resetPlayer),
                },
              });
              toast.success('Formazione precedente ripristinata');
            }
          }
        }
      } catch (err) {
        succeeded = false;
        if (cancelled) return;
        console.error('Failed to load match from DB:', err);
        setRecoveryError(true);
        toast.error('Impossibile recuperare la partita dall’account. Riprova prima di modificarla.');
        return;
      } finally {
        if (!cancelled && succeeded) {
          readyKeyRef.current = storageKey;
          setReadyKey(storageKey);
        }
      }
    };
    
    loadFromDb();
    return () => { cancelled = true; readyKeyRef.current = null; };
  }, [user?.id, isGuest, id, tournamentId, storageKey, recoveryAttempt]);

  // Cloud save lifecycle. Failures are surfaced (status + toast + retry) so a
  // lost write can never look like a successful one to the coach.
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const saveErrorToastRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStateRef = useRef<MatchState | null>(null);
  const latestStateRef = useRef<MatchState>(state);
  latestStateRef.current = state;
  const saveToDbRef = useRef<(next: MatchState) => void>(() => {});

  // Save match state to cloud DB (debounced, for logged-in users)
  const saveToDb = useCallback(async (currentState: MatchState) => {
    if (!user || isGuest || !id || !storageKey || readyKeyRef.current !== storageKey) return;
    if (savingRef.current) {
      // An attempt is already in flight: remember the newest snapshot instead of
      // dropping it, the in-flight save picks it up when it settles.
      pendingStateRef.current = currentState;
      return;
    }

    savingRef.current = true;
    setSaveStatus('saving');
    let succeeded = false;
    try {
      const matchData = {
        events: currentState.events,
        periodScores: currentState.periodScores,
        homeTeam: currentState.homeTeam,
        awayTeam: currentState.awayTeam,
        fullState: currentState,
      };
      
      const status = currentState.isMatchEnded ? 'completed' : 'in_progress';

      const meta = currentState.metadata || emptyMetadata();
      const extraCols: Record<string, any> = {
        tournament_label: meta.tournamentLabel || null,
        group_name: meta.groupName || null,
        leva: meta.leva || null,
        category: meta.category || null,
        venue: meta.venue || null,
        match_time: meta.matchTime || null,
        is_home_team: !!meta.isHomeTeam,
        team_id: meta.teamId || null,
        lineup_selection: (meta.lineupSelection as any) || null,
      };

      if (dbMatchIdRef.current) {
        // Update existing match
        const { error } = await supabase
          .from('matches')
          .update({
            home_team_name: currentState.homeTeam.name,
            away_team_name: currentState.awayTeam.name,
            home_score: currentState.homeTeam.score,
            away_score: currentState.awayTeam.score,
            match_data: matchData as any,
            status,
            ...extraCols,
          } as any)
          .eq('id', dbMatchIdRef.current);
        
        if (error) throw error;
      } else {
        // Insert new match
        const { data, error } = await supabase
          .from('matches')
          .insert({
            id, // use the same ID as the route param (must be a valid UUID)
            user_id: user.id,
            tournament_id: tournamentId || null,
            home_team_name: currentState.homeTeam.name,
            away_team_name: currentState.awayTeam.name,
            home_score: currentState.homeTeam.score,
            away_score: currentState.awayTeam.score,
            match_data: matchData as any,
            status,
            ...extraCols,
          } as any)
          .select('id')
          .single();
        
        if (error) throw error;
        if (data) {
          dbMatchIdRef.current = data.id;
        }
      }

      // Success: reset the backoff and clear any scheduled retry.
      succeeded = true;
      retryAttemptRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (saveErrorToastRef.current) {
        saveErrorToastRef.current = false;
        toast.success('Salvataggio sul cloud ripristinato', { id: 'match-save-error' });
      }
      setSaveStatus('idle');
    } catch (err: any) {
      console.error('Failed to save match to DB:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        matchId: id,
        dbMatchId: dbMatchIdRef.current,
        userId: user?.id,
      });
      setSaveStatus('error');
      // The local recovery copy is still written, so nothing is lost yet:
      // say that once, then keep retrying quietly in the background.
      if (!saveErrorToastRef.current) {
        saveErrorToastRef.current = true;
        toast.error('Salvataggio sul cloud non riuscito', {
          id: 'match-save-error',
          description: 'La partita è al sicuro su questo dispositivo. Riprovo automaticamente…',
          duration: 8000,
        });
      }
      const delay = Math.min(30000, 1500 * 2 ** Math.min(retryAttemptRef.current, 4)); // 1.5s → 30s
      retryAttemptRef.current += 1;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        // Always retry the newest state: a later edit supersedes the failed one.
        saveToDbRef.current(latestStateRef.current);
      }, delay);
    } finally {
      savingRef.current = false;
      if (succeeded) {
        // A newer snapshot arrived while this attempt was in flight: save it now.
        pendingStateRef.current = null;
        const newer = latestStateRef.current;
        if (newer !== currentState) {
          void saveToDbRef.current(newer);
        }
      }
    }
  }, [user, isGuest, id, tournamentId, storageKey]);
  saveToDbRef.current = saveToDb;

  // Manual escape hatch for the error banner (and for a coach who wants certainty).
  const retrySave = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    retryAttemptRef.current = 0;
    void saveToDbRef.current(latestStateRef.current);
  }, []);

  // Auto-save to DB: always on for logged-in users. Timer ticks (elapsedTime only)
  // must not reset the debounce, or cards/substitutions never get saved mid-match.
  const prevScoreRef = useRef({ home: 0, away: 0 });
  const prevEndedRef = useRef(false);
  const prevStartedRef = useRef(false);
  const prevEventsLenRef = useRef(0);

  useEffect(() => {
    if (!user || isGuest || !id || !isReady || state === restoredStateRef.current) return;

    const scoreChanged = state.homeTeam.score !== prevScoreRef.current.home ||
                         state.awayTeam.score !== prevScoreRef.current.away;
    const justEnded = state.isMatchEnded && !prevEndedRef.current;
    const justStarted = state.isMatchStarted && !prevStartedRef.current;
    const eventsChanged = state.events.length !== prevEventsLenRef.current;

    prevScoreRef.current = { home: state.homeTeam.score, away: state.awayTeam.score };
    prevEndedRef.current = state.isMatchEnded;
    prevStartedRef.current = state.isMatchStarted;
    prevEventsLenRef.current = state.events.length;

    // Immediate save on significant events (score, start/end, cards, substitutions)
    if (justEnded || justStarted || scoreChanged || eventsChanged) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      pendingStateRef.current = null;
      saveToDb(state);
      return;
    }

    // Debounced save for everything else (roster edits, metadata, pre-match prep).
    // If a save is already scheduled (e.g. timer ticks keep re-rendering), just
    // refresh the pending snapshot instead of resetting the clock.
    pendingStateRef.current = state;
    if (!saveTimeoutRef.current) {
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        const snapshot = pendingStateRef.current;
        pendingStateRef.current = null;
        if (snapshot) saveToDb(snapshot);
      }, 2000);
    }
  }, [state, user, isGuest, id, saveToDb, isReady]);

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  // ... keep existing code for all the match action callbacks ...
  
  const setHomeTeamName = useCallback((name: string) => setState(prev => ({
    ...prev, homeTeam: { ...prev.homeTeam, name }
  })), []);

  const setAwayTeamName = useCallback((name: string) => setState(prev => ({
    ...prev, awayTeam: { ...prev.awayTeam, name }
  })), []);

  const setMetadata = useCallback((patch: Partial<MatchMetadata>) => {
    setState(prev => ({ ...prev, metadata: { ...prev.metadata, ...patch } }));
  }, []);

  // Replace home roster with members from anagrafica (pre-match only).
  // Preserves numbers if member.jersey_number is set; otherwise null.
  const setHomeRosterFromMembers = useCallback((members: Array<{ id: string; name: string; number: number | null }>) => {
    setState(prev => {
      if (prev.isMatchStarted) return prev; // safety: never replace mid-match
      const fresh: Player[] = members.map(m => ({
        id: m.id,
        name: (m.name || '').toUpperCase(),
        number: m.number ?? null,
        isOnField: false,
        isStarter: false,
        isExpelled: false,
        goals: 0,
        cards: { yellow: 0, red: 0 },
        currentEntryTime: null,
        totalSecondsPlayed: 0,
        secondsPlayedPerPeriod: {},
      }));
      return { ...prev, homeTeam: { ...prev.homeTeam, players: fresh } };
    });
  }, []);

  // Flush immediately with the latest state (not the render-time snapshot),
  // so "Salva e prosegui" never sends the previous roster.
  const saveNow = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingStateRef.current = null;
    saveToDb(latestStateRef.current);
  }, [saveToDb]);


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

  // Load tournament players into the home roster, preserving their original IDs
  // so the tournament-jersey persistence layer keys correctly across matches.
  const loadTournamentPlayers = useCallback((players: Array<{ id: string; name: string; number: number | null }>) => {
    if (!Array.isArray(players) || players.length === 0) return;
    setState(prev => {
      if (prev.homeTeam.players.length > 0) return prev; // never overwrite
      const fresh: Player[] = players.map(p => ({
        id: p.id,
        name: (p.name || '').toUpperCase(),
        number: p.number ?? null,
        isOnField: false,
        isStarter: false,
        isExpelled: false,
        goals: 0,
        cards: { yellow: 0, red: 0 },
        currentEntryTime: null,
        totalSecondsPlayed: 0,
        secondsPlayedPerPeriod: {},
      }));
      return { ...prev, homeTeam: { ...prev.homeTeam, players: fresh } };
    });
  }, []);

  // NEW: Add away player with full name and number
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
        currentEntryTime: starterIds.has(p.id) ? 0 : p.currentEntryTime
      }));
      
      const updatedAwayPlayers = prev.awayTeam.players.map(p => ({
        ...p,
        currentEntryTime: starterIds.has(p.id) ? 0 : p.currentEntryTime
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
          const addedSeconds = Math.max(0, prev.elapsedTime - p.currentEntryTime);
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
          const addedSeconds = Math.max(0, prev.elapsedTime - p.currentEntryTime);
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
      needsStarterSelection: false,
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
            const expelled = cardType === 'red' || newCards.yellow >= 2;
            if (expelled) {
              const addedSeconds = p.currentEntryTime !== null ? Math.max(0, prev.elapsedTime - p.currentEntryTime) : 0;
              const updatedPerPeriod = { ...p.secondsPlayedPerPeriod };
              const cp = prev.currentPeriod;
              updatedPerPeriod[cp] = (updatedPerPeriod[cp] || 0) + addedSeconds;
              return { 
                ...p, 
                cards: newCards, 
                isExpelled: true, 
                isOnField: false,
                totalSecondsPlayed: p.totalSecondsPlayed + addedSeconds,
                secondsPlayedPerPeriod: updatedPerPeriod,
                currentEntryTime: null
              };
            }
            return { ...p, cards: newCards };
          })
        },
        events: [newEvent, ...prev.events]
      };
    });
  }, []);

  const recordSubstitution = useCallback((team: TeamType, playerOutId: string, playerInId: string) => {
    setState(prev => {
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
            ? Math.max(0, prev.elapsedTime - p.currentEntryTime) 
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
            currentEntryTime: prev.elapsedTime 
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

  // Undo the most recent event: identical reversal to deleteEvent, so the two
  // paths can never drift apart (it used to handle goals only).
  const undoLastEvent = useCallback(() => {
    const outcome: { undone: MatchEvent | null } = { undone: null };
    setState(prev => {
      const lastEvent = prev.events[0];
      if (!lastEvent) return prev;
      outcome.undone = lastEvent;
      return reverseEvent(prev, lastEvent);
    });
    if (outcome.undone) toast.success('Ultimo evento annullato');
  }, []);

  // Delete a single event from the timeline and reverse its side-effects on
  // score, stats, roster, clock and parziali.
  const deleteEvent = useCallback((eventId: string) => {
    const outcome: { found: MatchEvent | null } = { found: null };
    setState(prev => {
      const ev = prev.events.find(e => e.id === eventId);
      if (!ev) return prev;
      outcome.found = ev;
      return reverseEvent(prev, ev);
    });
    if (outcome.found) toast.success('Evento eliminato');
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
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
    // dbMatchIdRef is deliberately kept: the route id does not change, so the
    // next save must UPDATE the existing row — nulling it would try to INSERT
    // the same UUID again and fail on every retry.
  }, [id, storageKey]);

  // Quick correction of initial starter error - moves player on/off field WITHOUT counting as a tactical substitution.
  // The player entering is treated as if they entered at the start of the current period (timestamp 0),
  // and the player leaving has their playtime for this period zeroed (since they shouldn't have been there).
  const fixStarterError = useCallback((team: TeamType, playerId: string) => {
    setState(prev => {
      if (!prev.isMatchStarted || prev.isMatchEnded) return prev;
      const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
      const player = prev[teamKey].players.find(p => p.id === playerId);
      if (!player || player.isExpelled) return prev;

      const currentPeriod = prev.currentPeriod;
      const wasOnField = player.isOnField;

      const updatedPlayers = prev[teamKey].players.map(p => {
        if (p.id !== playerId) return p;
        if (wasOnField) {
          // Move OFF field: remove any playtime accrued in this period (was an error)
          const accruedThisPeriod = p.currentEntryTime !== null
            ? Math.max(0, prev.elapsedTime - p.currentEntryTime)
            : 0;
          const updatedPerPeriod = { ...p.secondsPlayedPerPeriod };
          // Subtract any accidentally tracked seconds for this period
          const existingPeriodSecs = updatedPerPeriod[currentPeriod] || 0;
          updatedPerPeriod[currentPeriod] = Math.max(0, existingPeriodSecs - accruedThisPeriod);
          return {
            ...p,
            isOnField: false,
            isStarter: false,
            currentEntryTime: null,
            totalSecondsPlayed: Math.max(0, p.totalSecondsPlayed - accruedThisPeriod),
            secondsPlayedPerPeriod: updatedPerPeriod,
          };
        } else {
          // Move ON field as if entered at period start (00:00)
          return {
            ...p,
            isOnField: true,
            isStarter: true,
            currentEntryTime: 0,
          };
        }
      });

      // Replace any prior player_in/player_out events for this player in current period to keep timeline clean
      const filteredEvents = prev.events.filter(e => !(
        e.period === currentPeriod &&
        e.playerId === playerId &&
        (e.type === 'player_in' || e.type === 'player_out') &&
        (e.timestamp === 0)
      ));

      const correctionEvent: MatchEvent = {
        id: generateId(),
        type: wasOnField ? 'player_out' : 'player_in',
        team,
        playerId,
        playerName: `${player.name}${player.number !== null ? ` (#${player.number})` : ''}`,
        playerNumber: player.number ?? undefined,
        timestamp: 0,
        period: currentPeriod,
        description: wasOnField
          ? `✏️ Correzione titolari: ${player.name} spostato in panchina`
          : `✏️ Correzione titolari: ${player.name} inserito tra i titolari`,
      };

      return {
        ...prev,
        [teamKey]: { ...prev[teamKey], players: updatedPlayers },
        events: [correctionEvent, ...filteredEvents],
      };
    });
    toast.success("Formazione titolari corretta");
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
    isReady,
    recoveryError,
    saveStatus,
    retrySave,
    retryRecovery: () => setRecoveryAttempt(attempt => attempt + 1),
    setHomeTeamName,
    setAwayTeamName,
    setMetadata,
    setHomeRosterFromMembers,
    saveNow,
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
    loadTournamentPlayers,
    removePlayer,
    addOpponentPlayer,
    removeOpponentPlayer,
    createPlayersWithNumbers,
    swapTeams,
    undoLastEvent,
    deleteEvent,
    addPlayerToMatch,
    fixStarterError,
    updateElapsedTime,
    addAwayPlayerFull,
    updateAwayPlayerName,
    updateAwayPlayerNumber,
    bulkAddAwayPlayers,
    bulkAddPlayers: (names: string[]) => {
      // CRITICAL: dedupe by name (case-insensitive) against the incoming list
      // AND against players already in state. Prevents the visual duplication
      // glitch when loadUserData runs over an already-populated roster.
      setState(prev => {
        const existingKeys = new Set(
          prev.homeTeam.players.map(p => p.name.trim().toUpperCase())
        );
        const seen = new Set<string>();
        const toAdd: Player[] = [];
        for (const raw of names) {
          const upper = (raw || '').trim().toUpperCase();
          if (!upper || seen.has(upper) || existingKeys.has(upper)) continue;
          seen.add(upper);
          toAdd.push({
            id: generateId(),
            name: upper,
            number: null,
            isOnField: false,
            isStarter: false,
            isExpelled: false,
            goals: 0,
            cards: { yellow: 0, red: 0 },
            currentEntryTime: null,
            totalSecondsPlayed: 0,
            secondsPlayedPerPeriod: {},
          });
        }
        if (toAdd.length === 0) return prev;
        return {
          ...prev,
          homeTeam: { ...prev.homeTeam, players: [...prev.homeTeam.players, ...toAdd] },
        };
      });
    },
  };
};

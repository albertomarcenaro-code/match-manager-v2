import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface JerseyEntry {
  id: string; // player_id (uuid client-side, text in DB)
  name: string;
  number: number | null;
}

export interface RosterEntry {
  id: string;
  name: string;
  number: number | null;
}

/**
 * Persistent jersey-number storage per tournament.
 * Source of truth for "Mia Squadra" jersey numbers across matches of the same tournament.
 *
 * Each row in tournament_jersey_numbers represents a player SELECTED (convocato)
 * for the tournament roster. The jersey number is optional at selection time and
 * can be assigned later; once set, it is fixed for the whole tournament and
 * auto-proposed in every match of that tournament.
 * A player without an entry here is NOT considered part of the tournament.
 */
export function useTournamentJerseys(tournamentId: string | null | undefined) {
  const { user, isGuest } = useAuth();
  const [jerseys, setJerseys] = useState<Map<string, number | null>>(new Map());
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const flushTimer = useRef<number | null>(null);
  const pending = useRef<Map<string, JerseyEntry>>(new Map());

  // Load existing jerseys + names
  useEffect(() => {
    let cancelled = false;
    if (!tournamentId || !user || isGuest) {
      setJerseys(new Map());
      setNames(new Map());
      setLoaded(true);
      return;
    }
    setLoaded(false);
    (async () => {
      const { data, error } = await supabase
        .from('tournament_jersey_numbers')
        .select('player_id, player_name, jersey_number')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id);
      if (cancelled) return;
      if (!error && data) {
        const jm = new Map<string, number | null>();
        const nm = new Map<string, string>();
        for (const row of data) {
          jm.set(row.player_id, row.jersey_number);
          nm.set(row.player_id, row.player_name);
        }
        setJerseys(jm);
        setNames(nm);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [tournamentId, user?.id, isGuest]);

  const flush = useCallback(async () => {
    if (!tournamentId || !user || isGuest) {
      pending.current.clear();
      return;
    }
    const entries = Array.from(pending.current.values());
    pending.current.clear();
    if (!entries.length) return;

    const toUpsert = entries
      .filter(e => e.id && e.name)
      .map(e => ({
        tournament_id: tournamentId,
        user_id: user.id,
        player_id: e.id,
        player_name: e.name,
        jersey_number: e.number,
      }));

    try {
      if (toUpsert.length) {
        await supabase
          .from('tournament_jersey_numbers')
          .upsert(toUpsert, { onConflict: 'tournament_id,player_id' });
      }
    } catch (e) {
      console.error('Failed to persist tournament jerseys:', e);
    }
  }, [tournamentId, user?.id, isGuest]);

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      flush();
    }, 500);
  }, [flush]);

  const applyLocal = useCallback((entry: JerseyEntry) => {
    setJerseys(prev => {
      const next = new Map(prev);
      next.set(entry.id, entry.number);
      return next;
    });
    setNames(prev => {
      const next = new Map(prev);
      next.set(entry.id, entry.name);
      return next;
    });
  }, []);

  /**
   * Optimistic local update + debounced persistence.
   * number=null keeps the player selected but without a jersey number.
   */
  const upsertJersey = useCallback((entry: JerseyEntry) => {
    if (!entry.id) return;
    applyLocal(entry);
    pending.current.set(entry.id, entry);
    scheduleFlush();
  }, [applyLocal, scheduleFlush]);

  /** Batch upsert + immediate flush. */
  const upsertMany = useCallback(async (entries: JerseyEntry[]) => {
    for (const e of entries) {
      if (!e.id) continue;
      applyLocal(e);
      pending.current.set(e.id, e);
    }
    if (flushTimer.current) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    await flush();
  }, [applyLocal, flush]);

  const removePlayer = useCallback(async (playerId: string) => {
    if (!playerId) return;
    setJerseys(prev => {
      const next = new Map(prev);
      next.delete(playerId);
      return next;
    });
    setNames(prev => {
      const next = new Map(prev);
      next.delete(playerId);
      return next;
    });
    pending.current.delete(playerId);
    if (flushTimer.current) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    if (!tournamentId || !user || isGuest) return;
    try {
      await supabase
        .from('tournament_jersey_numbers')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .eq('player_id', playerId);
    } catch (e) {
      console.error('Failed to remove tournament player:', e);
    }
  }, [tournamentId, user?.id, isGuest]);

  const getNumber = useCallback(
    (playerId: string): number | null => {
      const n = jerseys.get(playerId);
      return n == null ? null : n;
    },
    [jerseys]
  );

  /**
   * Full roster derived from persisted state — all SELECTED players,
   * with or without a jersey number. Numbered players first (by number),
   * then unnumbered (alphabetical).
   */
  const roster: RosterEntry[] = Array.from(jerseys.entries())
    .map(([id, number]) => ({ id, name: names.get(id) || '', number }))
    .sort((a, b) => {
      if (a.number != null && b.number != null) return a.number - b.number;
      if (a.number != null) return -1;
      if (b.number != null) return 1;
      return a.name.localeCompare(b.name, 'it');
    });

  return {
    jerseys,
    names,
    roster,
    loaded,
    upsertJersey,
    upsertMany,
    removePlayer,
    getNumber,
    flush,
  };
}

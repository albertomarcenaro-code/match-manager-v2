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
  number: number;
}

/**
 * Persistent jersey-number storage per tournament.
 * Source of truth for "Mia Squadra" jersey numbers across matches of the same tournament.
 *
 * Each row in tournament_jersey_numbers represents a player IN the tournament roster.
 * A player without an entry here is NOT considered part of the tournament.
 */
export function useTournamentJerseys(tournamentId: string | null | undefined) {
  const { user, isGuest } = useAuth();
  const [jerseys, setJerseys] = useState<Map<string, number>>(new Map());
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
        const jm = new Map<string, number>();
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
      .filter(e => typeof e.number === 'number' && e.number !== null && e.id && e.name)
      .map(e => ({
        tournament_id: tournamentId,
        user_id: user.id,
        player_id: e.id,
        player_name: e.name,
        jersey_number: e.number as number,
      }));
    const toDelete = entries
      .filter(e => e.number == null && e.id)
      .map(e => e.id);

    try {
      if (toUpsert.length) {
        await supabase
          .from('tournament_jersey_numbers')
          .upsert(toUpsert, { onConflict: 'tournament_id,player_id' });
      }
      if (toDelete.length) {
        await supabase
          .from('tournament_jersey_numbers')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('user_id', user.id)
          .in('player_id', toDelete);
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
      if (entry.number == null) next.delete(entry.id);
      else next.set(entry.id, entry.number);
      return next;
    });
    setNames(prev => {
      const next = new Map(prev);
      if (entry.number == null) next.delete(entry.id);
      else next.set(entry.id, entry.name);
      return next;
    });
  }, []);

  /**
   * Optimistic local update + debounced persistence.
   * Pass number=null to clear (deletes the row).
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
    applyLocal({ id: playerId, name: '', number: null });
    pending.current.set(playerId, { id: playerId, name: '', number: null });
    if (flushTimer.current) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    await flush();
  }, [applyLocal, flush]);

  const getNumber = useCallback(
    (playerId: string): number | null => (jerseys.has(playerId) ? jerseys.get(playerId)! : null),
    [jerseys]
  );

  /** Full roster derived from persisted state. Only players with a jersey number. */
  const roster: RosterEntry[] = Array.from(jerseys.entries())
    .map(([id, number]) => ({ id, name: names.get(id) || '', number }))
    .sort((a, b) => a.number - b.number);

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

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface JerseyEntry {
  id: string; // player_id (uuid client-side, text in DB)
  name: string;
  number: number | null;
}

/**
 * Persistent jersey-number storage per tournament.
 * Source of truth for "Mia Squadra" jersey numbers across matches of the same tournament.
 */
export function useTournamentJerseys(tournamentId: string | null | undefined) {
  const { user, isGuest } = useAuth();
  const [jerseys, setJerseys] = useState<Map<string, number>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const flushTimer = useRef<number | null>(null);
  const pending = useRef<Map<string, JerseyEntry>>(new Map());

  // Load existing jerseys
  useEffect(() => {
    let cancelled = false;
    if (!tournamentId || !user || isGuest) {
      setJerseys(new Map());
      setLoaded(true);
      return;
    }
    setLoaded(false);
    (async () => {
      const { data, error } = await supabase
        .from('tournament_jersey_numbers')
        .select('player_id, jersey_number')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id);
      if (cancelled) return;
      if (!error && data) {
        const m = new Map<string, number>();
        for (const row of data) m.set(row.player_id, row.jersey_number);
        setJerseys(m);
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

  /**
   * Optimistic local update + debounced persistence.
   * Pass number=null to clear (deletes the row).
   */
  const upsertJersey = useCallback((entry: JerseyEntry) => {
    if (!entry.id) return;
    setJerseys(prev => {
      const next = new Map(prev);
      if (entry.number == null) next.delete(entry.id);
      else next.set(entry.id, entry.number);
      return next;
    });
    pending.current.set(entry.id, entry);
    scheduleFlush();
  }, [scheduleFlush]);

  /** Batch upsert + immediate flush. */
  const upsertMany = useCallback(async (entries: JerseyEntry[]) => {
    setJerseys(prev => {
      const next = new Map(prev);
      for (const e of entries) {
        if (!e.id) continue;
        if (e.number == null) next.delete(e.id);
        else next.set(e.id, e.number);
      }
      return next;
    });
    for (const e of entries) {
      if (e.id) pending.current.set(e.id, e);
    }
    if (flushTimer.current) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    await flush();
  }, [flush]);

  const getNumber = useCallback(
    (playerId: string): number | null => (jerseys.has(playerId) ? jerseys.get(playerId)! : null),
    [jerseys]
  );

  return { jerseys, loaded, upsertJersey, upsertMany, getNumber, flush };
}

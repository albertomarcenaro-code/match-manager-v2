import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// ----- keys -----
export const ACTIVE_TEAM_KEY = 'match-manager:active-team';
export const ACTIVE_TEAM_USER_KEY = 'match-manager:active-team-user';

// ----- DB shape (derived from generated types) -----
export interface TeamCodeRow {
  id: string;
  name: string;
  category: string | null;
  team_code: string | null;
  season: string;
}

// Deterministic, human-friendly code: "LEVA-YYYY-XXXXXX" uppercase.
export function generateTeamCode(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    const token = crypto.getRandomValues(new Uint8Array(3)).reduce((a, b) => (a << 8) | b, 0);
    return `NA-${new Date().getFullYear()}-${String(token).padStart(6, '0').slice(-6).toUpperCase()}`;
  }
  const leva = extractLeva(trimmed) || String(new Date().getFullYear());
  const token = crypto.getRandomValues(new Uint8Array(3)).reduce((a, b) => (a << 8) | b, 0);
  return `${leva}-${new Date().getFullYear()}-${String(token).padStart(6, '0').slice(-6).toUpperCase()}`;
}

function extractLeva(name: string): string {
  const m = name.match(/(\d{4})/);
  return m ? m[1] : '';
}

// ----- lookup a team by its public code (used by the join flow) -----
export async function lookupTeamByCode(code: string): Promise<TeamCodeRow | null> {
  const { data, error } = await supabase
    .from('saved_teams')
    .select('id, name, category, team_code, season')
    .eq('team_code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) {
    console.error('[teams] lookupByCode error', error);
    return null;
  }
  return (data as TeamCodeRow | null) ?? null;
}

// ----- set / clear the active shared team for the current session -----
export async function setActiveTeam(teamId: string, code: string): Promise<boolean> {
  try {
    localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
    localStorage.setItem(ACTIVE_TEAM_USER_KEY, code);
    return true;
  } catch {
    return false;
  }
}

export function getActiveTeam(): { teamId: string | null; code: string | null } {
  try {
    return {
      teamId: localStorage.getItem(ACTIVE_TEAM_KEY),
      code: localStorage.getItem(ACTIVE_TEAM_USER_KEY),
    };
  } catch {
    return { teamId: null, code: null };
  }
}

export function clearActiveTeam(): void {
  try {
    localStorage.removeItem(ACTIVE_TEAM_KEY);
    localStorage.removeItem(ACTIVE_TEAM_USER_KEY);
  } catch {
    /* ignore */
  }
}

// ----- react hook: the team_id a signed-in user should treat as "shared team" -----
export function useActiveTeamId(): string | null {
  const { user, isGuest } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (isGuest || !user) {
      setTeamId(null);
      return;
    }

    // Start from any previously joined team for this account (survives reloads).
    const stored = getActiveTeam();
    if (stored.teamId) setTeamId(stored.teamId);

    // Real-time presence: if somebody changes the team_code / ownership, keep
    // our local active-team in sync with the one this user owns. A shared team
    // that we joined remains active as long as the joined row still exists.
    const channel = supabase
      .channel(`team-code-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_teams',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          if (payload.eventType === 'DELETE') {
            // We no longer own this team; if it was our active one, drop it.
            if (payload.old?.id === teamId) {
              setTeamId(null);
              clearActiveTeam();
            }
            return;
          }
          // insert / update of our own teams: prefer the latest joined one.
          const row = payload.new as { id: string; team_code: string | null } | null;
          if (row?.team_code && stored.teamId === row.id) {
            setTeamId(row.id);
          }
        },
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, isGuest]);

  return teamId;
}

// ----- join flow (owner sees code + copy/share; others join) -----
export async function joinTeamByCode(code: string, userId: string | undefined): Promise<{ ok: boolean; teamId?: string; teamName?: string; error?: string }> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { ok: false, error: 'Inserisci un codice squadra.' };
  }
  if (!/^[A-Z0-9\-]+$/.test(trimmed)) {
    return { ok: false, error: 'Il codice può contenere solo lettere, numeri e trattini.' };
  }

  const team = await lookupTeamByCode(trimmed);
  if (!team) {
    return { ok: false, error: `Nessuna squadra trovata per il codice "${trimmed}".` };
  }
  if (!team.team_code) {
    return { ok: false, error: 'Questa squadra non ha ancora un codice di condivisione.' };
  }

  // Persist the local active-team reference (for the current session / reloads).
  const localOk = await setActiveTeam(team.id, team.team_code);
  if (!localOk) {
    return { ok: false, error: 'Impossibile salvare il collegamento nella sessione locale.' };
  }

  // Record the join on the server so RLS grants roster access to everyone who
  // legitimately joined the team (and so the join survives a logout/login cycle
  // for the same account). Needs the authenticated user id; if unavailable the
  // local join still works but the shared roster won't be visible to other
  // devices until the server record is created.
  if (userId) {
    try {
      await supabase
        .from('user_team_joins')
        .insert({ user_id: userId, team_id: team.id })
        .select('id')
        .single();
    } catch (e: any) {
      // Ignore unique-constraint conflicts (user already joined this team).
      if (e.code !== '23505') console.warn('[teams] join record write failed:', e);
    }
  }

  return { ok: true, teamId: team.id, teamName: team.name };
}

/**
 * Tell the server the current user is leaving the shared team they joined.
 * The client should ALSO clear its local active-team reference (done by the
 * caller / JoinTeam screen). Returns true if the server accepted the leave.
 */
export async function leaveTeamJoin(teamId: string, userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    await supabase
      .from('user_team_joins')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);
    return true;
  } catch (e: any) {
    // A delete with no matching row returns an empty result (not an error) in
    // PostgREST; only real failures (network, permissions) throw here.
    console.warn('[teams] leave join failed:', e);
    return false;
  }
}

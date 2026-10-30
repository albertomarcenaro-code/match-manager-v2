import { useActiveTeamId as _useActiveTeamId } from '@/lib/teams';

/**
 * Convenience re-export of the shared-team resolution hook.
 *
 * When a user joins a team via its team_code, this returns the joined team_id
 * so tournament/cronaca reads & writes target the shared team rather than the
 * owning account only. Null means the user has no joined team (own-team mode).
 */
export function useActiveTeamId() {
  return _useActiveTeamId();
}
